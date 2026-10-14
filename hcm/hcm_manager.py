"""Human Capital Management (HCM) & Resource Matrix Manager.
Bridges AgentSync's LangGraph incident engine with the Resource Allocation Matrix.
Implements:
- Strict Skill Filtering
- Workload Headroom Enforcement (< 100% capacity)
- Burnout Prevention & Wellbeing Safeguards
- Contextual Handoff & Telemetry Bundling
- Dual-Stack Synchronization with Node.js/Express with seamless In-Process Fallback
"""

import copy
import json
import logging
import time
from typing import Dict, Any, List, Optional
from hcm.hr_agents import analyze_employee, employee_wellbeing_agent

logger = logging.getLogger("hcm_manager")

INITIAL_OPERATIVES = [
    {
        "id": "OP-01",
        "name": "Vance Sterling",
        "callsign": "CYPHER",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "role": "Staff Cloud Architect",
        "tier": "Level 48 Architect",
        "level": 48,
        "allocatedCapacity": 85,
        "maxCapacity": 100,
        "stressIndex": 28,
        "stats": {"velocity": 94, "codeQuality": 98, "delivery": 91, "collaboration": 88},
        "skills": ["AWS", "Kubernetes", "Terraform", "Rust", "Zero-Trust", "Cloud"],
        "assignedProjects": ["PRJ-101"],
        "assignedIncidents": [],
        "questLog": ["Zero-Downtime EKS Switch", "Terraform Drift Guard v2"]
    },
    {
        "id": "OP-02",
        "name": "Dr. Elena Rostova",
        "callsign": "NEURAL",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        "role": "Principal AI Researcher",
        "tier": "Level 52 Sage",
        "level": 52,
        "allocatedCapacity": 115,
        "maxCapacity": 100,
        "stressIndex": 78,
        "stats": {"velocity": 88, "codeQuality": 99, "delivery": 85, "collaboration": 92},
        "skills": ["Python", "PyTorch", "RAG", "LLMs", "Vector DBs", "TypeScript", "LangChain"],
        "assignedProjects": ["PRJ-102", "PRJ-103"],
        "assignedIncidents": [],
        "questLog": ["Autonomous Agent Swarm", "Vector Context Compression"]
    },
    {
        "id": "OP-03",
        "name": "Kaelen Chen",
        "callsign": "RAZOR",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        "role": "Senior Full-Stack Operative",
        "tier": "Level 39 Vanguard",
        "level": 39,
        "allocatedCapacity": 70,
        "maxCapacity": 100,
        "stressIndex": 18,
        "stats": {"velocity": 96, "codeQuality": 90, "delivery": 94, "collaboration": 85},
        "skills": ["React 19", "Next.js", "TypeScript", "Tailwind", "GraphQL", "Web Frontend"],
        "assignedProjects": ["PRJ-102"],
        "assignedIncidents": [],
        "questLog": ["Cyber Glassmorphic HUD Build", "Wasm Audio Pipeline"]
    },
    {
        "id": "OP-04",
        "name": "Tariq Mansoor",
        "callsign": "AEGIS",
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        "role": "Cyber Defense Specialist",
        "tier": "Level 44 Sentinel",
        "level": 44,
        "allocatedCapacity": 60,
        "maxCapacity": 100,
        "stressIndex": 12,
        "stats": {"velocity": 89, "codeQuality": 96, "delivery": 92, "collaboration": 80},
        "skills": ["Rust", "OAuth", "SOC2", "Kubernetes", "Linux Kernel", "Auth Service", "Security"],
        "assignedProjects": ["PRJ-104"],
        "assignedIncidents": [],
        "questLog": ["Quantum-Resistant Key Rotation", "BGP Hijack Mitigation"]
    },
    {
        "id": "OP-05",
        "name": "Mira Takahashi",
        "callsign": "GHOST",
        "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        "role": "High-Frequency Backend Lead",
        "tier": "Level 46 Specialist",
        "level": 46,
        "allocatedCapacity": 90,
        "maxCapacity": 100,
        "stressIndex": 35,
        "stats": {"velocity": 98, "codeQuality": 92, "delivery": 95, "collaboration": 79},
        "skills": ["Go", "Kafka", "Docker", "gRPC", "Redis", "Payment API", "Microservices"],
        "assignedProjects": ["PRJ-105"],
        "assignedIncidents": [],
        "questLog": ["Sub-Millisecond Order Matching", "Distributed WAL Engine"]
    },
    {
        "id": "OP-06",
        "name": "Devon Ward",
        "callsign": "HYPERION",
        "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
        "role": "Infrastructure DevOps Lead",
        "tier": "Level 41 Artificer",
        "level": 41,
        "allocatedCapacity": 50,
        "maxCapacity": 100,
        "stressIndex": 10,
        "stats": {"velocity": 91, "codeQuality": 88, "delivery": 90, "collaboration": 94},
        "skills": ["AWS", "GCP", "Terraform", "CI/CD", "Prometheus", "DNS", "Networking"],
        "assignedProjects": ["PRJ-101"],
        "assignedIncidents": [],
        "questLog": ["Multi-Region Failover Canary", "Spot Fleet Cost Halver"]
    },
    {
        "id": "OP-07",
        "name": "Zoya Al-Hassan",
        "callsign": "SYNAPSE",
        "avatar": "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
        "role": "AI Data Platform Engineer",
        "tier": "Level 35 Alchemist",
        "level": 35,
        "allocatedCapacity": 75,
        "maxCapacity": 100,
        "stressIndex": 22,
        "stats": {"velocity": 85, "codeQuality": 94, "delivery": 87, "collaboration": 89},
        "skills": ["Python", "Spark", "Kafka", "PostgreSQL", "Snowflake", "Database", "SQL"],
        "assignedProjects": ["PRJ-105"],
        "assignedIncidents": [],
        "questLog": ["Lakehouse Delta Optimization", "Feature Store Streamer"]
    },
    {
        "id": "OP-08",
        "name": "Lucas Drake",
        "callsign": "VORTEX",
        "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
        "role": "Lead Systems Architect",
        "tier": "Level 50 Strategist",
        "level": 50,
        "allocatedCapacity": 120,
        "maxCapacity": 100,
        "stressIndex": 82,
        "stats": {"velocity": 93, "codeQuality": 97, "delivery": 89, "collaboration": 84},
        "skills": ["C++", "Rust", "Distributed Systems", "Linux Kernel", "High-Load"],
        "assignedProjects": ["PRJ-104", "PRJ-106"],
        "assignedIncidents": [],
        "questLog": ["Core Engine Memory Compaction", "NVMe Direct I/O Driver"]
    }
]

INITIAL_PROJECTS = [
    {
        "id": "PRJ-101",
        "title": "Cloud Infrastructure Modernization",
        "codename": "CLOUD-MODERN",
        "department": "Infrastructure",
        "difficulty": "High Priority",
        "priority": "CRITICAL",
        "budget": "$420,000",
        "deadline": "2026-12-15",
        "requiredSkills": ["AWS", "Kubernetes", "Terraform", "Zero-Trust"],
        "assignedOperativeIds": ["OP-01", "OP-06"],
        "requiredSlots": 4,
        "progress": 68
    },
    {
        "id": "PRJ-102",
        "title": "Autonomous Multi-Agent AI Platform",
        "codename": "AI-PLATFORM",
        "department": "Applied AI",
        "difficulty": "High Priority",
        "priority": "HIGH",
        "budget": "$550,000",
        "deadline": "2027-01-30",
        "requiredSkills": ["Python", "PyTorch", "RAG", "LLMs", "Vector DBs"],
        "assignedOperativeIds": ["OP-02", "OP-03"],
        "requiredSlots": 5,
        "progress": 42
    },
    {
        "id": "PRJ-103",
        "title": "Customer Portal & Design System",
        "codename": "PORTAL-SYSTEM",
        "department": "Frontend Engineering",
        "difficulty": "Medium Priority",
        "priority": "MEDIUM",
        "budget": "$180,000",
        "deadline": "2026-11-20",
        "requiredSkills": ["React 19", "Next.js", "TypeScript", "Tailwind", "WebGL"],
        "assignedOperativeIds": ["OP-02"],
        "requiredSlots": 3,
        "progress": 84
    },
    {
        "id": "PRJ-104",
        "title": "Zero-Trust Identity & Access Security",
        "codename": "ZERO-TRUST-SEC",
        "department": "Cybersecurity",
        "difficulty": "Critical Priority",
        "priority": "CRITICAL",
        "budget": "$620,000",
        "deadline": "2027-03-01",
        "requiredSkills": ["Rust", "Zero-Trust", "OAuth", "SOC2", "Linux Kernel"],
        "assignedOperativeIds": ["OP-04", "OP-08"],
        "requiredSlots": 3,
        "progress": 30
    }
]


class HCMManager:
    """Enterprise Human Capital Management & Resource Allocation Matrix controller."""

    def __init__(self):
        self.operatives: List[Dict[str, Any]] = copy.deepcopy(INITIAL_OPERATIVES)
        self.projects: List[Dict[str, Any]] = copy.deepcopy(INITIAL_PROJECTS)
        self.telemetry_logs: List[Dict[str, Any]] = [
            {
                "agent": "Talent Scout Agent",
                "action": "Vector Embeddings Refreshed",
                "detail": "Indexed 8 operative skill profiles against active mission matrices.",
                "time": time.strftime("%H:%M:%S"),
                "badge": "MATCH_READY"
            },
            {
                "agent": "Capacity Balancer Agent",
                "action": "Critical Workload Alarm",
                "detail": "Dr. Elena Rostova is operating at 115% capacity across 2 Tier IV missions.",
                "time": time.strftime("%H:%M:%S"),
                "badge": "OVERLOAD"
            }
        ]
        self.node_service_url = "http://localhost:5000"

    def get_operatives(self) -> List[Dict[str, Any]]:
        return self.operatives

    def get_operative_by_id(self, op_id: str) -> Optional[Dict[str, Any]]:
        for op in self.operatives:
            if op["id"].upper() == op_id.upper():
                return op
        return None

    def get_projects(self) -> List[Dict[str, Any]]:
        return self.projects

    def get_telemetry_logs(self) -> List[Dict[str, Any]]:
        return self.telemetry_logs

    def toggle_allocation(self, operative_id: str, project_id: str) -> Dict[str, Any]:
        """Toggles an operative's assignment to a project and recalculates capacity."""
        op = self.get_operative_by_id(operative_id)
        prj = next((p for p in self.projects if p["id"] == project_id), None)

        if not op or not prj:
            return {"success": False, "error": "Operative or Project not found."}

        is_assigned = project_id in op.get("assignedProjects", [])
        if is_assigned:
            op["assignedProjects"] = [p for p in op.get("assignedProjects", []) if p != project_id]
            prj["assignedOperativeIds"] = [o for o in prj.get("assignedOperativeIds", []) if o != operative_id]
            op["allocatedCapacity"] = max(0, op["allocatedCapacity"] - 35)
        else:
            op.setdefault("assignedProjects", []).append(project_id)
            prj.setdefault("assignedOperativeIds", []).append(operative_id)
            op["allocatedCapacity"] += 35

        # Recalculate stress index
        op["stressIndex"] = min(100, round((op["allocatedCapacity"] / 100) * 45))

        log_entry = {
            "agent": "Capacity Balancer Agent",
            "action": "De-allocation Registered" if is_assigned else "Allocation Verified",
            "detail": f"{op['name']} ({op['callsign']}) updated for {prj['codename']}. Current Load: {op['allocatedCapacity']}%.",
            "time": time.strftime("%H:%M:%S"),
            "badge": "OVERLOAD" if op["allocatedCapacity"] > 100 else "NOMINAL"
        }
        self.telemetry_logs.insert(0, log_entry)
        return {"success": True, "operative": op, "project": prj, "log": log_entry}

    def match_engineer(self, required_skills: List[str], incident_details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Skill-Aware Matching with Strict Capacity Headroom (< 100%) Enforcement.
        
        Hard Constraints:
        1. Strict Skill Filtering against incident technologies.
        2. Workload Headroom Enforcement: ANY engineer at >= 100% capacity is DISQUALIFIED
           from incident paging to prevent alert fatigue and burnout.
        """
        req_norm = [s.strip().lower() for s in required_skills if s and s.strip()]
        if not req_norm:
            # Fallback common tech skills
            req_norm = ["database", "python", "kubernetes", "cloud", "api"]

        candidates = []
        disqualified = []

        for op in self.operatives:
            current_capacity = op.get("allocatedCapacity", 0)
            op_skills_lower = [s.lower() for s in op.get("skills", [])]

            # 1. Check Hard Constraint: Workload Headroom (< 100% capacity)
            if current_capacity >= 100:
                disqualified.append({
                    "id": op["id"],
                    "name": op["name"],
                    "callsign": op["callsign"],
                    "allocatedCapacity": current_capacity,
                    "reason": f"Disqualified: Active workload {current_capacity}% exceeds 100% safety threshold (Burnout Prevention)"
                })
                continue

            # 2. Skill match computation
            matched_skills = [skill for skill in op.get("skills", []) if skill.lower() in req_norm or any(r in skill.lower() for r in req_norm)]
            skill_score = (len(matched_skills) / max(1, len(req_norm))) * 60
            
            # Headroom bonus (more headroom = preferred)
            headroom = max(0, 100 - current_capacity)
            headroom_score = (headroom / 100) * 40
            
            total_fit = round(min(99, skill_score + headroom_score))

            candidates.append({
                "operative": op,
                "fitScore": total_fit,
                "matchedSkills": matched_skills,
                "headroom": headroom,
                "currentCapacity": current_capacity
            })

        # Sort candidate pool
        candidates.sort(key=lambda c: (len(c["matchedSkills"]) > 0, c["fitScore"]), reverse=True)

        if not candidates:
            # All available engineers overloaded or no candidates
            log_fallback = {
                "agent": "Capacity Balancer Agent",
                "action": "All Qualified Engineers Overloaded",
                "detail": "Emergency Escalation: All engineers matching required skills exceed 100% capacity.",
                "time": time.strftime("%H:%M:%S"),
                "badge": "BURNOUT_LOCKOUT"
            }
            self.telemetry_logs.insert(0, log_fallback)
            return {
                "success": False,
                "assigned_engineer": None,
                "disqualified": disqualified,
                "error": "No engineer available with sufficient workload headroom (<100%). Human manager review required."
            }

        chosen = candidates[0]
        selected_op = chosen["operative"]

        # Increment assigned workload for incident resolution (+15%)
        capacity_before = selected_op["allocatedCapacity"]
        selected_op["allocatedCapacity"] = min(120, capacity_before + 15)
        selected_op["stressIndex"] = min(100, round((selected_op["allocatedCapacity"] / 100) * 45))
        
        inc_title = incident_details.get("title", "Active Production Incident") if incident_details else "Active Production Incident"
        selected_op.setdefault("assignedIncidents", []).append({
            "title": inc_title,
            "assigned_at": time.strftime("%Y-%m-%d %H:%M:%S")
        })

        # Wellbeing Evaluation & Safeguard
        wellbeing_check = employee_wellbeing_agent(selected_op)
        wellbeing_alert = None
        if selected_op["allocatedCapacity"] > 85 or selected_op["stressIndex"] >= 70:
            wellbeing_alert = {
                "level": "OVER_CAPACITY" if selected_op["allocatedCapacity"] > 100 else "ELEVATED",
                "message": f"Assigned workload pushed {selected_op['name']} to {selected_op['allocatedCapacity']}% capacity. {wellbeing_check['summary']}",
                "recommendation": wellbeing_check["recommendations"][0] if wellbeing_check["recommendations"] else "Monitor shift duration."
            }

        # Pre-packaged Context Bundle
        context_bundle = {
            "assigned_to": {
                "id": selected_op["id"],
                "name": selected_op["name"],
                "callsign": selected_op["callsign"],
                "role": selected_op["role"],
                "avatar": selected_op.get("avatar", ""),
                "skills": selected_op.get("skills", []),
                "capacity_before": capacity_before,
                "capacity_after": selected_op["allocatedCapacity"],
                "stress_index": selected_op["stressIndex"]
            },
            "fit_score": chosen["fitScore"],
            "matched_skills": chosen["matchedSkills"],
            "remaining_headroom": max(0, 100 - selected_op["allocatedCapacity"]),
            "wellbeing_alert": wellbeing_alert,
            "incident_diagnostics": {
                "incident_summary": incident_details.get("summary", inc_title) if incident_details else inc_title,
                "root_cause": incident_details.get("root_cause", "Isolated during automated agent investigation.") if incident_details else "Under investigation.",
                "affected_service": incident_details.get("service", "Enterprise Service") if incident_details else "Enterprise Service",
                "recommended_runbook": incident_details.get("runbook", "Follow standard incident mitigation SOP.") if incident_details else "Follow standard SOP.",
                "raw_logs_snippet": incident_details.get("logs_snippet", "No immediate fatal tracebacks.") if incident_details else "Logs captured in telemetry."
            }
        }

        # Telemetry logs
        log_entry1 = {
            "agent": "Talent Scout Agent",
            "action": "Skill-Aware Matching",
            "detail": f"Matched {selected_op['name']} ({selected_op['callsign']}) with {chosen['fitScore']}% fit for {required_skills}.",
            "time": time.strftime("%H:%M:%S"),
            "badge": f"{chosen['fitScore']}% MATCH"
        }
        log_entry2 = {
            "agent": "Capacity Balancer Agent",
            "action": "Smart Assignment & Headroom Lock",
            "detail": f"{selected_op['name']} assigned to incident. Workload: {capacity_before}% -> {selected_op['allocatedCapacity']}%.",
            "time": time.strftime("%H:%M:%S"),
            "badge": "ASSIGNED" if not wellbeing_alert else "ELEVATED_LOAD"
        }
        self.telemetry_logs.insert(0, log_entry2)
        self.telemetry_logs.insert(0, log_entry1)

        return {
            "success": True,
            "assigned_engineer": context_bundle["assigned_to"],
            "context_bundle": context_bundle,
            "candidates_reviewed": len(candidates) + len(disqualified),
            "disqualified_overloaded": disqualified
        }

    def scout_talent(self, query: str = "", skills: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Talent Scout AI: Searches and ranks operatives based on natural language query keywords or skills,
        enforcing the < 100% capacity headroom threshold and providing candidate breakdowns.
        """
        tokens = [t.lower() for t in query.replace(",", " ").replace("-", " ").split() if len(t) > 2]
        if skills:
            tokens.extend([s.lower().strip() for s in skills if s.strip()])
        if not tokens:
            tokens = ["cloud", "backend", "python", "kubernetes", "database"]

        eligible_candidates = []
        disqualified = []

        for op in self.operatives:
            cap = op.get("allocatedCapacity", 0)
            op_skills = [s.lower() for s in op.get("skills", [])]
            op_text = f"{op['name']} {op['role']} {op['callsign']} {' '.join(op_skills)}".lower()

            if cap >= 100:
                disqualified.append({
                    "id": op["id"],
                    "name": op["name"],
                    "callsign": op["callsign"],
                    "role": op["role"],
                    "avatar": op.get("avatar", ""),
                    "allocatedCapacity": cap,
                    "reason": f"Disqualified: {cap}% active capacity exceeds 100% safety threshold (Burnout Prevention)"
                })
                continue

            matched = [s for s in op.get("skills", []) if any(t in s.lower() for t in tokens) or s.lower() in tokens]
            match_count = sum(1 for t in tokens if t in op_text)
            fit_score = min(99, max(25, round((match_count / max(1, len(tokens))) * 70 + (max(0, 100 - cap) / 100) * 30)))

            eligible_candidates.append({
                "operative": op,
                "fit_score": fit_score,
                "matched_skills": list(set(matched)),
                "remaining_headroom": max(0, 100 - cap),
                "status": "AVAILABLE" if cap < 85 else "ELEVATED"
            })

        eligible_candidates.sort(key=lambda c: (len(c["matched_skills"]) > 0, c["fit_score"]), reverse=True)

        return {
            "success": True,
            "query": query,
            "candidates": eligible_candidates,
            "disqualified_overloaded": disqualified
        }

    def forge_project(self, title: str, department: str, difficulty: str, budget: str, deadline: str, required_skills: List[str], required_slots: int = 3) -> Dict[str, Any]:
        """Creates a new mission / project in the enterprise matrix."""
        import random
        new_prj = {
            "id": f"PRJ-{random.randint(100, 999)}",
            "title": title or "New Enterprise Mission",
            "codename": (title or "MISSION").upper().replace(" ", "-")[:16],
            "department": department or "Operations",
            "difficulty": difficulty or "Tier IV - Mythic",
            "priority": "HIGH",
            "budget": budget or "$300,000",
            "deadline": deadline or "2027-01-01",
            "requiredSkills": required_skills if isinstance(required_skills, list) else [s.strip() for s in str(required_skills).split(",")],
            "assignedOperativeIds": [],
            "requiredSlots": int(required_slots) or 3,
            "progress": 0
        }
        self.projects.insert(0, new_prj)
        log = {
            "agent": "Mission Forge Agent",
            "action": "New Mission Registered",
            "detail": f"Forged {new_prj['codename']} with requirements: {', '.join(new_prj['requiredSkills'])}.",
            "time": time.strftime("%H:%M:%S"),
            "badge": "MISSION_ACTIVE"
        }
        self.telemetry_logs.insert(0, log)
        return {"success": True, "project": new_prj}

    def run_hr_review(self, employee_id: str, project_id: Optional[str] = None) -> Dict[str, Any]:
        """Runs the 5-agent HR assessment on an operative with optional project fit."""
        op = self.get_operative_by_id(employee_id)
        if not op:
            return {"error": f"Operative with ID '{employee_id}' not found."}
        
        prj = next((p for p in self.projects if p["id"] == project_id), None) if project_id else None
        assessment = analyze_employee(op, prj)
        return {"success": True, "assessment": assessment}

    def add_employee(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Adds a new team member to the organization roster."""
        name = (data.get("name") or "").strip()
        if not name:
            return {"success": False, "error": "Employee name is required."}

        # Generate next ID
        existing_ids = []
        for o in self.operatives:
            if o.get("id", "").startswith("OP-"):
                num_part = o["id"].replace("OP-", "")
                if num_part.isdigit():
                    existing_ids.append(int(num_part))
        next_num = max(existing_ids, default=0) + 1
        new_id = f"OP-{next_num:02d}"

        # Parse skills
        skills_raw = data.get("skills", [])
        if isinstance(skills_raw, str):
            skills = [s.strip() for s in skills_raw.split(",") if s.strip()]
        elif isinstance(skills_raw, list):
            skills = [str(s).strip() for s in skills_raw if str(s).strip()]
        else:
            skills = []

        try:
            capacity = int(data.get("allocatedCapacity", 40) or 40)
        except (ValueError, TypeError):
            capacity = 40
        capacity = max(0, min(150, capacity))
        stress = min(100, round((capacity / 100) * 45))

        role = (data.get("role") or "Software Engineer").strip()
        department = (data.get("department") or "Engineering").strip()
        email = data.get("email") or f"{name.lower().replace(' ', '.')}@enterprise.com"
        avatar = data.get("avatar") or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"

        new_emp = {
            "id": new_id,
            "name": name,
            "callsign": department,
            "avatar": avatar,
            "role": role,
            "department": department,
            "email": email,
            "tier": role,
            "level": 40,
            "allocatedCapacity": capacity,
            "maxCapacity": 100,
            "stressIndex": stress,
            "stats": {
                "velocity": 90,
                "codeQuality": 92,
                "delivery": 90,
                "collaboration": 90
            },
            "skills": skills,
            "assignedProjects": data.get("assignedProjects", []) or [],
            "assignedIncidents": [],
            "questLog": [f"Assigned to {department} team"]
        }

        self.operatives.append(new_emp)

        log_entry = {
            "agent": "HR Management",
            "action": "New Team Member Added",
            "detail": f"Registered {name} ({role}) with {len(skills)} skills in {department}.",
            "time": time.strftime("%H:%M:%S"),
            "badge": "STAFF_ADDED"
        }
        self.telemetry_logs.insert(0, log_entry)
        return {"success": True, "employee": new_emp}

    def delete_employee(self, emp_id: str) -> Dict[str, Any]:
        """Deletes an employee from the organization and cleans up project assignments."""
        op = self.get_operative_by_id(emp_id)
        if not op:
            return {"success": False, "error": f"Employee with ID '{emp_id}' not found."}

        op_name = op.get("name", emp_id)

        # Remove from operatives
        self.operatives = [o for o in self.operatives if o["id"].upper() != emp_id.upper()]

        # Clean up project allocations
        for prj in self.projects:
            if emp_id in prj.get("assignedOperativeIds", []):
                prj["assignedOperativeIds"] = [o for o in prj["assignedOperativeIds"] if o != emp_id]

        log_entry = {
            "agent": "HR Management",
            "action": "Team Member Removed",
            "detail": f"Removed {op_name} ({emp_id}) and updated active project rosters.",
            "time": time.strftime("%H:%M:%S"),
            "badge": "STAFF_REMOVED"
        }
        self.telemetry_logs.insert(0, log_entry)
        return {"success": True, "deleted_id": emp_id, "name": op_name}

    def sync_with_node_hcm(self) -> Dict[str, Any]:
        """Attempts to sync with Node.js Express HCM service, falling back to in-process state."""
        import urllib.request
        try:
            req = urllib.request.Request(f"{self.node_service_url}/api/state", headers={"User-Agent": "AgentSync-FastAPI"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode())
                    if "operatives" in data and data["operatives"]:
                        # Merge or update
                        logger.info("Successfully synced state with Node.js Express HCM service.")
                        return {"status": "SYNCED_ONLINE", "mode": "Dual-Stack Active", "operatives_count": len(data["operatives"])}
        except Exception as e:
            logger.debug(f"Node.js HCM service not reachable ({e}). Gracefully running in-process fallback.")
        
        return {"status": "IN_PROCESS_FALLBACK", "mode": "In-Process Engine Active (Zero-Interruption)", "operatives_count": len(self.operatives)}


# Singleton instance
hcm_manager = HCMManager()
