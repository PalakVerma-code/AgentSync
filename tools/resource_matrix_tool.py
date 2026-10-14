"""Resource Matrix Tool for AgentSync Investigation and Decision Agents.
Queries real-time Human Capital Management (HCM) capacity, skill matching,
and workload headroom to support smart assignment and burnout protection.
"""

from langchain_core.tools import tool
from utils.logging_config import setup_logger
from hcm.hcm_manager import hcm_manager

logger = setup_logger("resource_matrix_tool")

@tool
def query_resource_matrix(action: str, query: str = "") -> str:
    """
    Queries the enterprise Resource Allocation Matrix and Human Capital Management (HCM) system.
    
    Args:
        action: The operation to execute. Supported actions:
            - 'find_engineers': Find engineers matching technical skills with available headroom (<100%). Query: comma-separated skills (e.g. 'Kubernetes, AWS', 'Python, PostgreSQL').
            - 'check_capacity': Check current allocation, headroom, and stress index for a specific operative. Query: operative name or ID (e.g. 'CYPHER', 'OP-01', 'Vance Sterling').
            - 'list_team_headroom': Returns an executive breakdown of all engineers, highlighting overloaded members (>100%) and available bandwidth.
        query: Parameters for the specified action.
        
    Returns:
        Structured text summary of operative capacities, skill matches, and headroom.
    """
    logger.info(f"Querying Resource Matrix: action={action}, query={query}")
    action_clean = action.lower().strip()

    try:
        if action_clean in ["find_engineers", "match"]:
            skills = [s.strip() for s in query.split(",") if s.strip()] if query else ["General"]
            res = hcm_manager.match_engineer(skills)
            if not res["success"]:
                return f"Dispatched HCM Search: No engineers available under 100% capacity threshold. Disqualified: {[d['name'] for d in res.get('disqualified_overloaded', [])]}."
            
            op = res["assigned_engineer"]
            bundle = res["context_bundle"]
            out = f"Optimal Matched Engineer Found:\n"
            out += f"- Name: {op['name']} ({op['callsign']})\n"
            out += f"- Role: {op['role']}\n"
            out += f"- Skills: {', '.join(op.get('skills', []))}\n"
            out += f"- Matched: {', '.join(bundle.get('matched_skills', []))} (Fit Score: {bundle.get('fit_score')} %)\n"
            out += f"- Workload Headroom: {bundle.get('remaining_headroom')}% remaining\n"
            if res.get("disqualified_overloaded"):
                out += f"\nDisqualified due to Overload (>100% capacity):\n"
                for dis in res["disqualified_overloaded"]:
                    out += f"  * {dis['name']} ({dis['allocatedCapacity']}% load) - Disqualified for burnout protection.\n"
            return out

        elif action_clean in ["check_capacity", "get_operative"]:
            q_norm = query.lower().strip()
            for op in hcm_manager.get_operatives():
                if q_norm in op["id"].lower() or q_norm in op["name"].lower() or q_norm in op["callsign"].lower():
                    status = "OVER_CAPACITY (High Burnout Risk)" if op["allocatedCapacity"] > 100 else ("ELEVATED" if op["allocatedCapacity"] > 85 else "NOMINAL")
                    return (
                        f"Operative: {op['name']} ({op['callsign']}) - {op['role']}\n"
                        f"- Allocation: {op['allocatedCapacity']}% of {op['maxCapacity']}%\n"
                        f"- Status: {status}\n"
                        f"- Stress Index: {op['stressIndex']}/100\n"
                        f"- Skills: {', '.join(op.get('skills', []))}\n"
                        f"- Active Projects: {', '.join(op.get('assignedProjects', []))}"
                    )
            return f"Operative matching '{query}' not found in Resource Matrix."

        elif action_clean in ["list_team_headroom", "team", "overview"]:
            ops = hcm_manager.get_operatives()
            overloaded = [o for o in ops if o["allocatedCapacity"] > 100]
            available = [o for o in ops if o["allocatedCapacity"] <= 85]
            overloaded_labels = [f"{o['callsign']} ({o['allocatedCapacity']}%)" for o in overloaded]
            available_labels = [o['callsign'] for o in available]
            out = f"Enterprise Resource Allocation Matrix Overview ({len(ops)} Operatives):\n"
            out += f"- Available with Headroom (<=85%): {len(available)} engineers ({', '.join(available_labels)})\n"
            out += f"- Overloaded (>100% Capacity): {len(overloaded)} engineers ({', '.join(overloaded_labels)})\n"
            out += "\nActive Roster:\n"
            for o in ops:
                out += f"  * {o['callsign']} ({o['name']}): {o['allocatedCapacity']}% load, stress {o['stressIndex']}/100, skills: {', '.join(o['skills'][:4])}\n"
            return out

        else:
            return f"Unsupported action '{action}'. Use 'find_engineers', 'check_capacity', or 'list_team_headroom'."

    except Exception as e:
        err = f"Failed to query Resource Matrix: {str(e)}"
        logger.error(err)
        return err
