"""
agent5_explainability.py — NyayAI Explainability Agent

Integration contract:
    Reads:       ALL CaseState fields (read-only — never modifies other agents' outputs)
    Writes:      reasoning_trace
    Appends to:  agent_trace, case_timeline
    Never touches: action_plan, generated_documents, legal_mapping, structured_facts
"""

import time
from datetime import datetime, timezone


def explainability_agent(case_state: dict, mode: str = "citizen") -> dict:

    start = time.time()

    facts = case_state.get("structured_facts", {})
    mapping = case_state.get("legal_mapping", {})
    plan = case_state.get("action_plan", {})
    docs = case_state.get("generated_documents")
    ev = case_state.get("evidence_inventory", [])
    all_traces = case_state.get("agent_trace", [])

    # ── Per-section confidence from Agent 2 ──────────────────────────────────

    all_sections = mapping.get("applicable_sections", []) + mapping.get("bns_bnss_sections", [])

    per_section_confidence = [
        {
            "section_ref": s.get("section_ref", "") if isinstance(s, dict) else str(s),
            "confidence": s.get("confidence", "medium") if isinstance(s, dict) else "medium",
            "reason": (s.get("description") if isinstance(s, dict) else str(s))
            or f"Retrieved by Agent 2 for {facts.get('incident_type','this dispute')}",
        }
        for s in all_sections
    ]

    # ── Citations ─────────────────────────────────────────────────────────────

    if mode == "lawyer":
        citations = [
            f"Case Law: {c.get('citation')} - {c.get('summary')}" if isinstance(c, dict) else str(c)
            for c in mapping.get("landmark_cases", [])
        ]
        
        for xref in mapping.get("ipc_crpc_crossref", []):
            if isinstance(xref, dict):
                citations.append(
                    f"Reference: {xref.get('old_ref')} ({xref.get('act_old')}) -> "
                    f"NOW ENFORCED AS {xref.get('new_ref')} ({xref.get('act_new')})"
                )
    else:
        citations = [
            f"{s.get('section_ref')} — {s.get('act_name')}" if isinstance(s, dict) else str(s)
            for s in all_sections
        ]
    
        for xref in mapping.get("ipc_crpc_crossref", []):
            if isinstance(xref, dict):
                citations.append(
                    f"{xref.get('old_ref')} ({xref.get('act_old')}) -> "
                    f"{xref.get('new_ref')} ({xref.get('act_new')})"
                )

    # ── Agent logs ───────────────────────────────────────────────────────────

    parties = facts.get("parties", [])

    complainant = next(
        (p.get("name") for p in parties if isinstance(p, dict) and p.get("role") == "complainant"),
        "Complainant"
    )

    agent_logs = [
        (
            f"[Agent 1 - Intake] Dispute: {facts.get('incident_type','unknown')}. "
            f"Complainant: {complainant}. "
            f"Urgency: {facts.get('urgency_level','standard')}. "
            f"Facts extracted: {len(facts.get('key_facts',[]))}. "
            f"Evidence items: {len(ev)}."
        ),
        (
            f"[Agent 2 - Research] Sections retrieved: {len(all_sections)}. "
            f"Legal standing: {mapping.get('legal_standing_score','moderate')}. "
            f"State: {case_state.get('state_jurisdiction','unknown')}."
        ),
    ]

    # ── Agent 3 reasoning ────────────────────────────────────────────────────

    strategy_trace = next(
        (e for e in all_traces if isinstance(e, dict) and e.get("agent") == "strategy"),
        {}
    )

    s_reasoning = strategy_trace.get("reasoning", {})

    agent_logs.append(
        f"[Agent 3 - Strategy] Forum: {plan.get('forum_selection','N/A')}. "
        f"Lawyer flag: {plan.get('lawyer_recommended',False)}. "
        f"Docs required: {plan.get('document_types_required',[])}."
    )

    # ── Agent 4 document inspection ──────────────────────────────────────────

    generated_keys = []

    if docs:
        itr = docs.model_fields.keys() if hasattr(docs, "model_fields") else docs.keys()
        for k in itr:
            v = getattr(docs, k) if hasattr(docs, "model_fields") else docs.get(k)
            if v is not None:
                generated_keys.append(k)

    drafting_trace = next(
        (e for e in all_traces if isinstance(e, dict) and e.get("agent") == "drafting"),
        {}
    )

    fallback_count = 0

    if docs:
        for k in generated_keys:
            doc_obj = getattr(docs, k) if hasattr(docs, "model_fields") else docs.get(k)
            if doc_obj:
                agent_logs.append(f"Document Generated: {k}")

    agent_logs.append(
        f"[Agent 4 - Drafting] Documents generated: {generated_keys}. "
        f"Fallbacks used: {fallback_count}. "
        f"Duration: {drafting_trace.get('duration_ms','N/A')}ms."
    )

    # ── Overall confidence ───────────────────────────────────────────────────

    conf_scores = [s.get("confidence","medium") if isinstance(s, dict) else "medium" for s in all_sections]
    standing = mapping.get("legal_standing_score","moderate")

    if all(c == "high" for c in conf_scores) and standing == "strong":
        overall = "high"
    elif any(c == "low" for c in conf_scores) or standing == "weak":
        overall = "low"
    else:
        overall = "medium"

    # ── Legal standing breakdown ─────────────────────────────────────────────

    parts = []

    if standing:
        parts.append(f"Legal standing: {standing.upper()} (assessed by Agent 2)")

    forum_basis = s_reasoning.get("forum_selection_basis") or plan.get("forum_selection_reason")

    if forum_basis:
        parts.append(f"Forum rationale: {forum_basis}")

    if plan.get("lawyer_recommended") and plan.get("lawyer_recommended_reason"):
        parts.append(f"Lawyer recommended: {plan.get('lawyer_recommended_reason')}")

    if plan.get("mediation_recommended") and plan.get("mediation_reason"):
        parts.append(f"Mediation: {plan.get('mediation_reason')}")

    legal_standing_breakdown = " | ".join(parts) or "See action plan for reasoning."

    # ── Human-Friendly Analysis Phases ────────────────────────────────────────
    
    # Phase 2 Description:
    law_count = len(all_sections)
    if law_count > 0:
        law_desc = f"We matched your case against {law_count} relevant legal sections and past court precedents."
    else:
        law_desc = "We've identified your general legal issue, but we need more details to name the exact law section."

    # Phase 4 Description:
    doc_count = len(generated_keys)
    if doc_count > 0:
        doc_desc = f"We drafted {doc_count} customized legal documents for your case."
    else:
        doc_desc = "Once we have enough details and evidence, we will automatically draft your legal documents here."

    analysis_phases = [
        {
            "title": "Understanding Your Story",
            "description": f"We identified {len(facts.get('key_facts', []))} key facts and categorized your dispute as '{facts.get('incident_type','General Legal')}'.",
            "icon": "🔍",
            "status": "complete" if facts else "pending"
        },
        {
            "title": "Searching the Law",
            "description": law_desc,
            "icon": "📚",
            "status": "complete" if mapping else "pending"
        },
        {
            "title": "Building Your Strategy",
            "description": f"We determined the best forum ({plan.get('forum_selection','N/A')}) and mapped out your next steps.",
            "icon": "⚖️",
            "status": "complete" if plan else "pending"
        },
        {
            "title": "Preparing Your Documents",
            "description": doc_desc,
            "icon": "📝",
            "status": "complete" if generated_keys else "pending"
        }
    ]

    # ── Scoring Factors (Basis for the 1-5 score) ─────────────────────────────

    fact_count = len(facts.get("key_facts", []))
    ev_count = len(ev)
    
    scoring_factors = {
        "details": "High" if fact_count > 10 else "Medium" if fact_count > 4 else "Low",
        "evidence": "Complete" if ev_count > 2 else "Partial" if ev_count > 0 else "None",
        "law": "High" if standing == "strong" else "Moderate" if standing == "moderate" else "Complex"
    }

    # ── Write reasoning_trace ────────────────────────────────────────────────

    case_state["reasoning_trace"] = {
        "per_section_confidence": per_section_confidence,
        "agent_logs": agent_logs,
        "citations": citations,
        "overall_confidence": overall,
        "legal_standing_breakdown": legal_standing_breakdown,
        "analysis_phases": analysis_phases,
        "scoring_factors": scoring_factors,
    }

    # ── Logging ──────────────────────────────────────────────────────────────

    duration_ms = int((time.time() - start) * 1000)

    now = datetime.now(timezone.utc).isoformat()

    case_state.setdefault("agent_trace", []).append({
        "agent": "explainability",
        "timestamp": now,
        "action": "generated_reasoning_trace",
        "duration_ms": duration_ms
    })

    case_state.setdefault("case_timeline", []).append({
        "event": "Explainability agent completed",
        "timestamp": now,
        "actor": "agent"
    })

    return case_state