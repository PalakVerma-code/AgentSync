# AgentSync: AI Agent Coordination & Decision Engine

AgentSync is an enterprise-grade AI agent orchestration platform designed to automate complex multi-step business workflows and IT incident resolution. By coordinating specialized autonomous agents across a structured state graph, the engine streamlines triage, evidence gathering, root cause analysis, mitigation planning, and incident ticket lifecycle management.

---

## Key Capabilities

- **State-Graph Orchestration**: Built on LangGraph, coordinating agents through deterministic transitions and conditional risk-routing paths.
- **Specialized Agent Fleet**: Discrete agents for Planning, Investigation, Analysis, and Decision support, eliminating single-prompt bottlenecks.
- **Integrated Tool Execution**: Native ReAct tool calling to inspect service health, parse system logs, search runbooks, check external dependencies, and manage tickets.
- **Dual-Layer Memory**:
  - *Short-Term Working Memory*: Graph state passing between pipeline stages.
  - *Long-Term Episodic Memory*: SQLite persistence (`agentsync_memory.db`) for precedent retrieval and decision consistency.
- **Automated Escalation & Ticketing**: Automatically generates tracked incident tickets and escalation records for unmonitored systems.
- **Enterprise Web Dashboard**: Modern React 19 interface providing real-time telemetry, workflow execution, incident history, ticket management, and an interactive resolution copilot.

---

## System Architecture

```
[ User Incident Request ]
           │
           ▼
    ┌──────────────┐
    │ Planner Agent│ ── Formulates step-by-step investigation strategy
    └──────┬───────┘
           │
           ▼
    ┌─────────────────────┐
    │ Investigation Agent │ ── Executes tools dynamically (Logs, Health, DB, APIs)
    └──────┬──────────────┘
           │
           ▼
    ┌────────────────┐
    │ Analysis Agent │ ── Determines root cause, impact, and risk classification
    └──────┬─────────┘
           │
           ▼
    ┌─────────────────┐
    │ Risk Evaluation │ ── Routes: High Risk -> Escalation | Low/Med -> Decision
    └──────┬──────────┘
           │
           ▼
    ┌────────────────┐
    │ Decision Agent │ ── Synthesizes resolution plan & manages ticket actions
    └──────┬─────────┘
           │
     ┌─────┴───────────────┐
     ▼                     ▼
[ Long-Term Memory ]  [ Incident Tickets ]
```

### The Agent Fleet

| Agent | Role | Responsibility |
| :--- | :--- | :--- |
| **Planner Agent** | Strategy | Analyzes the initial report and defines a prioritized investigation checklist. |
| **Investigation Agent** | Research / ReAct | Autonomously calls tools to gather diagnostics, inspect databases, and query knowledge bases. |
| **Analysis Agent** | Diagnostics | Synthesizes technical evidence into root cause assessments and business risk tiers. |
| **Decision Agent** | Action / Resolution | Cross-references historical memory to prescribe mitigation plans and generate tickets. |

---

## Tool Ecosystem

The Investigation and Decision agents leverage tools configured in `tools/`:

1. **`service_health_tool`**: Inspects real-time service health, latency, CPU, and error metrics from `enterprise_mock.db`.
2. **`log_analyzer_tool`**: Parses application logs to detect stack traces, timeout patterns, and error spikes.
3. **`incident_history_tool`**: Retrieves past service outages to cross-reference known failure modes.
4. **`knowledge_base_tool`**: Queries standard operating procedures (SOPs) and runbooks for remediation steps.
5. **`external_api_tool`**: Validates upstream and third-party service reachability via HTTP probes.
6. **`incident_action_tool`**: Programmatically creates, escalates, and resolves tickets in the ITSM system.

---

## Technology Stack

- **Backend Framework**: Python 3.10+, FastAPI, Uvicorn
- **Orchestration**: LangGraph, LangChain Core
- **LLM Provider**: Groq API (`openai/gpt-oss-20b` high-speed reasoning)
- **Frontend Dashboard**: React 19, Vite, Lucide Icons, ReactMarkdown
- **Persistence**: SQLite3 (`agentsync_memory.db` for memory, `enterprise_mock.db` for simulated telemetry)
- **Testing**: Pytest, HTTPX TestClient

---

## Project Structure

```
AgentSync/
├── agents/                     # Specialized agent definitions
│   ├── planner_agent.py
│   ├── investigation_agent.py
│   ├── analysis_agent.py
│   └── decision_agent.py
├── api/                        # FastAPI application endpoints
│   └── main.py
├── config/                     # Environment configuration and settings
│   └── settings.py
├── frontend/                   # React 19 + Vite web console
│   ├── src/
│   │   ├── App.jsx             # Dashboard, workflow runner, tickets, and settings
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vercel.json             # Vercel SPA routing configuration
│   └── vite.config.js
├── memory/                     # Long-term memory management
│   └── memory_manager.py
├── tests/                      # Automated test suite (30 unit & integration tests)
│   ├── test_agents.py
│   ├── test_api.py
│   └── test_tools.py
├── tickets/                    # Auto-generated incident tickets (Markdown artifacts)
├── tools/                      # Enterprise simulation and diagnosis tools
│   ├── external_api_tool.py
│   ├── incident_action_tool.py
│   ├── incident_history_tool.py
│   ├── knowledge_base_tool.py
│   ├── log_analyzer_tool.py
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

## Local Setup & Quick Start

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
API Documentation will be available at `http://localhost:8000/docs`.

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The console will be accessible at `http://localhost:5173`.

---

## Verification & Testing

Execute the comprehensive test suite covering agents, tools, API contracts, and ticket flows:
```bash
pytest tests/ -v
```
All 30 unit and integration tests are verified and passing.

---

## Production Deployment

- **Frontend**: Deployed on **Vercel** (`https://agent-sync.vercel.app`) using SPA rewrites configured in `frontend/vercel.json`.
- **Backend**: Deployed on **Render** as a persistent web service executing `uvicorn api.main:app --host 0.0.0.0 --port $PORT`.
- **Environment Link**: Set `VITE_API_URL` in the frontend hosting environment to target the live backend instance URL.
