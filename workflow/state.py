from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    user_request: str
    plan: str
    investigation_results: str
    analysis: str
    decision: str
    workflow_status: str
    errors: List[str]
    execution_metadata: Dict[str, Any]
    assigned_engineer: Optional[Dict[str, Any]]
    context_bundle: Optional[Dict[str, Any]]
    wellbeing_alert: Optional[Dict[str, Any]]
