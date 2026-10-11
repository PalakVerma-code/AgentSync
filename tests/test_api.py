"""
tests/test_api.py — Integration tests for the AgentSync FastAPI endpoints.
Uses HTTPX's built-in TestClient (async-safe with anyio) so no real server is needed.
"""
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


# ─── /health ──────────────────────────────────────────────────────────────────

def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert data["status"] in ("healthy", "degraded")
    assert "components" in data


# ─── /metrics ─────────────────────────────────────────────────────────────────

def test_metrics_endpoint():
    resp = client.get("/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "platform" in data
    assert "agents" in data
    assert "workflows" in data
    assert "tools" in data
    assert data["agents"]["total"] == 4
    assert data["tools"]["total"] == 6


# ─── /agents ──────────────────────────────────────────────────────────────────

def test_list_agents():
    resp = client.get("/agents")
    assert resp.status_code == 200
    agents = resp.json()["agents"]
    assert len(agents) == 4
    ids = {a["id"] for a in agents}
    assert ids == {"planner", "investigation", "analysis", "decision"}
    for agent in agents:
        assert agent["status"] == "Online"
        assert "capabilities" in agent
        assert len(agent["capabilities"]) > 0


# ─── /tools ───────────────────────────────────────────────────────────────────

def test_list_tools():
    resp = client.get("/tools")
    assert resp.status_code == 200
    tools = resp.json()["tools"]
    assert len(tools) == 6
    categories = {t["category"] for t in tools}
    assert "Observability" in categories
    assert "Knowledge" in categories
    assert "Action" in categories
    for tool in tools:
        assert "id" in tool
        assert "name" in tool
        assert "parameters" in tool
        assert isinstance(tool["parameters"], list)


# ─── /incidents/history ───────────────────────────────────────────────────────

def test_get_history_default():
    resp = client.get("/incidents/history")
    assert resp.status_code == 200
    data = resp.json()
    assert "history" in data
    assert "total" in data
    assert isinstance(data["history"], list)


def test_get_history_with_limit():
    resp = client.get("/incidents/history?limit=5&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["history"]) <= 5


def test_get_history_detail_not_found():
    resp = client.get("/incidents/history/999999")
    assert resp.status_code == 404


# ─── /workflow/jobs ───────────────────────────────────────────────────────────

def test_list_jobs_empty():
    resp = client.get("/workflow/jobs")
    assert resp.status_code == 200
    data = resp.json()
    assert "jobs" in data
    assert "total" in data


# ─── /workflow/run — validation ───────────────────────────────────────────────

def test_run_workflow_empty_request():
    resp = client.post("/workflow/run", json={"request_text": ""})
    assert resp.status_code == 400
    assert "required" in resp.json()["detail"].lower()


def test_run_workflow_blank_whitespace():
    resp = client.post("/workflow/run", json={"request_text": "   "})
    assert resp.status_code == 400


def test_run_workflow_missing_field():
    resp = client.post("/workflow/run", json={})
    assert resp.status_code == 422  # Pydantic validation error


# ─── /workflow/status/{job_id} ────────────────────────────────────────────────

def test_workflow_status_not_found():
    resp = client.get("/workflow/status/nonexistent-job-id")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


# ─── /workflow/chat/{job_id} ──────────────────────────────────────────────────

def test_chat_without_prior_job():
    """Chat with no prior job should still return a valid response (graceful degradation)."""
    resp = client.post("/workflow/chat/fake-job-id-123", json={"message": "Hello"})
    # The endpoint should attempt the LLM call and either succeed or return an error message,
    # but must not crash (500). If the LLM is unreachable, it returns error text in 'reply'.
    assert resp.status_code == 200
    assert "reply" in resp.json()
