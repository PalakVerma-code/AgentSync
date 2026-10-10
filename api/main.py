from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
from workflow.agent_workflow import run_agent_workflow
from config.settings import settings
import uuid
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    try:
        settings.validate()
    except ValueError as e:
        print(f"Startup Warning: {e}")
    yield  # Application runs here

app = FastAPI(
    title="AgentSync Enterprise API",
    description="API layer for AgentSync Coordination & Decision Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware to allow the frontend to communicate with the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# Mock in-memory state store for status endpoints
workflow_jobs: Dict[str, Any] = {}

class WorkflowRequest(BaseModel):
    request_text: str

class WorkflowResponse(BaseModel):
    job_id: str
    status: str
    plan: str = ""
    investigation_results: str = ""
    analysis: str = ""
    decision: str = ""
    execution_metrics: Dict[str, Any] = {}
    errors: List[str] = []

@app.post("/workflow/run", response_model=WorkflowResponse)
async def run_workflow(req: WorkflowRequest):
    if not req.request_text or not req.request_text.strip():
        raise HTTPException(status_code=400, detail="request_text is required and cannot be blank.")
        
    job_id = str(uuid.uuid4())
    workflow_jobs[job_id] = {"status": "Running"}
    
    try:
        final_state = run_agent_workflow(req.request_text)
        
        response = WorkflowResponse(
            job_id=job_id,
            status=final_state.get("workflow_status", "Completed"),
            plan=final_state.get("plan", ""),
            investigation_results=final_state.get("investigation_results", ""),
            analysis=final_state.get("analysis", ""),
            decision=final_state.get("decision", ""),
            execution_metrics=final_state.get("execution_metadata", {}),
            errors=final_state.get("errors", [])
        )
        
        workflow_jobs[job_id] = response.dict()
        return response
        
    except Exception as e:
        error_msg = f"Workflow failed: {str(e)}"
        workflow_jobs[job_id] = {"status": "Error", "errors": [error_msg]}
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/workflow/status/{job_id}")
async def get_workflow_status(job_id: str):
    job = workflow_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/agents")
async def list_agents():
    return {
        "agents": [
            {"id": "planner", "name": "Planner Agent", "description": "Breaks down incident requests into a structured execution plan, determining the order of operations.", "status": "Online"},
            {"id": "investigation", "name": "Investigation Agent", "description": "Gathers evidence using enterprise tools, querying logs and metrics.", "status": "Online"},
            {"id": "analysis", "name": "Analysis Agent", "description": "Performs root cause analysis and identifies risks from the gathered data.", "status": "Online"},
            {"id": "decision", "name": "Decision Agent", "description": "Formulates final recommendations and generates resolution steps.", "status": "Online"}
        ]
    }

@app.get("/incidents/history")
async def get_history():
    try:
        import sqlite3
        conn = sqlite3.connect("agentsync_memory.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, user_request, timestamp, decision FROM workflow_history ORDER BY timestamp DESC LIMIT 20")
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"history": results}
    except Exception as e:
        return {"history": [], "error": str(e)}

class ChatMessage(BaseModel):
    message: str

@app.post("/workflow/chat/{job_id}")
async def chat_followup(job_id: str, chat: ChatMessage):
    job = workflow_jobs.get(job_id)
    
    if job:
        context_str = f"Plan:\n{job.get('plan')}\n\nDecision:\n{job.get('decision')}"
    else:
        context_str = "No prior context available for this job."
        
    try:
        llm = ChatGroq(api_key=settings.GROQ_API_KEY, model=settings.DEFAULT_MODEL)
        system_msg = SystemMessage(
            content=f"""You are the Resolution Copilot for AgentSync. Your role is strictly to help the user follow up on their specific IT incident ticket.

Original Incident Context:
{context_str}

CRITICAL INSTRUCTION:
You MUST ONLY answer questions that are DIRECTLY related to the "Original Incident Context" above.
If the user asks about ANY system, issue, or topic that is NOT part of the original incident (for example, if the incident is about the 'payment api' and they ask about a 'login page', or vice versa), you MUST reject the request.

If the request is unrelated, you MUST reply EXACTLY with this string and nothing else:
"This is not a follow-up to the current incident. Please ask this independently as a new request."

Under no circumstances should you provide troubleshooting steps or information for an unrelated issue."""
        )
        human_msg = HumanMessage(content=chat.message)
        
        response = llm.invoke([system_msg, human_msg])
        return {"reply": response.content}
    except Exception as e:
        return {"reply": f"**Error connecting to LLM**: {str(e)}"}
