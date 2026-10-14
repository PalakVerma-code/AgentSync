# Workflow Decision Making System

A full-stack production suite combining Human Capital Management (HCM), a real-time resource allocation matrix, multi-agent project-fit tools, and a Python-powered HR employee situation review.

---

### 🏛️ Architecture Breakdown

- **Client (`/client`)**:
  - React 18 + Vite + Tailwind CSS.
  - Cyber-Executive HUD with dual portals: **Commander Hub** and **Operative Workspace**.
  - Real-Time Allocation Matrix showing remaining work availability and the percentage of assigned-project skills matched, with **>100% overload alerts**.
  - Multi-Agent RAG terminal with live inter-agent reasoning telemetry.
- **Server (`/server`)**:
  - Node.js + Express.
  - Cookie-based sign-in with employee, HR, and Admin authorization; passwords are stored as salted scrypt hashes.
  - The first visit initializes the first Admin. Employees can self-register and edit their own profile; Admins can promote registered employees to HR.
  - Account records are persisted in `server/data/accounts.json` (excluded from Git). Set `NEXUS_DATA_DIR` to store account data elsewhere.
  - RESTful API endpoints:
    - `/api/auth/*`: Initial Admin setup, employee sign-up, sign-in, session restore, and sign-out.
    - `GET /api/state`: Role-scoped operative, project, and telemetry data.
    - `PUT /api/profile`: Update the signed-in account's profile.
    - `GET /api/users`, `PATCH /api/users/:id/role`: Admin-only account and HR role management.
    - `POST /api/matrix/toggle`: Real-time allocation toggles with automatic load and stress index recalculation.
    - `POST /api/rag/query`: Multi-agent semantic fit and capacity constraint resolver.
    - `POST /api/projects/forge`: Enterprise mission generator.
    - `POST /api/hr-review`: Authenticated proxy for HR-only review requests.
- **HR agent API (`app.py`, `agents.py`)**:
  - Python standard-library HTTP service on `http://127.0.0.1:8000`.
  - Five evidence-based agents review workload, allocation headroom, listed skills against a selected project, supplied performance metrics, and operational prompts for an employee check-in.
  - `GET /health` reports service availability; `POST /analyze` accepts an employee profile and an optional project.
  - Reviews use the profile data sent by the client and are decision support only; the service does not persist profiles or make employment or medical decisions.

---

### 🚀 Quick Start Guide

1. **Install JavaScript Dependencies**:
   ```bash
   npm run install:all
   ```
   Python 3 and the Windows Python launcher (`py`) must also be available. The HR API uses only Python's standard library; no Python packages need to be installed.

2. **Run the Node, Python, and Client Services Concurrently**:
   ```bash
   npm run dev
   ```
   - Client UI: `http://localhost:3000`
   - Express Backend API: `http://localhost:5000`
   - Python HR Agent API: `http://127.0.0.1:8000`
   - On first visit, create the one-time Admin account. Employees can then register and maintain their own profiles; the Admin can grant HR access from the **User access** tab.

3. **Production Build**:
   ```bash
   npm run build
   ```

4. **Run the Python agent tests**:
   ```bash
   py -m unittest discover -s tests
   ```
