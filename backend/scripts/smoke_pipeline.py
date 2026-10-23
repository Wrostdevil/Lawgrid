"""Offline smoke test for the LangGraph pipeline.

Run from the backend directory:
    .venv\\Scripts\\python.exe scripts\\smoke_pipeline.py

It intentionally does not require Groq, Sarvam, Qdrant or Supabase. If those
keys are absent, the pipeline uses deterministic fallbacks, so this is a good
first check that the installation is healthy.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Make the smoke test deterministic unless the caller explicitly supplies keys.
os.environ.pop("GROQ_API_KEY", None)
os.environ.pop("SARVAM_API_KEY", None)

from orchestrator import build_nyaya_graph  # noqa: E402


def main() -> int:
    case = {
        "case_id": "smoke-fallback-001",
        "raw_narrative": (
            "On 15 January 2024 I bought a Sony TV for Rs 65,000 from a shop in "
            "Mumbai, Maharashtra. After three days the screen went black. The shop "
            "refused a refund despite the warranty. I have the invoice and a video "
            "of the defect. I want a full refund or replacement."
        ),
        "language_preference": "english",
        "state_jurisdiction": "Maharashtra",
        "uploaded_files": [],
    }

    result = build_nyaya_graph().invoke(
        {
            "case_state": case,
            "mode": "citizen",
            "intake_status": "pending",
            "force_complete": False,
        }
    )

    state = result.get("case_state", {})
    facts = state.get("structured_facts") or {}
    mapping = state.get("legal_mapping") or {}
    plan = state.get("action_plan") or {}
    docs = state.get("generated_documents") or {}

    print("intake_status:", result.get("intake_status"))
    print("incident_type:", facts.get("incident_type"))
    print("case_title:", facts.get("case_title"))
    print("standing:", mapping.get("legal_standing_score"))
    print(
        "sections:",
        len(mapping.get("applicable_sections") or [])
        + len(mapping.get("bns_bnss_sections") or []),
    )
    print("forum:", plan.get("forum_selection"))
    print("documents:", [name for name, doc in docs.items() if doc])
    print("flags:", state.get("human_review_flags"))

    if result.get("intake_status") != "complete":
        print("FAILED: pipeline did not complete", file=sys.stderr)
        return 1
    if not facts.get("incident_summary"):
        print("FAILED: no incident summary", file=sys.stderr)
        return 1
    if not (mapping.get("applicable_sections") or mapping.get("bns_bnss_sections")):
        print("FAILED: no legal sections", file=sys.stderr)
        return 1
    if not any(docs.values()):
        print("FAILED: no documents", file=sys.stderr)
        return 1

    print("\nSMOKE TEST PASSED")
    print(json.dumps(facts, indent=2, default=str)[:1200])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
