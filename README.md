# AgentSync: AI Agent Coordination & Decision Engine

AgentSync is an enterprise-grade AI agent orchestration platform that seamlessly bridges autonomous IT incident resolution with Human Capital Management (HCM) resource allocation. By uniting a Python/FastAPI + LangGraph incident engine with a real-time Resource Allocation Matrix and evidence-based HR decision agents, the platform automates end-to-end triage, evidence gathering, root cause analysis, capacity-headroom-aware engineer assignment, and telemetry-bundled ticketing.

---

## 📋 Key Capabilities

- **Dual-Stack Integration & Zero-Downtime Fallback**: Bridges Python/FastAPI/LangGraph with Node.js/Express HCM services, with an automatic in-process fallback engine ensuring zero operational downtime if auxiliary services disconnect.
- **Autonomous Outage Triage**: LangGraph agents continuously ingest diagnostic logs, service health, and runbooks to isolate root causes without manual hunting.
- **Strict Skill-Aware Matching**: Evaluates incident error signatures against operative capability profiles to match qualified engineers.
- **Burnout Prevention Engine**: Enforces a strict `< 100%` active workload capacity threshold to disqualify overloaded personnel (e.g. Dr. Elena Rostova @ 115%) from incident paging.
- **Talent Scout AI & Squad Assembly**: Natural language skill matching and candidate ranking engine with automated headroom and burnout disqualification checks.
- **Contextual Handoff & Telemetry Bundles**: Pre-packages root cause analyses, stack traces, and mitigation runbooks directly into incident tickets and engineer assignment payloads.
- **Wellbeing Safeguard & Stress Monitoring**: Features a 5-agent HR review engine (Workload, Project Fit, Performance, Availability, and Wellbeing Check-in) that flags workload spikes for proactive managerial review.
- **Unified Single-Interface Web Console**: A dark-mode, industry-grade React 19 interface providing real-time telemetry, Talent Scout AI squad assembly, interactive project allocation toggles, an HR review hub, an incident resolution runner, and ticket management.

---

## ⚙️ Architecture & Execution Workflow

```
[ Incoming Outage / Telemetry Alert ]
                 │
                 ▼
          ┌──────────────┐
          │ Planner Agent│ ── Formulates structured investigation checklist
          └──────┬───────┘
                 │
                 ▼
       ┌─────────────────────┐
       │ Investigation Agent │ ── Calls 7 enterprise tools (Logs, Health, DB, APIs)
       └──────┬──────────────┘
              │
              ▼
       ┌────────────────┐
       │ Analysis Agent │ ── Isolates root cause & risk classification (P1/P2/P3)
       └──────┬─────────┘
              │
              ▼
       ┌─────────────────┐
       │ Risk Evaluation │ ── Routes: High Risk -> Immediate | Med -> Re-investigate
       └──────┬──────────┘
              │
              ▼
       ┌────────────────┐
       │ Decision Agent │ ── Synthesizes resolution SOP & triggers HCM Matcher
       └──────┬─────────┘
              │
              ▼
   ┌───────────────────────┐
   │ Resource Matrix Match │ ── Evaluates skills + enforces strict <100% capacity
   └──────┬───────────────┘
          │
    ┌─────┴─────────────────────────┐
    ▼                               ▼
[ Optimal Engineer Assigned ]  [ Overloaded Personnel Disqualified ]
(e.g., Tariq Mansoor @ 75%)    (e.g., Dr. Elena Rostova @ 115% Lockout)
    │
    ▼
[ Pre-Packaged Context Bundle ] ── Root cause + SOP + Logs attached to Ticket
```

---

## 🤖 The 9-Agent Fleet

The coordination engine deploys 9 discrete agents across two integrated tiers:

### 1. Incident Resolution & Orchestration Tier (LangGraph)
| Agent | Role | Capabilities |
| :--- | :--- | :--- |
| **Planner Agent** | Strategy | Incident decomposition, execution planning, tool sequencing. |
| **Investigation Agent** | Research / ReAct | Multi-tool invocation, log parsing, service probing, runbook search. |
| **Analysis Agent** | Diagnostics | Root cause identification, risk assessment, business impact scoring. |
| **Decision Agent** | Action / Dispatch | Mitigation formulation, ticket creation, contextual telemetry bundling. |

### 2. Human Capital Management (HCM) Decision Engine Tier
| Agent | Role | Capabilities |
| :--- | :--- | :--- |
| **Workload Agent** | Capacity Enforcement | Tracks allocation %, enforces `< 100%` headroom threshold, prevents alert fatigue. |
| **Project Fit Agent** | Talent Matching | Vector skill-profile indexing, incident domain mapping, fit score calculation. |
| **Performance Agent** | Operational Metrics | Analyzes historical incident resolution velocity, code quality, and delivery track records. |
| **Availability Agent** | Scheduling | Assesses active commitments, deadlines, and on-call bandwidth reservations. |
| **Employee Wellbeing Agent**| Safety & Burnout | Monitors stress indices, detects rapid load spikes, triggers early HR interventions. |

---

## 🛠️ Enterprise Tool Ecosystem (7 Tools)

1. **`service_health_tool`**: Inspects real-time service health, latency, CPU, and error metrics from `enterprise_mock.db`.
2. **`log_analyzer_tool`**: Parses application logs to detect stack traces, timeout patterns, and error anomalies.
3. **`incident_history_tool`**: Retrieves past service outages to cross-reference known failure modes and historical fixes.
4. **`knowledge_base_tool`**: Queries standard operating procedures (SOPs) and runbooks for remediation steps.
5. **`external_api_tool`**: Validates upstream and third-party service reachability via live HTTP GET probes.
6. **`incident_action_tool`**: Programmatically creates, escalates, and resolves tickets in the ITSM system.
7. **`resource_matrix_tool` (`query_resource_matrix`)**: Queries real-time HCM capacity, skill matches, and workload headroom for smart engineer assignment.

---

## 💻 Technology Stack

- **Backend Framework**: Python 3.10+, FastAPI, Uvicorn
- **Agent Orchestration**: LangGraph, LangChain Core
- **LLM Reasoning**: Groq API (`openai/gpt-oss-20b` high-speed inference)
- **Frontend Console**: React 19, Vite, Lucide Icons, ReactMarkdown, CSS Design System
- **Dual-Stack Integration**: Node.js/Express HCM REST microservice + In-Process Python Fallback
- **Persistence**: SQLite3 (`agentsync_memory.db` for memory, `enterprise_mock.db` for simulated telemetry)
- **Testing**: Pytest (38 unit & integration tests)

---

## 📁 Repository Structure

```
AgentSync/
├── agents/                     # LangGraph incident agents
│   ├── planner_agent.py
│   ├── investigation_agent.py
│   ├── analysis_agent.py
│   └── decision_agent.py
├── api/                        # FastAPI REST application & HCM endpoints
│   └── main.py
├── config/                     # Environment configuration and settings
│   └── settings.py
├── frontend/                   # React 19 + Vite unified operations console
│   ├── src/
│   │   ├── App.jsx             # Unified dashboard, incident runner, matrix, tickets
│   │   ├── App.css             # Glassmorphic cyber-enterprise design system
│   │   └── main.jsx
│   ├── package.json
│   ├── vercel.json             # Vercel SPA routing configuration
│   └── vite.config.js
├── hcm/                        # Decision Engine HCM subsystem
│   ├── hcm_manager.py          # Operative roster, matrix toggles, headroom lock
│   └── hr_agents.py            # 5 evidence-based situational review agents
├── memory/                     # Long-term memory management
│   └── memory_manager.py
├── tests/                      # Automated test suite (38 passing tests)
│   ├── test_agents.py
│   ├── test_api.py
│   ├── test_hcm.py
│   └── test_tools.py
├── tickets/                    # Auto-generated incident tickets with context bundles
├── tools/                      # Enterprise simulation and diagnosis tools
│   ├── external_api_tool.py
│   ├── incident_action_tool.py
│   ├── incident_history_tool.py
│   ├── knowledge_base_tool.py
│   ├── log_analyzer_tool.py
│   ├── resource_matrix_tool.py
│   └── service_health_tool.py
├── utils/                      # Structured logging and telemetry utilities
│   └── logging_config.py
├── workflow/                   # LangGraph state machine definition
│   ├── agent_workflow.py
│   └── state.py
├── requirements.txt            # Python dependencies
├── setup_db.py                 # Database initialization and seeder
└── Whole_project_scope.md      # Comprehensive technical architecture document
```

---

## 🚀 Local Setup & Quick Start

### 1. Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm
- A Groq API key ([console.groq.com](https://console.groq.com))

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
GROQ_API_KEY=your_groq_api_key_here
DEFAULT_MODEL=openai/gpt-oss-20b
```

### 3. Backend Setup
```bash
# Set up virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed databases (if not already initialized)
python setup_db.py

# Start the FastAPI server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API Documentation is available at `http://localhost:8000/docs`.

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The unified web console will be accessible at `http://localhost:5173`.

---

## 🧪 Verification & Testing

Execute the comprehensive test suite covering all agents, tools, API contracts, HCM headroom enforcement, and ticket workflows:
```bash
pytest tests/ -v
```
All **38 unit and integration tests** pass verified.

---

## 🌐 Production Deployment

- **Frontend**: Deployed on **Vercel** (`https://agent-sync.vercel.app`) using SPA rewrites configured in `frontend/vercel.json`.
- **Backend**: Deployed on **Render** as a persistent web service executing `uvicorn api.main:app --host 0.0.0.0 --port $PORT`.
- **Environment Link**: Set `VITE_API_URL` in the frontend hosting environment to target the live backend instance URL.
