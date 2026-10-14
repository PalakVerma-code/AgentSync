from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from workflow.state import AgentState
from config.settings import settings
from utils.logging_config import setup_logger, global_metrics
from memory.memory_manager import memory_manager

logger = setup_logger("decision_agent")

def run_decision(state: AgentState) -> AgentState:
    logger.info("Decision Agent started.")
    
    if state.get("decision"):
        logger.info("Decision already exists. Skipping LLM call.")
        return state

    try:
        llm = ChatGroq(api_key=settings.GROQ_API_KEY, model=settings.DEFAULT_MODEL)
        
        system_msg = SystemMessage(content="""You are the Decision Agent for an IT Incident Resolution Engine.
Evaluate the root cause analysis provided and formulate a final mitigation and resolution strategy.
Determine if an incident ticket needs to be created or escalated, and outline the exact actions to take.

CRITICAL RULE: If the analysis indicates that the requested service is NOT FOUND, unmonitored, or outside of our database, you MUST output exactly this phrase and nothing else (do not add any intro or outro):
"I cannot diagnose the [Service Name] because it is currently outside of our monitored systems. I have automatically created an escalated ticket ([Ticket ID]) for a human engineer to investigate the unmonitored server manually."
Replace [Service Name] with the name of the missing service, and [Ticket ID] with a random ticket ID (e.g., INC-4928).

If past similar decisions are provided, use them as context to inform your recommendation.
Provide a complete, final user-facing response with clear next steps.
""")
        
        # Retrieve long-term memory for context-aware decision making
        keywords = state['user_request'].split()
        search_keyword = keywords[0] if keywords else ""
        if len(keywords) > 2:
             # Use the most significant word (basic heuristic: longest word in first 3 words)
             search_keyword = max(keywords[:5], key=len)
             
        past_decisions = memory_manager.get_past_decisions(search_keyword)
        memory_context = ""
        if past_decisions:
            memory_context = "\n\nPast Similar Decisions from Long-Term Memory:\n"
            for req, dec in past_decisions:
                memory_context += f"- Request: {req}\n  Decision: {dec}\n"
                
        human_msg = HumanMessage(content=f"User Request: {state['user_request']}\nAnalysis: {state['analysis']}{memory_context}")
        
        logger.info("Calling Groq API for decision.")
        response = llm.invoke([system_msg, human_msg])
        global_metrics.increment_llm()
        
        decision_text = response.content
        
        # ─── HCM Smart Resource Assignment & Contextual Handoff ─────────────
        from hcm.hcm_manager import hcm_manager
        import re
        import os

        # Extract required skills based on incident keywords & analysis
        combined_text = (state['user_request'] + " " + state.get('analysis', '') + " " + state.get('investigation_results', '')).lower()
        extracted_skills = []
        if any(w in combined_text for w in ["database", "db", "sql", "postgres", "query", "timeout", "pool"]):
            extracted_skills.extend(["Database", "PostgreSQL", "SQL", "Python"])
        if any(w in combined_text for w in ["payment", "stripe", "checkout", "transaction", "gateway"]):
            extracted_skills.extend(["Payment API", "Go", "Kafka"])
        if any(w in combined_text for w in ["auth", "login", "jwt", "token", "oauth", "credential", "session"]):
            extracted_skills.extend(["Auth Service", "Security", "OAuth", "Rust"])
        if any(w in combined_text for w in ["frontend", "react", "ui", "web", "dashboard", "browser"]):
            extracted_skills.extend(["Web Frontend", "React 19", "TypeScript"])
        if any(w in combined_text for w in ["cloud", "aws", "kubernetes", "k8s", "cluster", "eks", "terraform"]):
            extracted_skills.extend(["AWS", "Kubernetes", "Terraform", "Cloud"])
        if any(w in combined_text for w in ["network", "dns", "firewall", "connection", "port"]):
            extracted_skills.extend(["DNS", "Networking", "Linux Kernel"])
        
        if not extracted_skills:
            extracted_skills = ["Cloud", "Kubernetes", "Python"]

        # Run skill-aware matching with strict capacity headroom enforcement (< 100%)
        match_result = hcm_manager.match_engineer(
            required_skills=extracted_skills,
            incident_details={
                "title": state['user_request'],
                "summary": state['user_request'],
                "root_cause": state.get('analysis', 'Under analysis by Investigation and Analysis agents.'),
                "service": state.get('user_request', 'Enterprise Service'),
                "logs_snippet": state.get('investigation_results', '')[:500]
            }
        )

        assigned = match_result.get("assigned_engineer")
        context_bundle = match_result.get("context_bundle")
        wellbeing_alert = context_bundle.get("wellbeing_alert") if context_bundle else None

        state["assigned_engineer"] = assigned
        state["context_bundle"] = context_bundle
        state["wellbeing_alert"] = wellbeing_alert

        if assigned and context_bundle:
            hcm_block = "\n\n---\n\n### 👷 Smart Resource Assignment & Contextual Handoff\n"
            hcm_block += f"- **Assigned Engineer:** **{assigned['name']}** (`{assigned['callsign']}`) — *{assigned['role']}*\n"
            matched_str = ', '.join(context_bundle.get('matched_skills', [])) or 'General SRE Infrastructure'
            hcm_block += f"- **Technical Fit:** {matched_str} (**{context_bundle.get('fit_score', 85)}% Match**)\n"
            hcm_block += f"- **Workload Allocation:** `{assigned['capacity_before']}%` ➔ `{assigned['capacity_after']}%` capacity ({context_bundle.get('remaining_headroom', 0)}% headroom remaining)\n"
            if wellbeing_alert:
                hcm_block += f"- ⚠️ **Wellbeing Alert ({wellbeing_alert['level']}):** {wellbeing_alert['message']}\n  *Action:* {wellbeing_alert['recommendation']}\n"
            else:
                hcm_block += "- 🟢 **Wellbeing Safeguard:** Capacity within safe operational threshold (<85%).\n"

            # Append to decision text
            decision_text += hcm_block

        # Check if the unmonitored service rule was triggered
        if "outside of our monitored systems" in decision_text:
            # Extract the generated ticket ID
            ticket_match = re.search(r'(INC-\d+)', decision_text)
            ticket_id = ticket_match.group(1) if ticket_match else "INC-9999"
            
            # Create tickets directory
            tickets_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tickets")
            os.makedirs(tickets_dir, exist_ok=True)
            
            # Save the ticket as a markdown file with complete contextual handoff
            filepath = os.path.join(tickets_dir, f"{ticket_id}.md")
            with open(filepath, "w") as f:
                f.write(f"# Escalated Incident Ticket: {ticket_id}\n\n")
                f.write(f"**Original User Request:** {state['user_request']}\n\n")
                f.write(f"**Status:** Unmonitored System - Manual Investigation Required\n\n")
                if assigned:
                    f.write(f"**Assigned Operative:** {assigned['name']} ({assigned['callsign']}) - {assigned['role']}\n\n")
                f.write(f"**Agent Decision & Contextual Handoff:**\n{decision_text}\n")
                
            logger.info(f"Created out-of-context markdown ticket at {filepath}")
        
        state["decision"] = decision_text
        state["workflow_status"] = "Completed"
        
    except Exception as e:
        logger.error(f"Decision Agent failed: {e}")
        state["errors"].append(f"Decision Error: {str(e)}")
        state["workflow_status"] = "Error"
        
    return state