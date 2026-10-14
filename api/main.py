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
import os
import glob
import re
from datetime import datetime
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from utils.logging_config import setup_logger, global_metrics
from hcm.hcm_manager import hcm_manager

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
    assigned_engineer: Optional[Dict[str, Any]] = None
    context_bundle: Optional[Dict[str, Any]] = None
    wellbeing_alert: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    message: str

class MatrixToggleRequest(BaseModel):
    operative_id: str
    project_id: str

class MatchRequest(BaseModel):
    skills: List[str] = []
    incident_summary: Optional[str] = None
    service: Optional[str] = None

class HrReviewRequest(BaseModel):
    employee_id: str
    project_id: Optional[str] = None

class ForgeMissionRequest(BaseModel):
    title: str
    department: Optional[str] = "Engineering Operations"
    difficulty: Optional[str] = "Tier III - Advanced"
    budget: Optional[str] = "$250,000"
    deadline: Optional[str] = "2027-03-31"
    required_skills: List[str] = []
    required_slots: Optional[int] = 3

class ScoutRequest(BaseModel):
    query: Optional[str] = ""
    skills: Optional[List[str]] = []

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AddEmployeeRequest(BaseModel):
    name: str
    role: str
    department: Optional[str] = "Engineering"
    email: Optional[str] = None
    skills: List[str] = []
    allocatedCapacity: Optional[int] = 40
    avatar: Optional[str] = None
    assignedProjects: Optional[List[str]] = []


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
            errors=final_state.get("errors", []),
            assigned_engineer=final_state.get("assigned_engineer"),
            context_bundle=final_state.get("context_bundle"),
            wellbeing_alert=final_state.get("wellbeing_alert")
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
                "description": "Formulates final mitigation strategies, performs skill-aware engineer matching, and constructs contextual telemetry bundles.",
                "model": settings.DEFAULT_MODEL,
                "status": "Online",
                "capabilities": ["Resolution strategy", "Smart HCM assignment", "Ticket creation", "Contextual handoff", "Wellbeing safeguards"]
            },
            {
                "id": "workload_agent",
                "name": "Workload & Headroom Agent",
                "role": "Capacity Enforcement",
                "description": "Monitors team utilization, enforces the strict < 100% capacity headroom threshold, and disqualifies overloaded personnel to prevent burnout.",
                "model": "Deterministic + LLM Evaluation",
                "status": "Online",
                "capabilities": ["Capacity tracking", "Overload disqualification", "Headroom optimization"]
            },
            {
                "id": "project_fit_agent",
                "name": "Project Fit & Skill Agent",
                "role": "Talent Matching",
                "description": "Computes high-dimensional skill match percentages against incident domains and enterprise mission requirements.",
                "model": "Deterministic + LLM Evaluation",
                "status": "Online",
                "capabilities": ["Skill profile indexing", "Incident domain mapping", "Fit score calculation"]
            },
            {
                "id": "performance_agent",
                "name": "Performance & Reliability Agent",
                "role": "Operations Assessment",
                "description": "Analyzes historical incident resolution velocity, code quality scores, and past execution reliability metrics.",
                "model": "Deterministic + LLM Evaluation",
                "status": "Online",
                "capabilities": ["Velocity tracking", "Quality assessment", "Operational scoring"]
            },
            {
                "id": "availability_agent",
                "name": "Real-Time Availability Agent",
                "role": "Scheduling & Bandwidth",
                "description": "Assesses active incident commitments and project deadlines to determine immediate responder availability.",
                "model": "Deterministic + LLM Evaluation",
                "status": "Online",
                "capabilities": ["Bandwidth reservation", "Shift monitoring", "Conflict detection"]
            },
            {
                "id": "employee_wellbeing_agent",
                "name": "Wellbeing Safeguard Agent",
                "role": "Safety & Burnout Prevention",
                "description": "Monitors stress indices, detects rapid responsibility spikes, and flags early warning alerts for human management review.",
                "model": "Deterministic + LLM Evaluation",
                "status": "Online",
                "capabilities": ["Stress index monitoring", "Burnout alarm", "Capacity limits", "HR intervention triggers"]
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


# ─── Incident Tickets Endpoints ──────────────────────────────────────────────

@app.get("/tickets", tags=["Tickets"])
async def list_tickets():
    """
    List all incident tickets generated by the system, escalated unmonitored tickets,
    and historical enterprise tickets.
    """
    tickets = []
    seen = set()

    # 1. Check generated Markdown escalation tickets in tickets/ directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    tickets_dir = os.path.join(base_dir, "tickets")
    if os.path.exists(tickets_dir):
        for f in sorted(glob.glob(os.path.join(tickets_dir, "*.md")), reverse=True):
            ticket_id = os.path.basename(f).replace(".md", "")
            try:
                with open(f, "r", encoding="utf-8") as tf:
                    content = tf.read()
                
                req_match = re.search(r"\*\*Original User Request:\*\*\s*(.*)", content)
                user_req = req_match.group(1).strip() if req_match else "Unmonitored Service Ticket"
                
                mtime = os.path.getmtime(f)
                ts_str = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")

                tickets.append({
                    "ticket_id": ticket_id,
                    "title": user_req,
                    "status": "Escalated",
                    "severity": "High",
                    "type": "Unmonitored System",
                    "timestamp": ts_str,
                    "source": "Escalation File",
                    "content": content
                })
                seen.add(ticket_id)
            except Exception as e:
                logger.error(f"Error reading ticket {f}: {e}")

    # 2. Add historical ITSM tickets from enterprise_mock.db
    try:
        conn = sqlite3.connect("enterprise_mock.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT incident_id, service, description, resolution FROM historical_incidents")
        for row in cur.fetchall():
            tid = row["incident_id"]
            if tid not in seen:
                tickets.append({
                    "ticket_id": tid,
                    "title": f"{row['service']}: {row['description']}",
                    "status": "Resolved",
                    "severity": "Medium",
                    "type": "ITSM Record",
                    "timestamp": "Historical",
                    "source": "Enterprise DB",
                    "content": f"**Service:** {row['service']}\n\n**Description:** {row['description']}\n\n**Resolution:** {row['resolution']}"
                })
                seen.add(tid)
        conn.close()
    except Exception as e:
        logger.error(f"Error fetching enterprise tickets: {e}")

    # 3. Discover incident tickets referenced in workflow memory
    try:
        conn = sqlite3.connect("agentsync_memory.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT id, user_request, decision, timestamp FROM workflow_history ORDER BY id DESC")
        for row in cur.fetchall():
            dec = row["decision"] or ""
            matches = re.findall(r"(INC-[A-Za-z0-9]+)", dec)
            for m in matches:
                if m not in seen and m.upper() not in ["INC-XXXX", "INC-YYYY"]:
                    status = "Open"
                    if "outside of our monitored systems" in dec:
                        status = "Escalated"
                    elif "resolved" in dec.lower() or "mitigation" in dec.lower():
                        status = "In Progress"

                    tickets.append({
                        "ticket_id": m,
                        "title": row["user_request"],
                        "status": status,
                        "severity": "High" if "critical" in dec.lower() or "P1" in dec else "Medium",
                        "type": "AI Investigation",
                        "timestamp": row["timestamp"],
                        "source": "Workflow Memory",
                        "content": f"**Incident Request:** {row['user_request']}\n\n**Agent Recommendation & Decision:**\n{dec}"
                    })
                    seen.add(m)
        conn.close()
    except Exception as e:
        logger.error(f"Error reading workflow tickets: {e}")

    return {"total": len(tickets), "tickets": tickets}


@app.get("/tickets/{ticket_id}", tags=["Tickets"])
async def get_ticket_detail(ticket_id: str):
    """Get full details of a specific ticket."""
    resp = await list_tickets()
    for t in resp.get("tickets", []):
        if t["ticket_id"].lower() == ticket_id.lower():
            return t
    raise HTTPException(status_code=404, detail="Ticket not found")


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
            },
            {
                "id": "query_resource_matrix",
                "name": "Resource Allocation Matrix",
                "description": "Queries real-time Human Capital Management (HCM) capacity, skill matching, and workload headroom to prevent burnout.",
                "category": "Decision Support",
                "data_source": "HCM Matrix & Operative Profiles",
                "parameters": ["action", "query"]
            }
        ]
    }


# ─── HCM & Resource Matrix Endpoints ─────────────────────────────────────────

@app.get("/hcm/state", tags=["HCM"])
async def get_hcm_state():
    """Returns the full HCM state: operatives, projects, telemetry logs, and dual-stack status."""
    sync_status = hcm_manager.sync_with_node_hcm()
    return {
        "operatives": hcm_manager.get_operatives(),
        "projects": hcm_manager.get_projects(),
        "telemetry_logs": hcm_manager.get_telemetry_logs(),
        "sync_status": sync_status
    }


@app.get("/hcm/operatives", tags=["HCM"])
async def get_hcm_operatives():
    """List all registered operatives with live capacity, stress index, and skills."""
    return {"total": len(hcm_manager.get_operatives()), "operatives": hcm_manager.get_operatives()}


@app.get("/hcm/projects", tags=["HCM"])
async def get_hcm_projects():
    """List all enterprise missions and projects."""
    return {"total": len(hcm_manager.get_projects()), "projects": hcm_manager.get_projects()}


@app.post("/hcm/matrix/toggle", tags=["HCM"])
async def toggle_matrix_allocation(req: MatrixToggleRequest):
    """Toggle an operative's allocation to a mission, dynamically recalculating load and stress."""
    res = hcm_manager.toggle_allocation(req.operative_id, req.project_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to update allocation."))
    return res


@app.post("/hcm/match", tags=["HCM"])
async def match_engineer_endpoint(req: MatchRequest):
    """Skill-aware matching with strict < 100% capacity headroom enforcement."""
    incident_details = {
        "summary": req.incident_summary or "Active Production Outage",
        "service": req.service or "Enterprise Service"
    }
    return hcm_manager.match_engineer(req.skills, incident_details)


@app.post("/hcm/hr-review", tags=["HCM"])
async def run_hr_review_endpoint(req: HrReviewRequest):
    """Executes the 5-agent HR assessment on an operative with optional mission fit."""
    res = hcm_manager.run_hr_review(req.employee_id, req.project_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@app.post("/hcm/projects/forge", tags=["HCM"])
async def forge_project_endpoint(req: ForgeMissionRequest):
    """Creates a new mission / project in the enterprise matrix."""
    return hcm_manager.forge_project(
        title=req.title,
        department=req.department or "Operations",
        difficulty=req.difficulty or "Tier III - Advanced",
        budget=req.budget or "$250,000",
        deadline=req.deadline or "2027-03-31",
        required_skills=req.required_skills,
        required_slots=req.required_slots or 3
    )


@app.post("/hcm/scout", tags=["HCM"])
async def scout_talent_endpoint(req: ScoutRequest):
    """Talent Scout AI: Searches and ranks operatives based on query keywords or skills, enforcing <100% capacity."""
    return hcm_manager.scout_talent(req.query or "", req.skills)


@app.get("/hcm/status", tags=["HCM"])
async def get_hcm_status():
    """Returns dual-stack status with Node.js service / in-process fallback."""
    return hcm_manager.sync_with_node_hcm()


# ─── HR Security & Employee Management Endpoints ──────────────────────────────

@app.post("/auth/admin-login", tags=["Auth"])
async def admin_login(req: AdminLoginRequest):
    """Authenticate HR Administrator credentials for personnel management."""
    valid_passwords = ["admin123", "adminpassword", "agentsync2026"]
    if req.username.strip().lower() == "admin" and req.password in valid_passwords:
        return {
            "authenticated": True,
            "username": "admin",
            "role": "HR Administrator",
            "token": "admin-session-auth-token-valid",
            "message": "Authentication successful. Personnel management unlocked."
        }
    raise HTTPException(status_code=401, detail="Invalid username or password. Default administrator credentials: admin / admin123")


@app.post("/hcm/employees", tags=["HCM"])
async def add_employee_endpoint(req: AddEmployeeRequest):
    """Adds a new team member to the organizational roster."""
    res = hcm_manager.add_employee(req.model_dump())
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to add team member."))
    return res


@app.delete("/hcm/employees/{employee_id}", tags=["HCM"])
async def delete_employee_endpoint(employee_id: str):
    """Removes a team member from the organization roster."""
    res = hcm_manager.delete_employee(employee_id)
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error", "Team member not found."))
    return res


@app.post("/hcm/operatives", tags=["HCM"])
async def add_operative_alias(req: AddEmployeeRequest):
    """Alias for /hcm/employees."""
    return await add_employee_endpoint(req)


@app.delete("/hcm/operatives/{operative_id}", tags=["HCM"])
async def delete_operative_alias(operative_id: str):
    """Alias for /hcm/employees/{id}."""
    return await delete_employee_endpoint(operative_id)


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

    # HCM Metrics
    operatives = hcm_manager.get_operatives()
    overloaded_ops = sum(1 for o in operatives if o.get("allocatedCapacity", 0) >= 100)
    elevated_stress = sum(1 for o in operatives if o.get("stressIndex", 0) >= 70)
    avg_capacity = round(sum(o.get("allocatedCapacity", 0) for o in operatives) / max(1, len(operatives)), 1)
    avg_headroom = round(max(0, 100 - avg_capacity), 1)

    return {
        "platform": {
            "name": "AgentSync",
            "version": "1.0.0",
            "uptime": uptime_str,
            "uptime_seconds": uptime_seconds,
            "status": "Operational"
        },
        "agents": {
            "total": 9,
            "online": 9,
            "workflow_agents": 4,
            "hcm_agents": 5,
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
            "total": 7,
            "categories": ["Observability", "Knowledge", "Action", "Decision Support"]
        },
        "hcm": {
            "total_operatives": len(operatives),
            "overloaded_count": overloaded_ops,
            "elevated_stress_count": elevated_stress,
            "average_capacity_pct": avg_capacity,
            "average_headroom_pct": avg_headroom,
            "active_missions": len(hcm_manager.get_projects()),
            "telemetry_entries": len(hcm_manager.get_telemetry_logs())
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

    llm_ok = bool(settings.GROQ_API_KEY)
    hcm_sync = hcm_manager.sync_with_node_hcm()

    return {
        "status": "healthy" if (db_ok and llm_ok) else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "api": "ok",
            "database": "ok" if db_ok else "error",
            "llm_provider": "ok" if llm_ok else "not_configured",
            "agents": "online",
            "hcm_matrix": "online",
            "dual_stack_mode": hcm_sync.get("mode", "in_process_fallback")
        }
    }
