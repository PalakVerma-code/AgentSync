import pytest
from fastapi.testclient import TestClient
from api.main import app
from hcm.hcm_manager import HCMManager, hcm_manager
from hcm.hr_agents import analyze_employee, employee_wellbeing_agent

client = TestClient(app)

def test_hcm_manager_initialization():
    mgr = HCMManager()
    operatives = mgr.get_operatives()
    projects = mgr.get_projects()
    
    assert len(operatives) >= 8
    assert len(projects) >= 4
    
    # Verify Elena Rostova is overloaded (>100%) by default for headroom testing
    elena = next(o for o in operatives if o["callsign"] == "NEURAL")
    assert elena["allocatedCapacity"] > 100

def test_headroom_enforcement_and_burnout_disqualification():
    mgr = HCMManager()
    # Search for skills matching AI/Python/PyTorch where Elena has skills
    res = mgr.match_engineer(["PyTorch", "Python", "LLMs"])
    
    assert res["success"] is True
    assigned = res["assigned_engineer"]
    # Elena Rostova should be DISQUALIFIED because allocatedCapacity is 115% (>100%)
    assert assigned["callsign"] != "NEURAL"
    
    disqualified_names = [d["name"] for d in res["disqualified_overloaded"]]
    assert "Dr. Elena Rostova" in disqualified_names
    
    # The assigned engineer should have remaining headroom
    assert res["context_bundle"]["remaining_headroom"] >= 0

def test_allocation_toggle_and_capacity_recalc():
    mgr = HCMManager()
    op = mgr.get_operatives()[0]
    op_id = op["id"]
    cap_initial = op["allocatedCapacity"]
    
    # Toggle allocation to PRJ-104
    res = mgr.toggle_allocation(op_id, "PRJ-104")
    assert res["success"] is True
    assert op["allocatedCapacity"] == cap_initial + 35
    
    # Toggle back
    res2 = mgr.toggle_allocation(op_id, "PRJ-104")
    assert res2["success"] is True
    assert op["allocatedCapacity"] == cap_initial

def test_hr_agents_and_wellbeing_safeguard():
    mgr = HCMManager()
    op = mgr.get_operative_by_id("OP-01")
    assert op is not None
    
    assessment = analyze_employee(op)
    assert "agents" in assessment
    assert "employee" in assessment
    assert len(assessment["agents"]) == 5
    agent_names = [a["agent"] for a in assessment["agents"]]
    assert "Workload Agent" in agent_names
    assert "Wellbeing Check-in Agent" in agent_names

    # Overloaded operative wellbeing check
    overloaded_op = {
        "id": "TEST-01",
        "name": "Test Engineer",
        "allocatedCapacity": 125,
        "stressIndex": 85,
        "stats": {"velocity": 90, "codeQuality": 90, "delivery": 90, "collaboration": 90}
    }
    wb = employee_wellbeing_agent(overloaded_op)
    assert wb["status"] == "CHECK_IN_SUGGESTED"
    assert "allocation is above stated capacity" in wb["summary"]
    assert len(wb["recommendations"]) > 0

def test_dual_stack_in_process_fallback():
    mgr = HCMManager()
    # With no node service running on port 5000, must seamlessly return in-process fallback
    status = mgr.sync_with_node_hcm()
    assert status["status"] == "IN_PROCESS_FALLBACK"
    assert "In-Process Engine Active" in status["mode"]
    assert status["operatives_count"] >= 8

def test_api_hcm_endpoints():
    # Test GET /hcm/state
    resp = client.get("/hcm/state")
    assert resp.status_code == 200
    data = resp.json()
    assert "operatives" in data
    assert "projects" in data
    assert "sync_status" in data

    # Test GET /hcm/operatives
    resp_ops = client.get("/hcm/operatives")
    assert resp_ops.status_code == 200
    assert resp_ops.json()["total"] >= 8

    # Test POST /hcm/match
    match_payload = {
        "skills": ["Kubernetes", "AWS"],
        "incident_summary": "EKS cluster pods crashing"
    }
    resp_match = client.post("/hcm/match", json=match_payload)
    assert resp_match.status_code == 200
    m_data = resp_match.json()
    assert m_data["success"] is True
    assert "assigned_engineer" in m_data

    # Test POST /hcm/matrix/toggle
    toggle_payload = {
        "operative_id": "OP-03",
        "project_id": "PRJ-104"
    }
    resp_toggle = client.post("/hcm/matrix/toggle", json=toggle_payload)
    assert resp_toggle.status_code == 200
    assert resp_toggle.json()["success"] is True

    # Test POST /hcm/hr-review
    review_payload = {
        "employee_id": "OP-01"
    }
    resp_review = client.post("/hcm/hr-review", json=review_payload)
    assert resp_review.status_code == 200
    assert "assessment" in resp_review.json()

def test_agents_and_tools_registration():
    resp_agents = client.get("/agents")
    assert resp_agents.status_code == 200
    agents = resp_agents.json()["agents"]
    assert len(agents) == 9
    agent_ids = [a["id"] for a in agents]
    assert "planner" in agent_ids
    assert "decision" in agent_ids
    assert "workload_agent" in agent_ids
    assert "employee_wellbeing_agent" in agent_ids

    resp_tools = client.get("/tools")
    assert resp_tools.status_code == 200
    tools = resp_tools.json()["tools"]
    tool_ids = [t["id"] for t in tools]
    assert "query_resource_matrix" in tool_ids
