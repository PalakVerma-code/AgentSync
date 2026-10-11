from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from workflow.agent_workflow import run_agent_workflow
from config.settings import settings
import uuid
import time
import sqlite3
from datetime import datetime
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from utils.logging_config import setup_logger, global_metrics

logger = setup_logger("api")

# ─── In-memory stores ────────────────────────────────────────────────────────
workflow_jobs: Dict[str, Any] = {}
api_start_time: float = time.time()
total_requests: int = 0
total_errors: int = 0

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    try:
        settings.validate()
        logger.info("AgentSync API started successfully.")
    except ValueError as e:
        logger.warning(f"Startup Warning: {e}")
    yield


app = FastAPI(
    title="AgentSync Enterprise API",
    description="REST API layer for the AgentSync AI Agent Coordination & Decision Engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic Models ─────────────────────────────────────────────────────────

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

class ChatMessage(BaseModel):
    message: str


# ─── Workflow Endpoints ───────────────────────────────────────────────────────

@app.post("/workflow/run", response_model=WorkflowResponse, tags=["Workflow"])
async def run_workflow(req: WorkflowRequest):
    """Execute the multi-agent workflow for a given incident request."""
    global total_requests, total_errors

    if not req.request_text or not req.request_text.strip():
        raise HTTPException(status_code=400, detail="request_text is required and cannot be blank.")

    total_requests += 1
    job_id = str(uuid.uuid4())
    workflow_jobs[job_id] = {"status": "Running", "started_at": datetime.utcnow().isoformat()}

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

        workflow_jobs[job_id] = {
            **response.model_dump(),
            "completed_at": datetime.utcnow().isoformat()
        }
        return response

    except Exception as e:
        total_errors += 1
        error_msg = f"Workflow failed: {str(e)}"
        workflow_jobs[job_id] = {
            "status": "Error",
            "errors": [error_msg],
            "completed_at": datetime.utcnow().isoformat()
        }
        raise HTTPException(status_code=500, detail=error_msg)


@app.get("/workflow/status/{job_id}", tags=["Workflow"])
async def get_workflow_status(job_id: str):
    """Get the status of a previously submitted workflow job."""
    job = workflow_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/workflow/jobs", tags=["Workflow"])
async def list_jobs():
    """List all workflow jobs in this session (most recent 50)."""
    jobs_list = [
        {"job_id": jid, **{k: v for k, v in data.items() if k != "plan" and k != "investigation_results"}}
        for jid, data in list(workflow_jobs.items())[-50:]
    ]
    return {"total": len(workflow_jobs), "jobs": jobs_list}


@app.post("/workflow/chat/{job_id}", tags=["Workflow"])
async def chat_followup(job_id: str, chat: ChatMessage):
    """Follow-up chat endpoint scoped to a specific workflow job's context."""
    global total_requests
    total_requests += 1

    job = workflow_jobs.get(job_id)

    if job:
        context_str = f"Plan:\n{job.get('plan', '')}\n\nDecision:\n{job.get('decision', '')}"
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


# ─── Agent Endpoints ──────────────────────────────────────────────────────────

@app.get("/agents", tags=["Agents"])
async def list_agents():
    """List all registered AI agents in the coordination engine."""
    return {
        "agents": [
            {
                "id": "planner",
                "name": "Planner Agent",
                "role": "Orchestration",
                "description": "Breaks down incident requests into a structured execution plan, determining the order of operations and required tools.",
                "model": settings.DEFAULT_MODEL,
                "status": "Online",
                "capabilities": ["Plan generation", "Memory retrieval", "Workflow design"]
            },
            {
                "id": "investigation",
                "name": "Investigation Agent",
                "role": "Research",
                "description": "Gathers evidence using enterprise tools — querying logs, checking service health, retrieving incident history and runbooks.",
                "model": settings.DEFAULT_MODEL,
                "status": "Online",
                "capabilities": ["Log analysis", "Health checks", "Incident search", "Runbook retrieval", "External API probing"]
            },
            {
                "id": "analysis",
                "name": "Analysis Agent",
                "role": "Analytics",
                "description": "Performs root cause analysis and identifies risks, severity and business impact from the gathered investigation data.",
                "model": settings.DEFAULT_MODEL,
                "status": "Online",
                "capabilities": ["Root cause analysis", "Risk assessment", "Impact scoring", "Pattern recognition"]
            },
            {
                "id": "decision",
                "name": "Decision Agent",
                "role": "Decision Support",
                "description": "Formulates final mitigation strategies and resolution steps based on analysis. Escalates unmonitored services automatically.",
                "model": settings.DEFAULT_MODEL,
                "status": "Online",
                "capabilities": ["Resolution strategy", "Ticket creation", "Escalation logic", "Recommendation generation"]
            }
        ]
    }


# ─── Incident History Endpoints ───────────────────────────────────────────────

@app.get("/incidents/history", tags=["Incidents"])
async def get_history(limit: int = 20, offset: int = 0):
    """Retrieve historical incident workflow records from the long-term memory database."""
    try:
        conn = sqlite3.connect("agentsync_memory.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_request, timestamp, decision FROM workflow_history ORDER BY timestamp DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
        results = [dict(row) for row in cursor.fetchall()]

        cursor.execute("SELECT COUNT(*) FROM workflow_history")
        total = cursor.fetchone()[0]
        conn.close()
        return {"history": results, "total": total, "limit": limit, "offset": offset}
    except Exception as e:
        return {"history": [], "total": 0, "error": str(e)}


@app.get("/incidents/history/{record_id}", tags=["Incidents"])
async def get_history_detail(record_id: int):
    """Get the full details of a single historical incident workflow."""
    try:
        conn = sqlite3.connect("agentsync_memory.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_request, plan, research_results, analysis, decision, timestamp FROM workflow_history WHERE id = ?",
            (record_id,)
        )
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Record not found")
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Tools Endpoint ───────────────────────────────────────────────────────────

@app.get("/tools", tags=["Tools"])
async def list_tools():
    """List all available enterprise tools registered with the Investigation Agent."""
    return {
        "tools": [
            {
                "id": "analyze_logs",
                "name": "Log Analyzer",
                "description": "Analyzes service logs for errors or anomalies within a given time range.",
                "category": "Observability",
                "data_source": "enterprise_mock.db / service_logs",
                "parameters": ["service", "time_range"]
            },
            {
                "id": "check_health",
                "name": "Service Health Check",
                "description": "Checks the current health status, latency, and error rate of a monitored service.",
                "category": "Observability",
                "data_source": "enterprise_mock.db / service_health",
                "parameters": ["service"]
            },
            {
                "id": "search_incident_history",
                "name": "Incident History Search",
                "description": "Searches historical incidents for similar issues and their past resolutions.",
                "category": "Knowledge",
                "data_source": "enterprise_mock.db / historical_incidents",
                "parameters": ["query"]
            },
            {
                "id": "search_runbooks",
                "name": "Knowledge Base / Runbooks",
                "description": "Retrieves troubleshooting runbooks and step-by-step procedures from the knowledge base.",
                "category": "Knowledge",
                "data_source": "enterprise_mock.db / service_runbooks",
                "parameters": ["query"]
            },
            {
                "id": "manage_incident",
                "name": "ITSM Incident Manager",
                "description": "Creates, escalates, or resolves incident tickets in the ITSM system (simulates ServiceNow/Jira).",
                "category": "Action",
                "data_source": "ITSM System (Mock)",
                "parameters": ["action", "details"]
            },
            {
                "id": "check_external_service_status",
                "name": "External Service Probe",
                "description": "Makes a live HTTP GET request to check if an external dependency or third-party service is reachable.",
                "category": "Action",
                "data_source": "Internet / External APIs",
                "parameters": ["service_url"]
            }
        ]
    }


# ─── Metrics & Monitoring Endpoints ───────────────────────────────────────────

@app.get("/metrics", tags=["Monitoring"])
async def get_metrics():
    """Return platform-level health and performance metrics."""
    uptime_seconds = round(time.time() - api_start_time)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    uptime_str = f"{hours:02d}h {minutes:02d}m {seconds:02d}s"

    try:
        conn = sqlite3.connect("agentsync_memory.db")
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM workflow_history")
        total_workflows = cursor.fetchone()[0]
        cursor.execute(
            "SELECT COUNT(*) FROM workflow_history WHERE timestamp >= datetime('now', '-24 hours')"
        )
        workflows_today = cursor.fetchone()[0]
        conn.close()
    except Exception:
        total_workflows = 0
        workflows_today = 0

    active_jobs = sum(1 for j in workflow_jobs.values() if j.get("status") == "Running")
    error_jobs = sum(1 for j in workflow_jobs.values() if j.get("status") == "Error")
    completed_jobs = sum(1 for j in workflow_jobs.values() if j.get("status") not in ("Running", "Error"))

    # Compute average duration of completed jobs in this session
    durations = [
        j.get("execution_metrics", {}).get("duration_seconds", 0)
        for j in workflow_jobs.values()
        if isinstance(j.get("execution_metrics"), dict)
    ]
    avg_duration = round(sum(durations) / len(durations), 2) if durations else 0

    return {
        "platform": {
            "name": "AgentSync",
            "version": "1.0.0",
            "uptime": uptime_str,
            "uptime_seconds": uptime_seconds,
            "status": "Operational"
        },
        "agents": {
            "total": 4,
            "online": 4,
            "model": settings.DEFAULT_MODEL
        },
        "workflows": {
            "total_all_time": total_workflows,
            "workflows_last_24h": workflows_today,
            "session_total": len(workflow_jobs),
            "session_active": active_jobs,
            "session_completed": completed_jobs,
            "session_errors": error_jobs,
            "avg_duration_seconds": avg_duration
        },
        "tools": {
            "total": 6,
            "categories": ["Observability", "Knowledge", "Action"]
        },
        "api": {
            "total_requests_session": total_requests,
            "total_errors_session": total_errors
        }
    }


@app.get("/health", tags=["Monitoring"])
async def health_check():
    """Simple health check endpoint for load balancers and uptime monitors."""
    db_ok = True
    try:
        conn = sqlite3.connect("agentsync_memory.db")
        conn.execute("SELECT 1")
        conn.close()
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "api": "ok",
            "database": "ok" if db_ok else "error",
            "llm_provider": "groq",
            "agents": "online"
        }
    }
