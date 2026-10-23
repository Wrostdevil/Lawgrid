from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal
import io
import uuid
import os
import sys
import shutil
from pathlib import Path
from dotenv import load_dotenv

# Load the root .env first, then backend/.env (without overriding real env vars).
_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR.parent / ".env", override=False)
load_dotenv(_BACKEND_DIR / ".env", override=False)

# Setup paths to ensure we can import from agents and schemas
sys.path.append(str(_BACKEND_DIR / "agents"))
sys.path.append(str(_BACKEND_DIR / "schemas"))

from orchestrator import build_nyaya_graph
from app.core.config import settings
from app.services.legal_graph_service import legal_graph_service
from app.services.legal_updates_service import legal_updates_service
from retrieval import get_domain_topic_sections
import json
import sqlite3
from datetime import datetime
from app.core.auth import (
    get_current_citizen,
    require_auth_if_enabled,
)
from app.core.supabase import supabase_admin, require_supabase_admin

app = FastAPI(title="LawGrid API", version="4.1.0")

_origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Model for Intake
class IntakeRequest(BaseModel):
    case_id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    raw_narrative: str
    language_preference: Literal["hindi", "english", "hinglish"] = "english"
    state_jurisdiction: Optional[str] = None
    mode: Literal["citizen", "lawyer"] = "citizen"
    file_paths: Optional[list[str]] = []


class DomainTopicsRequest(BaseModel):
    domain: str = Field(min_length=1, max_length=100)
    per_topic_limit: int = Field(default=5, ge=1, le=12)


class DomainTopicItem(BaseModel):
    title: str
    explanation: str
    source_section: str
    score: Optional[float] = None
    is_fallback: bool = False


class DomainTopicsResponse(BaseModel):
    domain: str
    topics: list[DomainTopicItem]


class LegalUpdateItem(BaseModel):
    title: str
    short_summary: str
    source: str
    link: str
    published_at: str


class LegalUpdatesResponse(BaseModel):
    updates: list[LegalUpdateItem]
    mode: str
    fetched_at: str


class AcceptOfferRequest(BaseModel):
    pipeline_id: str
    case_id: str

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "4.1.0",
        "app": settings.APP_NAME,
        "ai_mode": "groq" if settings.GROQ_API_KEY else "local_fallback",
        "groq_configured": bool(settings.GROQ_API_KEY),
        "sarvam_configured": bool(settings.SARVAM_API_KEY),
        "qdrant_configured": bool(settings.QDRANT_URL),
        "supabase_configured": bool(
            settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY
        ),
        "auth_required": settings.AUTH_REQUIRED,
    }


@app.get("/")
async def root():
    return {"name": "LawGrid API", "docs": "/docs", "health": "/health"}


@app.get("/legal-graph/health")
async def legal_graph_health():
    return legal_graph_service.health()


@app.get("/legal-graph/acts/{act_name}/chapters")
async def legal_graph_chapters(act_name: str):
    neo4j_health = legal_graph_service.health()
    return {
        "act_name": act_name,
        "chapters": legal_graph_service.get_chapters_under_act(act_name),
        "neo4j": neo4j_health,
    }


@app.get("/legal-graph/acts/{act_name}/chapters/{chapter_number}/sections")
async def legal_graph_sections(act_name: str, chapter_number: str):
    neo4j_health = legal_graph_service.health()
    return {
        "act_name": act_name,
        "chapter_number": chapter_number,
        "sections": legal_graph_service.get_sections_under_chapter(act_name, chapter_number),
        "neo4j": neo4j_health,
    }


@app.get("/legal-graph/acts/{act_name}/sections/{section_number}")
async def legal_graph_section_detail(act_name: str, section_number: str):
    neo4j_health = legal_graph_service.health()
    if not neo4j_health.get("available", False):
        return {
            "act_name": act_name,
            "section_number": section_number,
            "section": None,
            "neo4j": neo4j_health,
        }

    section = legal_graph_service.get_section_by_number(act_name, section_number)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return section

@app.get("/download/{filename}")
async def download_file(filename: str):
    safe_name = Path(filename).name
    filepath = (OUTPUT_DIR / safe_name).resolve()
    if OUTPUT_DIR.resolve() not in filepath.parents:
        raise HTTPException(status_code=404, detail="File not found")
    if not filepath.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(filepath), filename=safe_name)


@app.post("/legal/domain-topics", response_model=DomainTopicsResponse)
async def legal_domain_topics(request: DomainTopicsRequest):
    try:
        topics = get_domain_topic_sections(request.domain, per_topic_limit=request.per_topic_limit)
        return DomainTopicsResponse(domain=request.domain, topics=topics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve domain topics: {str(e)}")


@app.get("/explorer/legal-updates", response_model=LegalUpdatesResponse)
async def explorer_legal_updates(limit: int = Query(default=8, ge=5, le=10)):
    try:
        payload = await legal_updates_service.get_updates_payload(limit=limit)
        return LegalUpdatesResponse(**payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve legal updates: {str(e)}")

# Initialize the LangGraph
nyaya_graph = build_nyaya_graph()

import traceback
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory store: tracks full CaseState and follow-up count per case_id
# This allows for a stateful conversation where context is accumulated.
_case_store: dict[str, dict] = {}
_case_rounds: dict[str, int] = {}
MAX_FOLLOWUP_ROUNDS = 2

# --- Database Setup ---
DB_PATH = _BACKEND_DIR / "nyayai_cases.db"
UPLOAD_DIR = _BACKEND_DIR / "uploads"
OUTPUT_DIR = _BACKEND_DIR / "output_docs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = max(1, settings.MAX_UPLOAD_SIZE_MB) * 1024 * 1024
ALLOWED_UPLOAD_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx", ".txt",
}

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS cases
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  case_id TEXT UNIQUE,
                  user_id TEXT,
                  title TEXT,
                  description TEXT,
                  domain TEXT,
                  date TEXT,
                  status TEXT,
                  metadata_json TEXT)''')
    # Add user_id to databases created before this column existed.
    try:
        c.execute("ALTER TABLE cases ADD COLUMN user_id TEXT")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()

init_db()

def save_case_to_db(case_data: dict):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    facts = case_data.get("structured_facts") or {}
    case_id = case_data.get("case_id")
    title = (
        facts.get("case_title")
        or str(facts.get("incident_type") or "Untitled Case").replace("_", " ").title()
    )
    description = facts.get("incident_summary") or "No summary available."
    domain = str(facts.get("incident_type") or "General").replace("_", " ").title()
    date = datetime.now().strftime("%b %d, %Y")
    status = "Analysis Complete"
    metadata_json = json.dumps(case_data, default=str)
    user_id = case_data.get("user_id")

    try:
        c.execute('''INSERT OR REPLACE INTO cases
                     (case_id, user_id, title, description, domain, date, status, metadata_json)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                  (case_id, user_id, title, description, domain, date, status, metadata_json))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Database error: {e}")
        return False
    finally:
        conn.close()

def delete_case_from_local_db(case_id: str):
    """Deletes a case record from the local SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("DELETE FROM cases WHERE case_id = ?", (case_id,))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error deleting case from SQLite: {e}")
        return False
    finally:
        conn.close()

def get_all_cases(user_id: Optional[str] = None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if user_id:
        c.execute("SELECT * FROM cases WHERE user_id = ? ORDER BY id DESC", (user_id,))
    else:
        c.execute("SELECT * FROM cases ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_case_by_id(case_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        return None
    
    case_dict = dict(row)
    # Parse the metadata_json to return full analysis
    if case_dict.get('metadata_json'):
        try:
            case_dict['analysis'] = json.loads(case_dict['metadata_json'])
        except json.JSONDecodeError:
            case_dict['analysis'] = None
    
    return case_dict

@app.post("/upload")
async def upload_files(
    files: list[UploadFile] = File(...),
    _user=Depends(require_auth_if_enabled),
):
    saved_paths = []
    for file in files:
        if not file.filename:
            continue
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext or 'unknown'}",
            )

        contents = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"{file.filename} exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
            )
        if not contents:
            continue

        unique_name = f"{uuid.uuid4()}{file_ext}"
        target_path = UPLOAD_DIR / unique_name
        target_path.write_bytes(contents)
        saved_paths.append(str(target_path))

    return {"file_paths": saved_paths}

@app.delete("/cases/{case_id}")
async def delete_case(
    case_id: str,
    user=Depends(require_auth_if_enabled),
):
    """Performs a complete wipeout of a case: files, SQLite record, and memory."""
    logger.info(f"Complete wipeout requested for case: {case_id}")

    case_data = get_case_by_id(case_id)
    if not case_data:
        raise HTTPException(status_code=404, detail="Case not found")

    if (
        settings.AUTH_REQUIRED
        and user
        and case_data.get("user_id")
        and case_data.get("user_id") != user.get("sub")
    ):
        raise HTTPException(status_code=403, detail="Not allowed to delete this case")

    # 1. Delete only files that live inside the application's upload directory.
    if case_data.get('metadata_json'):
        try:
            full_metadata = json.loads(case_data['metadata_json'])
            files_to_delete = (
                full_metadata.get('uploaded_files', [])
                or full_metadata.get('file_paths', [])
            )
            upload_root = UPLOAD_DIR.resolve()
            for f_path in files_to_delete:
                p = Path(f_path).resolve()
                if p.is_relative_to(upload_root) and p.exists():
                    p.unlink()
                    logger.info(f"Deleted upload: {f_path}")

            # Also remove generated drafts for this case.
            generated = full_metadata.get("generated_documents") or {}
            output_root = OUTPUT_DIR.resolve()
            seen_files = set()
            if isinstance(generated, dict):
                for doc in generated.values():
                    if not isinstance(doc, dict):
                        continue
                    for key in ("docx_url", "pdf_url"):
                        raw_path = doc.get(key)
                        if not raw_path:
                            continue
                        p = (output_root / Path(str(raw_path)).name).resolve()
                        if (
                            p.is_relative_to(output_root)
                            and p.exists()
                            and p not in seen_files
                        ):
                            p.unlink()
                            seen_files.add(p)
                            logger.info(f"Deleted generated draft: {p.name}")
        except Exception as e:
            logger.error(f"Error scrubbing files for case {case_id}: {e}")

    # 2. Delete from SQLite
    db_success = delete_case_from_local_db(case_id)

    # 3. Clear in-memory state
    _case_store.pop(case_id, None)
    _case_rounds.pop(case_id, None)

    if not db_success:
        raise HTTPException(status_code=500, detail="Failed to delete case from local database.")

    return {"status": "success", "message": f"Case {case_id} and all associated data wiped out."}

@app.post("/analyze")
async def analyze_case(
    request: IntakeRequest,
    user=Depends(require_auth_if_enabled),
):
    try:
        # Use provided case_id or generate a new one if it's a fresh start
        case_id = request.case_id or str(uuid.uuid4())
        user_id = user.get("sub") if user else None

        # Only allow files that were uploaded through this API. Never let a
        # caller make the intake agent read an arbitrary local path.
        upload_root = UPLOAD_DIR.resolve()
        for raw_path in request.file_paths or []:
            candidate = Path(raw_path).resolve()
            if not candidate.is_relative_to(upload_root) or not candidate.is_file():
                raise HTTPException(
                    status_code=400,
                    detail="One or more attachments are invalid. Upload the file again.",
                )

        # 1. Retrieve from memory, then from SQLite after a restart.
        existing_state = _case_store.get(case_id)
        if not existing_state:
            stored = get_case_by_id(case_id)
            if stored and stored.get("analysis"):
                existing_state = stored["analysis"]

        if (
            existing_state
            and settings.AUTH_REQUIRED
            and user_id
            and existing_state.get("user_id")
            and existing_state.get("user_id") != user_id
        ):
            raise HTTPException(status_code=403, detail="Not allowed to access this case")

        round_count = _case_rounds.get(case_id, 0) + 1
        _case_rounds[case_id] = round_count

        # 2. Accumulate narrative if state exists
        if existing_state:
            old_narrative = existing_state.get("raw_narrative", "")
            if request.raw_narrative:
                existing_state["raw_narrative"] = (
                    f"{old_narrative}\n\nUser: {request.raw_narrative}"
                    if old_narrative else request.raw_narrative
                )

            if request.file_paths:
                existing_files = existing_state.get("uploaded_files", []) or []
                existing_state["uploaded_files"] = existing_files + request.file_paths

            if user_id:
                existing_state["user_id"] = user_id
            if request.state_jurisdiction:
                existing_state["state_jurisdiction"] = request.state_jurisdiction
            if request.language_preference:
                existing_state["language_preference"] = request.language_preference

            existing_state["intake_status"] = "collecting_info"
            existing_state["follow_up_questions"] = []
            current_case_state = existing_state
        else:
            current_case_state = {
                "case_id": case_id,
                "user_id": user_id,
                "raw_narrative": request.raw_narrative,
                "language_preference": request.language_preference,
                "state_jurisdiction": request.state_jurisdiction,
                "uploaded_files": request.file_paths or [],
            }

        # 3. Determine if we should force completion
        force_complete = round_count > MAX_FOLLOWUP_ROUNDS
        logger.info(
            "Case %s: round %s of %s%s",
            case_id,
            round_count,
            MAX_FOLLOWUP_ROUNDS,
            " (forcing completion)" if force_complete else "",
        )

        # 4. Prepare graph input
        initial_graph_state = {
            "case_state": current_case_state,
            "mode": request.mode,
            "intake_status": "pending",
            "force_complete": force_complete,
        }

        # 5. Invoke the graph
        final_output = nyaya_graph.invoke(initial_graph_state)
        final_state = final_output.get("case_state")
        if not final_state:
            raise HTTPException(status_code=500, detail="Pipeline returned no case state")

        # 6. Persist to memory and SQLite immediately, so cases are not lost on
        # restart and do not depend on the user clicking "download".
        _case_store[case_id] = final_state
        persisted = save_case_to_db(final_state)
        final_output["persisted"] = persisted

        return final_output
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in analyze_case: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save_case/{case_id}")
async def save_case(
    case_id: str,
    user=Depends(require_auth_if_enabled),
):
    case_data = _case_store.get(case_id)
    if not case_data:
        stored = get_case_by_id(case_id)
        case_data = stored.get("analysis") if stored else None
    if not case_data:
        raise HTTPException(status_code=404, detail="Case not found")

    if (
        settings.AUTH_REQUIRED
        and user
        and case_data.get("user_id")
        and case_data.get("user_id") != user.get("sub")
    ):
        raise HTTPException(status_code=403, detail="Not allowed to save this case")

    success = save_case_to_db(case_data)
    if success:
        return {"status": "success", "message": "Case saved to dashboard"}
    raise HTTPException(status_code=500, detail="Failed to save case to database")

@app.get("/cases")
async def list_cases(user=Depends(require_auth_if_enabled)):
    user_id = user.get("sub") if user else None
    cases = get_all_cases(user_id=user_id)
    return {"cases": cases}

@app.get("/cases/{case_id}")
async def get_case_analysis(
    case_id: str,
    user=Depends(require_auth_if_enabled),
):
    case = get_case_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if (
        settings.AUTH_REQUIRED
        and user
        and case.get("user_id")
        and case.get("user_id") != user.get("sub")
    ):
        raise HTTPException(status_code=403, detail="Not allowed to access this case")
    return case


@app.post("/pipeline/accept-offer")
async def accept_offer_secure(
    request: AcceptOfferRequest,
    user=Depends(get_current_citizen),
):
    citizen_id = user.get("sub")
    if not citizen_id:
        raise HTTPException(status_code=401, detail="Invalid auth token")

    try:
        admin = require_supabase_admin()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        pipeline_res = (
            admin
            .table("case_pipeline")
            .select("id, case_id, lawyer_id, stage, offer_amount")
            .eq("id", request.pipeline_id)
            .maybe_single()
            .execute()
        )
        pipeline_row = pipeline_res.data

        if not pipeline_row:
            raise HTTPException(status_code=404, detail="Offer not found")

        if pipeline_row.get("case_id") != request.case_id:
            raise HTTPException(status_code=409, detail="Offer does not belong to this case")

        if pipeline_row.get("stage") != "offered":
            raise HTTPException(status_code=409, detail="Offer is no longer pending")

        case_res = (
            admin
            .table("cases")
            .select("id, title, citizen_id, status")
            .eq("id", request.case_id)
            .maybe_single()
            .execute()
        )
        case_row = case_res.data

        if not case_row:
            raise HTTPException(status_code=404, detail="Case not found")

        if case_row.get("citizen_id") != citizen_id:
            raise HTTPException(status_code=403, detail="You are not allowed to accept offers for this case")

        if case_row.get("status") in ["lawyer_matched", "active", "completed"]:
            raise HTTPException(status_code=409, detail="Case is already matched")

        now_iso = datetime.utcnow().isoformat()

        accepted_res = (
            admin
            .table("case_pipeline")
            .update({"stage": "accepted", "accepted_at": now_iso})
            .eq("id", request.pipeline_id)
            .execute()
        )

        (
            admin
            .table("case_pipeline")
            .update({"stage": "withdrawn"})
            .eq("case_id", request.case_id)
            .eq("stage", "offered")
            .neq("id", request.pipeline_id)
            .execute()
        )

        (
            admin
            .table("cases")
            .update({
                "status": "lawyer_matched",
                "lawyer_matched_at": now_iso,
                "is_seeking_lawyer": False,
            })
            .eq("id", request.case_id)
            .execute()
        )

        lawyer_id = pipeline_row.get("lawyer_id")
        if lawyer_id:
            amount = pipeline_row.get("offer_amount")
            amount_suffix = f" (Offer: INR {int(amount):,})" if isinstance(amount, (int, float)) else ""
            (
                admin
                .table("notifications")
                .insert({
                    "user_id": lawyer_id,
                    "type": "offer_accepted",
                    "title": "Your offer was accepted",
                    "body": f"{case_row.get('title') or 'A case'} has accepted your offer{amount_suffix}.",
                    "data": {
                        "case_id": request.case_id,
                        "pipeline_id": request.pipeline_id,
                        "lawyer_id": lawyer_id,
                    },
                })
                .execute()
            )

        return {
            "success": True,
            "pipeline": accepted_res.data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Secure offer accept failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to accept offer")


@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    _user=Depends(require_auth_if_enabled),
):
    """Accept an audio file and return its Sarvam STT transcription."""
    try:
        sarvam_key = os.environ.get("SARVAM_API_KEY")
        if not sarvam_key:
            raise HTTPException(
                status_code=503,
                detail="Voice transcription is unavailable: SARVAM_API_KEY is not configured.",
            )

        contents = await file.read(MAX_UPLOAD_BYTES + 1)
        if not contents:
            raise HTTPException(status_code=400, detail="Empty audio file")
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Audio file exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
            )

        from sarvamai import SarvamAI
        client = SarvamAI(api_subscription_key=sarvam_key)

        audio_file = io.BytesIO(contents)
        audio_file.name = file.filename or "recording.webm"

        response = client.speech_to_text.transcribe(
            file=audio_file,
            model="saaras:v3",
            mode="transcribe",
        )

        transcript = getattr(response, "transcript", None)
        if transcript is None and isinstance(response, dict):
            transcript = response.get("transcript", "")
        if transcript is None:
            transcript = str(response)

        return {"text": transcript}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
