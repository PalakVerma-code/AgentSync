# AgentSync: Comprehensive Technical Scope & Architecture Specification

## 1. Executive Summary & Objective

**Platform Name:** AgentSync  
**Domain:** Autonomous AI Multi-Agent Coordination, IT Incident Resolution & Human Capital Management (HCM) Decision Engine  

Modern digital enterprises rely on complex distributed microservices, persistent databases, and third-party APIs. When system anomalies, latency spikes, or service outages emerge, diagnosing and mitigating them requires cross-functional coordination: reviewing diagnostic logs, querying metrics databases, cross-referencing previous post-mortems, evaluating downstream risks, and issuing remediation plans.

Simultaneously, traditional incident response suffers from **blind paging**—notifying engineers solely based on static on-call calendars without visibility into active workloads, skill compatibility, or cognitive fatigue. This causes severe alert fatigue, suboptimal MTTR, and engineer burnout.

**AgentSync** resolves this challenge through a **Dual-Stack Integration** that bridges:
1. **Autonomous Incident Triage (AgentSync)**: A LangGraph state machine orchestrating specialized AI agents (Planner, Investigation, Analysis, Decision) equipped with enterprise tools to parse raw logs and diagnose root causes without human intervention.
2. **Resource Allocation & Decision Engine (HCM)**: A skill-aware human capital matrix that dynamically tracks operative capacities, enforces strict workload headroom thresholds (`< 100%`), disqualifies overloaded personnel, and bundles contextual telemetry directly into tickets for instant handoff.

---

## 2. Implemented Architecture & Milestones

The project was constructed and verified across five progressive development milestones:

- **Milestone 1 — Foundations & Core Agent Nodes:** Engineered specialized agents (Planner, Investigation, Analysis, Decision) using LangChain and ChatGroq, establishing isolated cognitive responsibilities.
- **Milestone 2 — Tool Registry & ReAct Integration:** Integrated six enterprise diagnostic tools into a dynamic ReAct paradigm, enabling autonomous evidence gathering and action execution.
- **Milestone 3 — State-Graph Orchestration & Memory:** Constructed the LangGraph state machine with conditional risk evaluation routing, and integrated SQLite long-term episodic memory (`agentsync_memory.db`) to enable past precedent recall.
- **Milestone 4 — Full-Stack API, Dashboard & Deployment:** Built the FastAPI REST interface, React 19 + Vite operations console, incident ticket management center, and deployed the production stack on Render and Vercel.
- **Milestone 5 — Dual-Stack HCM & Resource Matrix Integration:** Integrated the `-AI-Agent-Coordination-Decision-Engine` into a single unified web console, implemented 5 evidence-based HR agents, Talent Scout AI squad assembly with headroom checks, added `query_resource_matrix`, established the `< 100%` capacity headroom lock, and built zero-downtime in-process fallback architecture.

---

## 3. Workflow State Machine & Agent Topology

The engine is orchestrated using **LangGraph**, which passes a strictly typed `AgentState` dictionary between nodes.

```
                    ┌─────────────────────────┐
                    │      Incoming Event     │
                    │   (User / System Alert) │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      Planner Agent      │
                    │ (Step-by-step checklist)│
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Investigation Agent   │
                    │ (ReAct Multi-Tool Calls)│
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     Analysis Agent      │
                    │ (Root-cause diagnosis)  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
         ┌──────────┤     Risk Evaluation     ├──────────┐
         │          │   (Conditional Router)  │          │
         │          └─────────────────────────┘          │
         ▼                                               ▼
[High / Standard Path]                          [Medium Path - Re-investigate]
         │                                               │
         ▼                                               │
    ┌────────────────┐                                   │
    │ Decision Agent │ ◄─────────────────────────────────┘
    └──────┬─────────┘
           │
           ▼
    ┌───────────────────────┐
    │ Resource Matrix Query │ ── Strict Skill Filter + <100% Capacity Enforcement
    └──────┬────────────────┘
           │
     ┌─────┴────────────────────────┐
     ▼                              ▼
[ Long-Term Memory ]     [ Smart Assignment & Context Bundle ]
(SQLite Memory DB)       (Disqualify Overloaded, Attach Telemetry)
```

### The 9-Agent Fleet

| Agent | Tier | Role | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Planner Agent** | Incident | Strategy | Analyzes the initial report and defines a prioritized investigation checklist. |
| **Investigation Agent** | Incident | Research / ReAct | Autonomously calls tools to gather diagnostics, inspect databases, and query knowledge bases. |
| **Analysis Agent** | Incident | Diagnostics | Synthesizes technical evidence into root cause assessments and business risk tiers. |
| **Decision Agent** | Incident | Resolution / Dispatch | Prescribes mitigation plans, triggers engineer matching, and bundles telemetry. |
| **Workload Agent** | HCM | Capacity Enforcement | Tracks allocation %, enforces `< 100%` headroom threshold, prevents alert fatigue. |
| **Project Fit Agent** | HCM | Talent Matching | Vector skill-profile indexing, incident domain mapping, fit score calculation. |
| **Performance Agent** | HCM | Operational Metrics | Analyzes historical incident resolution velocity, code quality, and delivery track records. |
| **Availability Agent** | HCM | Scheduling | Assesses active commitments, deadlines, and on-call bandwidth reservations. |
| **Employee Wellbeing Agent** | HCM | Safety & Burnout | Monitors stress indices, detects rapid load spikes, triggers early HR interventions. |

---

## 4. Strict Skill Filtering & Workload Headroom Enforcement Specification

### Hard Constraints in Engineer Assignment

1. **Skill-Aware Filtering**:
   - The system ingests service identifiers, error keywords, and technology tags from the incident investigation.
   - Operative profiles (e.g., Vance Sterling: `AWS`, `Kubernetes`, `Terraform`; Tariq Mansoor: `Rust`, `Kubernetes`, `OAuth`, `Auth Service`) are indexed and matched against these tags.

2. **Workload Headroom Enforcement (`< 100%` Threshold)**:
   - Any engineer whose active workload equals or exceeds `100%` of maximum capacity is **immediately disqualified** from incident assignment, regardless of skill match score.
   - Example baseline: Dr. Elena Rostova (`NEURAL`, 115% capacity) and Lucas Drake (`120% capacity`) are locked out to protect employee wellbeing and prevent alert fatigue.

3. **Dynamic Workload Allocation & Stress Recalculation**:
   - When an eligible engineer is selected, their allocated capacity is incremented by `+15%` for the duration of the incident.
   - The stress index is recalculated dynamically:
     $$\text{Stress Index} = \min\left(100, \text{round}\left(\frac{\text{Allocated Capacity}}{100} \times 45\right)\right)$$
   - If the new capacity exceeds `85%` or the stress index reaches `70`, the system flags an automated **Wellbeing Safeguard Warning** with managerial check-in recommendations.

---

## 5. Contextual Handoff & Telemetry Bundling Schema

To eliminate onboarding friction during high-stress outages, the system compiles a `ContextBundle` attached directly to the incident ticket:

```json
{
  "assigned_to": {
    "id": "OP-04",
    "name": "Tariq Mansoor",
    "callsign": "AEGIS",
    "role": "Cyber Defense Specialist",
    "capacity_before": 60,
    "capacity_after": 75,
    "stress_index": 34
  },
  "fit_score": 85,
  "matched_skills": ["Rust", "Kubernetes", "Auth Service"],
  "remaining_headroom": 25,
  "wellbeing_alert": null,
  "incident_diagnostics": {
    "incident_summary": "Payment API is failing with database timeout errors",
    "affected_service": "Payment API",
    "root_cause": "Database connection pool exhaustion and unreachable replica",
    "recommended_runbook": "Payment API - Database Connection Pool Exhaustion SOP",
    "raw_logs_snippet": "ConnectionTimeout: could not obtain connection within 5000ms"
  }
}
```

---

## 6. Dual-Stack Integration & Fault-Tolerant Fallback

The architecture unites two complementary technologies:
- **Primary Orchestrator**: Python 3.10+ FastAPI + LangGraph state machine.
- **Human Capital Matrix**: Node.js/Express service at `http://localhost:5000`.

### Fault-Tolerance Mechanism
- When the Node.js microservice is reachable, state synchronizes across HTTP REST calls (`GET /api/state`).
- If the auxiliary microservice experiences network partition, maintenance, or downtime, the Python controller (`hcm_manager.py`) **automatically and transparently falls back to in-process evaluation**.
- Operational interruption is exactly **zero (0%)**, ensuring incident resolution and engineer assignment never fail due to auxiliary service outages.

---

## 7. Enterprise Tool Ecosystem (7 Tools)

| Tool ID | Function | Target Data Source |
| :--- | :--- | :--- |
| `analyze_logs` | Extracts recent error traces and anomalous frequencies. | `enterprise_mock.db / service_logs` |
| `check_health` | Queries latency, CPU, and operational status of monitored microservices. | `enterprise_mock.db / service_health` |
| `search_incident_history` | Semantic and keyword search of past outages and historical resolutions. | `enterprise_mock.db / historical_incidents` |
| `search_runbooks` | Retrieves approved standard operating procedures and mitigation playbooks. | `enterprise_mock.db / service_runbooks` |
| `manage_incident` | Programmatically creates, escalates, or resolves tickets in the ITSM layer. | Simulated ITSM system |
| `check_external_service_status` | Executes live HTTP probes against third-party endpoints. | External APIs / Public Web |
| `query_resource_matrix` | Queries real-time HCM capacity, skill matches, and team headroom. | HCM Operative Allocation Matrix |

---

## 8. Unified Web Interface Specification

The frontend delivers a **single, unified web console** built with React 19 + Vite:
- **Platform Dashboard**: High-level platform health, LangGraph execution metrics, team bandwidth averages, and capacity overload alerts.
- **Incident Resolution Center**: Real-time pipeline animations, execution plan viewer, root-cause diagnostics, and the **Smart Resource Assignment & Contextual Handoff** card.
- **Resource Matrix & HCM Console**: Operative roster with cyberpunk avatars, callsigns, capacity progress bars (Nominal / Elevated / Overload), interactive project allocation matrix table, and on-demand 5-Agent HR Review drawer.
- **Enterprise Missions**: Mission forge modal and active project dependency cards (PRJ-101 to PRJ-105).
- **Incident Tickets**: Ticket management console with assigned operative tags and pre-packaged context bundles.
- **Investigations**: Long-term memory query interface powered by SQLite persistence.
- **Agent Fleet**: Operational dashboard displaying all 9 autonomous agents.
- **Settings & Dual-Stack**: Live connection pulse, architecture diagram, and in-process fallback indicators.

---

## 9. Verification & Test Suite Matrix

The platform is continuously verified via an automated test suite comprising **38 tests** across 4 test suites:

| Test Suite | File | Tests | Status |
| :--- | :--- | :---: | :---: |
| **Agent Reasoning & Workflow** | `tests/test_agents.py` | 4 | ✅ Passed |
| **API Endpoints & Contracts** | `tests/test_api.py` | 16 | ✅ Passed |
| **HCM Manager & Headroom Lock** | `tests/test_hcm.py` | 8 | ✅ Passed |
| **Enterprise Tools Execution** | `tests/test_tools.py` | 10 | ✅ Passed |
| **Total** | | **38** | **100% Pass** |

---

## 10. Production Deployment

- **Frontend Console**: Deployed on **Vercel** (`https://agent-sync.vercel.app`) using SPA rewrites configured in `frontend/vercel.json`.
- **Backend API**: Deployed on **Render** as a persistent web service running `uvicorn api.main:app --host 0.0.0.0 --port $PORT`.
- **Dual-Stack Fallback**: Guaranteed zero-downtime execution in both local development and cloud production environments.
