<div align="center">

# ⚖️ LawGrid

### *Intelligent Legal Assistance & Dual-Sided Advocate Marketplace for the Indian Legal System*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.1.9-FF6F00?style=for-the-badge)](https://langchain-ai.github.io/langgraph/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

<p align="center">
  <b>LawGrid brings affordable, court-ready legal intelligence to every Indian citizen while giving advocates an AI-powered practice dashboard and qualified client pipeline. Grounded in the new Bharatiya Nyaya Sanhita (BNS) & legacy Indian jurisprudence.</b>
</p>

[1. How It Works](#1--how-lawgrid-works) •
[2. Architecture](#2--system--agentic-architecture) •
[3. How to Run LawGrid](#3-how-to-run-lawgrid) •
[Project Structure](#4--project-structure) •
[API Reference](#5--api-reference) •
[Troubleshooting](#6--troubleshooting--common-gotchas)

---

</div>

## 📌 Executive Summary

India's legal framework underwent a historic overhaul in 2023–2024: the **Bharatiya Nyaya Sanhita (BNS)**, **Bharatiya Nagarik Suraksha Sanhita (BNSS)**, and **Bharatiya Sakshya Adhiniyam (BSA)** replaced the British-era IPC (1860), CrPC (1973), and Indian Evidence Act (1872).

For everyday citizens, understanding rights, drafting formal legal notices, or hiring an affordable lawyer is intimidating and costly. For advocates, acquiring new clients outside personal networks and manually cross-referencing new BNS provisions against decades of IPC precedent is time-consuming.

**LawGrid** solves both sides of this equation through a **5-stage multi-agent AI pipeline (built with LangGraph)** and a **dual-sided marketplace (built with Next.js and Supabase)**.

---

# 1. 💡 How LawGrid Works

LawGrid functions like a virtual digital law firm that works for both **Citizens** and **Advocates**. Here is how the end-to-end journey works in plain English:

### A. The Citizen Journey (Seeking Legal Help)

```
[Citizen Input]               [AI Analysis]                [Actionable Output]          [Marketplace]
Voice / Text / OCR   ───►  5 AI Agents Analyze  ───►  Score: 4.2 / 5 (Strong)  ───►  Connect with
in Hindi / English         BNS, Laws, Evidence        Download Notice (.docx)       Verified Lawyers
```

1. **Speak or Type in Any Language:**
   - A citizen describes their issue by typing (English, Hindi, or Hinglish) or speaking directly into the microphone. Voice is transcribed using **Sarvam AI's Indic Speech Model** (`saaras:v3`).
   - If they have evidence (e.g., a purchase invoice, tenancy contract, or police complaint receipt), they upload an image or PDF. **Tesseract OCR** automatically reads the text and extracts key dates, amounts, and party names.
2. **Interactive AI Clarification:**
   - If key information is missing (e.g., date of purchase, warranty terms, or location), Agent 1 pauses and asks polite follow-up questions just like an intake clerk at a law firm.
3. **Automated Legal Merit Scoring:**
   - The platform calculates a **3-Factor Case Strength Score (1 to 5)**:
     - **Fact Detail:** Did the user provide enough specific dates, names, and timeline details?
     - **Evidence Quality:** Are there tangible documents, receipts, or FIR copies attached?
     - **Legal Standing:** Does the incident violate specific sections under BNS, Consumer Protection Act, RERA, or Labour laws?
4. **Instant Court-Ready Drafting:**
   - In seconds, the platform drafts ready-to-use documents:
     - Legal Notices to opposite parties
     - Consumer Forum Complaints
     - RTI (Right to Information) Applications
   - The citizen can preview and download these as formatted **Microsoft Word (`.docx`)** or **PDF** files with formal court formatting.
5. **Connecting with Matched Advocates:**
   - If the case requires court appearance or lawyer representation, the citizen publishes the case to the **LawGrid Marketplace** with one click.
   - Nearby, verified lawyers specializing in that exact field (e.g., Consumer Law, Cybercrime, Property) can review the case brief and submit representation offers.
   - The citizen reviews lawyer ratings, reviews, and fee quotes, and accepts their preferred advocate.

---

### B. The Advocate Journey (Managing Practice & Research)

```
[Marketplace Feed]           [Pre-Screened Brief]           [Legal Explorer]           [Representation]
Receive Qualified     ───►  Review Facts, Laws,    ───►  Explore BNS/IPC    ───►  Submit Quote &
Client Inquiries            Evidence Summary              Knowledge Graph           Accept Engagement
```

1. **Qualified Inbound Pipeline:**
   - Instead of receiving cold, confused phone calls, advocates see a dashboard of pre-screened cases categorized by legal domain (e.g., Tenant Disputes, Cheque Bounce, Domestic Violence, BNS Offences).
2. **AI Pre-Consultation Briefs:**
   - Each case card includes an AI-prepared executive summary, timeline of events, list of available evidence, and the applicable statutory sections. This cuts initial consultation time by 75%.
3. **Lawyer Legal Explorer:**
   - Advocates access a dedicated legal research engine backed by a **Neo4j Knowledge Graph**. They can navigate statutes by Act → Chapter → Section, view statutory punishments, and cross-reference new BNS sections with legacy IPC citations.
4. **Real-Time Legal Updates:**
   - The dashboard streams verified daily legal updates, landmark Supreme Court rulings, and High Court notifications.

---

# 2. 🏛️ System & Agentic Architecture

LawGrid combines a modern web frontend, a high-performance Python API backend, an autonomous multi-agent reasoning graph, and specialized databases.

### High-Level System Architecture Diagram

```mermaid
graph TB
    subgraph Client Layer
        Web["Next.js 16 Web App (React 19, TypeScript)"]
        Mobile["Responsive Mobile PWA"]
    end

    subgraph API & Gateway Layer
        FastAPI["FastAPI Backend (Python 3.11+)"]
        Auth["Supabase Auth (Citizen & Lawyer Roles)"]
        Voice["Sarvam AI STT API (Indic Voice-to-Text)"]
        OCR["Tesseract OCR Engine (Document Parsing)"]
    end

    subgraph Multi-Agent Engine [LangGraph State Machine]
        A1["Agent 1: Intake Clerk"]
        A2["Agent 2: Statutory Researcher"]
        A3["Agent 3: Legal Strategist"]
        A4["Agent 4: Court Drafter"]
        A5["Agent 5: Plain Explainability"]
    end

    subgraph Data & Storage Layer
        Postgres[("Supabase / PostgreSQL (Cases, Profiles, Offers)")]
        Qdrant[("Qdrant Vector DB (Statutes & Legal Embeddings)")]
        Neo4j[("Neo4j Knowledge Graph (Act-Chapter-Section Hierarchy)")]
        SQLite[("SQLite Cache (Local Fast Persistence)")]
        Redis[("Redis 7 (Celery Broker & Caching)")]
        FS[("Physical File Storage (Uploads & Generated Docs)")]
    end

    Web <-->|REST & WebSocket| FastAPI
    Mobile <-->|REST & WebSocket| FastAPI
    FastAPI <--> Auth
    FastAPI <--> Voice
    FastAPI <--> OCR
    FastAPI <--> Multi-Agent Engine
    
    A1 --> A2 --> A3 --> A4 --> A5
    
    A2 <--> Qdrant
    A2 <--> Neo4j
    FastAPI <--> Postgres
    FastAPI <--> SQLite
    FastAPI <--> Redis
    FastAPI <--> FS
```

---

### The 5 AI Agents Explained (Like a Real Law Firm)

The core reasoning logic is orchestrated with **LangGraph** as a directed cyclic graph with conditional branching:

```mermaid
flowchart LR
    Start([User Query]) --> A1[Agent 1: Intake Clerk]
    A1 -- Facts Incomplete? --> FollowUp([Ask Clarifying Question]) --> End([Wait for User])
    A1 -- Facts Complete --> A2[Agent 2: Legal Researcher]
    A2 --> A3[Agent 3: Legal Strategist]
    A3 -- Weak Claim / No Proof --> A5[Agent 5: Explainability]
    A3 -- Sufficient Merits --> A4[Agent 4: Court Drafter]
    A4 --> A5
    A5 --> Done([Ready: Strategy, Score & Court Documents])
```

| Agent | Real-World Role | What It Does | Technologies / Models |
| :--- | :--- | :--- | :--- |
| **Agent 1: Intake** | *Junior Paralegal* | Gathers the narrative, optionally transcribes audio, extracts text from PDF/DOCX/TXT uploads, extracts structured facts (dates, parties, amounts), and asks follow-ups when details are missing. | Groq (optional), Sarvam (optional), Pydantic, deterministic local extraction |
| **Agent 2: Research** | *Legal Research Associate* | Searches the Indian legal corpus and maps BNS sections to legacy IPC sections. | Qdrant + SentenceTransformers (optional), local curated corpus, Neo4j (optional) |
| **Agent 3: Strategy** | *Senior Advocate* | Scores case merits, selects jurisdiction/forum, checks limitation periods and drafts an action plan. | Groq or Gemini (optional), deterministic rules engine |
| **Agent 4: Drafting** | *Drafting Counsel* | Produces clearly-labelled **draft** legal notices, consumer complaints, FIR drafts and lawyer briefs. | Groq (optional), `python-docx`, `markdown-pdf`, local templates |
| **Agent 5: Explain** | *Client Counselor* | Produces citizen and lawyer explanations, confidence notes and a trace of the decision path. | Deterministic explainability layer |

---

### Databases & Why They Are Used

1. **PostgreSQL / Supabase:** Stores persistent relational records: authenticated user accounts, lawyer verified profiles, active case postings in the marketplace, and bid/offer histories.
2. **Qdrant (Vector Database):** Stores embedded vectors of legal acts and case precedents. When a citizen types a situation in plain English or Hindi, Qdrant runs a semantic similarity search to find relevant statutory sections even if the user didn't use legal words.
3. **Neo4j (Knowledge Graph):** Represents legal relationships as a graph network: `(Act) -[:CONTAINS]-> (Chapter) -[:CONTAINS]-> (Section) -[:PUNISHES]-> (Offence)`. Allows navigating complex cross-references seamlessly.
4. **SQLite:** Zero-latency embedded database used by the FastAPI backend to store rapid session snapshots and case states before the user registers or downloads files.
5. **Redis:** Fast in-memory cache and Celery message broker for background task scheduling (like automated case escalation).

---

# 3. How to Run LawGrid

LawGrid has two supported modes. Start with **Local demo mode** — it needs no API keys,
no Docker and no Supabase project.

| Mode | What you need | What works |
| :--- | :--- | :--- |
| **Local demo** (recommended first run) | Python + Node.js | Chat intake, local legal research, strategy, DOCX/PDF drafts, saved cases, text/PDF/DOCX uploads |
| **Full AI mode** | Local demo + `GROQ_API_KEY` | LLM intake, strategy and drafting; Sarvam adds voice + image OCR |
| **Cloud dashboard mode** | Full AI mode + Supabase project | Login, role routing, cloud case dashboard, lawyer marketplace |

> The backend always starts. Missing keys switch that individual feature to a
> deterministic local fallback instead of crashing the server.

## 3.1 Prerequisites

1. **Python 3.11+** — check with `python --version`.
2. **Node.js 20+** — check with `node --version`.
3. Optional: **Tesseract OCR** for local image text extraction.
4. Optional: **Docker Desktop** only if you want local Qdrant/Neo4j/Postgres/Redis.
   None of these are required for the demo.
5. Optional: a **Supabase** project for login and the marketplace.

## 3.2 One-time setup

### Backend

Open PowerShell in the repository root:

```powershell
# 1. Create your local config (the defaults work as-is)
Copy-Item .env_example .env

# 2. Create and activate a virtual environment
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# If PowerShell blocks activation, run this once in the current window:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# Or skip activation and call .\.venv\Scripts\python.exe directly.

# 3. Install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend

Open a **second** PowerShell window in the repository root:

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm ci
```

`frontend/.env.local.example` already points the frontend at
`http://localhost:8000` and enables demo mode.

## 3.3 Start both servers

**Terminal 1 — backend** (from `backend`):

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — frontend** (from `frontend`):

```powershell
npm run dev
```

Then open:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:8000/health](http://localhost:8000/health)
- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

A correctly configured local demo reports:

```json
{
  "status": "ok",
  "version": "4.1.0",
  "ai_mode": "local_fallback",
  "auth_required": false
}
```

## 3.4 Test the full pipeline

1. Open [http://localhost:3000/citizen/home](http://localhost:3000/citizen/home).
   No login is required in demo mode.
2. Select a language and state, then paste a scenario such as:

   > I bought a Samsung Smart TV for Rs 45,000 from a dealer in Mumbai on
   > 15 January 2024 with a one-year warranty. After five days the display
   > stopped working. The dealer refuses a replacement or refund. I have the
   > invoice and a video of the defect.

3. The response should show extracted facts, relevant sections, a forum,
   an action plan, a case-strength assessment and downloadable **DRAFT FOR
   REVIEW** documents.
4. Open `/citizen/cases` to see the case saved by the backend. Cases are stored
   in `backend/nyayai_cases.db`; drafts are in `backend/output_docs/`.
5. Test uploads with a `.txt`, `.pdf` or `.docx` file. Image OCR needs Sarvam
   (or Tesseract support); without it the text conversation still works.

The backend also has a command-line smoke test that needs no keys or running
server:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\smoke_pipeline.py
```

## 3.5 Enable the AI providers (optional)

Put keys in the root `.env` (or `backend/.env`) and restart the backend:

| Variable | Enables | Without it |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | LLM-based intake, strategy and drafting | Deterministic local intake, rules strategy, template drafts |
| `SARVAM_API_KEY` | Voice transcription and image/document OCR | Text, PDF and DOCX uploads still work locally; `/transcribe` returns 503 |
| `QDRANT_URL` + `QDRANT_API_KEY` | Vector search over your legal corpus | Curated local legal corpus |
| `GEMINI_API_KEY` | Gemini strategy engine, when `STRATEGY_ENGINE=gemini` | Rules strategy engine |

Useful optional settings:

```env
STRATEGY_ENGINE=groq
MAX_UPLOAD_SIZE_MB=20
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

For local Qdrant:

```powershell
docker compose up -d qdrant
# .env
QDRANT_URL=http://localhost:6333
```

> The bundled local legal corpus is intentionally small. It is suitable for
> demos and tests, not for production legal research. Verify every section,
> limitation period and forum before relying on an output.

## 3.6 Enable Supabase login and marketplace (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the Project URL and anon key into **both**:
   - root `.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` (and optionally `SUPABASE_JWT_SECRET`)
   - `frontend/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Set `NEXT_PUBLIC_DEMO_MODE=false` in `frontend/.env.local`.
4. For a shared deployment set `AUTH_REQUIRED=true` in `.env`. Keep it `false`
   only for a single-user local demo.
5. Restart both servers after changing environment variables.

The frontend expects tables such as `cases`, `lawyer_profiles`, `user_roles`,
`case_pipeline` and `notifications`, with Supabase Row Level Security enabled.
If those tables/policies are not present in your project, login can succeed but
the cloud dashboard and marketplace will be empty. The zero-setup local demo
does not use them.

## 3.7 Common problems

| Symptom | Fix |
| :--- | :--- |
| `ModuleNotFoundError: No module named 'agents'` | Run `uvicorn` from the `backend` folder, not the repository root |
| `Cannot reach legal engine at http://localhost:8000` | Start the backend, or set `NEXT_PUBLIC_BACKEND_URL` correctly in `frontend/.env.local` |
| `401 Authentication required` | Either set `AUTH_REQUIRED=false` for local use, or configure Supabase and sign in |
| `503` from `/transcribe` | Set `SARVAM_API_KEY`, or use text input |
| Voice button does nothing | Browser microphone permission is required, and Sarvam must be configured |
| Port 8000/3000 already in use | Stop the other process or start with `--port 8001` and update `NEXT_PUBLIC_BACKEND_URL` |
| PowerShell will not activate `.venv` | Use `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` or call `.\.venv\Scripts\python.exe` directly |
| `npm ci` peer-dependency error | Use Node 20+; then retry `npm ci` |

# 4. 📂 Project Structure

```text
LawGrid/
├── backend/                           # Python FastAPI Application
│   ├── agents/                        # Autonomous LangGraph Agent Implementations
│   │   ├── agent1_intake.py           # Intake agent, OCR processing, structured facts
│   │   ├── agent2_legal_research.py   # Hybrid legal retrieval (Qdrant vector + Neo4j graph)
│   │   ├── agent3_strategy.py         # 3-factor merit scoring, forum & limitation period
│   │   ├── agent4_drafting.py         # Court-ready document generator (DOCX & PDF)
│   │   ├── agent5_explainability.py   # Dual-mode explainability (Citizen & Lawyer modes)
│   │   ├── bns_ipc_crossref.py        # Mapping table for BNS to legacy IPC sections
│   │   ├── retrieval.py               # Vector similarity & search utilities
│   │   └── templates/                 # Legal document layouts (Notices, Petitions, RTI)
│   ├── app/
│   │   ├── core/                      # Supabase admin client, JWT authentication helpers
│   │   ├── schemas/                   # Pydantic validation schemas
│   │   └── services/
│   │       ├── legal_graph_service.py # Neo4j graph queries (Acts, Chapters, Sections)
│   │       └── legal_updates_service.py # Live RSS legal feed aggregation
│   ├── schemas/
│   │   └── case_state.py              # Central Pydantic CaseState schema passed between agents
│   ├── main.py                        # FastAPI application endpoints, file upload & wipeout
│   ├── orchestrator.py                # LangGraph StateGraph pipeline definition
│   ├── requirements.txt               # Backend Python dependencies
│   └── output_docs/                   # Generated legal drafts (.docx / .pdf)
├── frontend/                          # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── citizen/               # Citizen portal (Intake chat, case history, marketplace)
│   │   │   ├── lawyerside/            # Lawyer portal (Briefs, marketplace bidding, legal explorer)
│   │   │   ├── login/ / auth/         # Supabase authentication & role-based routing
│   │   │   └── page.tsx               # Modern landing page with 3D Lady Justice component
│   │   ├── components/                # Reusable UI components (Modals, cards, score meters)
│   │   ├── hooks/                     # Custom React hooks
│   │   └── lib/                       # Supabase client, API axios client
│   ├── package.json                   # Frontend dependencies & scripts
│   └── next.config.ts                 # Next.js configuration
├── scripts/
│   └── normalize_domains.py           # Database migration script for legal domain taxonomies
├── docker-compose.yml                 # Multi-container setup (Postgres, Redis, Qdrant, Neo4j)
├── .env_example                       # Complete reference of all environment variables
└── NyayaAI_PRD_v4.md                  # Comprehensive Product Requirements Document (PRD v4.0)
```

---

# 5. 📡 API Reference

Below are the primary REST endpoints exposed by the FastAPI backend (`http://localhost:8000`):

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health check and version status |
| `POST` | `/analyze` | Main endpoint that triggers the 5-agent LangGraph workflow |
| `POST` | `/transcribe` | Transcribes vernacular audio via Sarvam AI STT (`saaras:v3`) |
| `POST` | `/upload` | Uploads evidence files (bills, FIRs, notices) for OCR extraction |
| `POST` | `/save_case/{case_id}` | Persists a session case to the SQLite/Supabase database |
| `GET` | `/cases` | Lists saved cases for the active user session |
| `GET` | `/cases/{case_id}` | Retrieves full case state, strategy, and generated documents |
| `DELETE` | `/cases/{case_id}` | **Complete Wipeout:** Deletes uploaded files, local DB, and in-memory cache |
| `GET` | `/download/{filename}` | Downloads generated court documents (DOCX/PDF) |
| `POST` | `/pipeline/accept-offer`| Citizen accepts a representation proposal from a lawyer |
| `GET` | `/legal-graph/health` | Verifies connection to the Neo4j knowledge graph |
| `GET` | `/legal-graph/acts/{act}/chapters` | Lists chapters under a specified legal act |
| `GET` | `/legal-graph/acts/{act}/chapters/{ch}/sections` | Lists statutory sections under a chapter |
| `GET` | `/explorer/legal-updates`| Retrieves current legal news and landmark ruling summaries |

---

# 6. ❓ Troubleshooting & Common Gotchas

The main troubleshooting table is in [section 3.7](#37-common-problems). A few
additional notes:

### Docker is not required
The local demo does not need PostgreSQL, Redis, Qdrant or Neo4j. Docker Compose
is only for testing the optional production integrations.

### CORS errors
Set the frontend origin explicitly in `.env` and restart the backend:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Tesseract / image OCR
Image OCR is optional. Install Tesseract and add it to `PATH`, or set
`SARVAM_API_KEY` to use Sarvam document intelligence. Text, PDF and DOCX
uploads work without either.

### Empty cloud dashboard
If login works but `/citizen/cases` or the marketplace is empty, the Supabase
project is missing the expected tables or RLS policies. Use local demo mode, or
apply your project's schema/migrations before setting
`NEXT_PUBLIC_DEMO_MODE=false`.

---

## ⚖️ Legal Disclaimer

> **IMPORTANT NOTICE:** LawGrid is an AI-powered legal information, document assistance, and discovery platform. It **does not provide formal legal representation** and does not establish an attorney-client privilege relationship. The information, scores, and draft documents provided are for preliminary informational and drafting purposes only.
>
> Users should always seek formal advice and representation from an advocate registered with the **Bar Council of India** for court litigation, bail hearings, or contentious legal matters.

---

<div align="center">
  <sub>Built with ❤️ to democratize access to justice across India. Grounded in the Constitution of India and the Bharatiya Nyaya Sanhita.</sub>
</div>
