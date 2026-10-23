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
| **Agent 1: Intake** | *Junior Paralegal* | Gathers narrative from user, transcribes audio, parses uploaded bills/FIRs via OCR, extracts structured JSON facts (dates, parties, disputed amounts), and asks follow-ups if details are missing. | Sarvam AI, Tesseract, Pydantic, Claude / GPT-4o (`temp=0.0`) |
| **Agent 2: Research** | *Legal Research Associate* | Searches the complete Indian legal corpus (BNS, BNSS, BSA, Consumer Protection Act, etc.). Maps new BNS sections to corresponding legacy IPC sections. | Qdrant Vector DB, Neo4j Graph DB, OpenAI text-embedding-3-large |
| **Agent 3: Strategy** | *Senior Advocate* | Evaluates case merits (3-factor score), checks statutory limitation periods (deadlines to file), and selects the right jurisdiction / court forum (e.g. District Forum, NCLT, High Court). | LangGraph Conditional Routing, Custom Rules Engine |
| **Agent 4: Drafting** | *Drafting Counsel* | Takes the facts, citations, and strategy and writes structured, court-admissible legal documents (Legal Notices, Consumer Petitions, RTI requests). | `python-docx`, `reportlab` (PDF), Jinja2 templates |
| **Agent 5: Explain** | *Client Counselor* | Generates a 2-version explanation: **Citizen mode** (simple, jargon-free Hindi/English summary with action points) and **Lawyer mode** (technical citations, precedents, legal standing). | Claude 3.5 Haiku / GPT-4o-mini |

---

### Databases & Why They Are Used

1. **PostgreSQL / Supabase:** Stores persistent relational records: authenticated user accounts, lawyer verified profiles, active case postings in the marketplace, and bid/offer histories.
2. **Qdrant (Vector Database):** Stores embedded vectors of legal acts and case precedents. When a citizen types a situation in plain English or Hindi, Qdrant runs a semantic similarity search to find relevant statutory sections even if the user didn't use legal words.
3. **Neo4j (Knowledge Graph):** Represents legal relationships as a graph network: `(Act) -[:CONTAINS]-> (Chapter) -[:CONTAINS]-> (Section) -[:PUNISHES]-> (Offence)`. Allows navigating complex cross-references seamlessly.
4. **SQLite:** Zero-latency embedded database used by the FastAPI backend to store rapid session snapshots and case states before the user registers or downloads files.
5. **Redis:** Fast in-memory cache and Celery message broker for background task scheduling (like automated case escalation).

---

# 3. 🛠️ How to Implement (Step-by-Step Guide)

Follow this guide to get LawGrid running on your local machine from absolute scratch.

### Prerequisites (What to Install First)

Ensure you have these installed on your computer:
1. **Git:** [Download Git](https://git-scm.com/downloads)
2. **Python (v3.11 or newer):** [Download Python](https://www.python.org/downloads/) *(Make sure to check "Add Python to PATH" during installation)*
3. **Node.js (v18 or v20 LTS):** [Download Node.js](https://nodejs.org/)
4. **Docker Desktop:** [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) *(Must be installed and running)*
5. **Tesseract OCR (Optional, for document image reading):**
   - **Windows:** Download and run the [UB-Mannheim Installer](https://github.com/UB-Mannheim/tesseract/wiki).
   - **macOS:** `brew install tesseract tesseract-lang`
   - **Linux (Ubuntu/Debian):** `sudo apt-get install tesseract-ocr tesseract-ocr-hin`

---

### Step 1: Obtain Your API Keys

You will need the following API keys to enable AI capabilities (free trial tiers work):

1. **LLM API Key (at least one):**
   - **OpenAI:** Sign up at [platform.openai.com](https://platform.openai.com/) and create a secret key (`sk-...`).
   - **Anthropic (Optional but recommended):** Sign up at [console.anthropic.com](https://console.anthropic.com/) and create a key (`sk-ant-...`).
2. **Sarvam AI (For vernacular Indic voice-to-text):**
   - Register at [sarvam.ai](https://www.sarvam.ai/) to obtain an API key.
3. **Supabase (For User Authentication & Cloud Database):**
   - Create a free project at [supabase.com](https://supabase.com/).
   - From your project dashboard, go to **Project Settings → API** and copy:
     - `Project URL`
     - `anon / public` key
     - `service_role` secret key

---

### Step 2: Clone the Project & Prepare the Environment

Open your terminal (PowerShell or Bash) and run:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/LawGrid.git

# 2. Enter the project folder
cd LawGrid

# 3. Create your local environment configuration file
cp .env_example .env
```

Open `.env` in your text editor (VS Code, Notepad, etc.) and fill in your keys:

```env
# Project Branding
APP_NAME=LawGrid
NEXT_PUBLIC_APP_NAME=LawGrid

# AI Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
SARVAM_API_KEY=your-sarvam-key-here

# Supabase Auth & Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database Connections (Defaults work with Docker Compose)
DATABASE_URL=postgresql+asyncpg://nyaya:nyaya123@localhost:5432/nyayaai
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=nyaya123
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

---

### Step 3: Start Supporting Databases with Docker

With Docker Desktop running on your machine, run:

```bash
docker compose up -d
```

This single command starts four containers in the background:
- **PostgreSQL (`5432`):** Primary database
- **Redis (`6379`):** Cache & message broker
- **Qdrant (`6333`):** Vector search engine
- **Neo4j (`7474` / `7687`):** Knowledge graph database *(Open [http://localhost:7474](http://localhost:7474) to explore the graph visually)*

---

### Step 4: Set Up and Run the Python Backend

Open a terminal window in the project root:

```bash
# 1. Navigate into the backend directory
cd backend

# 2. Create a Python virtual environment
python -m venv venv

# 3. Activate the virtual environment:
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Start the FastAPI backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Once running, verify your backend:
- Open your browser to **[http://localhost:8000/health](http://localhost:8000/health)** → should return `{"status": "ok", "version": "4.0.0"}`
- Interactive API Docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

### Step 5: Set Up and Run the Next.js Frontend

Open a **second** terminal window in the project root:

```bash
# 1. Navigate into the frontend directory
cd frontend

# 2. Install all Node.js dependencies
npm install

# 3. (Optional) Create local frontend environment overrides
# If your backend runs on port 8000, the default configuration already works!
```

Now start the development server:

```bash
npm run dev
```

Your frontend is now live at: **[http://localhost:3000](http://localhost:3000)**!

---

### Step 6: Test Your First End-to-End Case

1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Click **Start Case Analysis** or visit `/citizen/home`.
3. Try typing or speaking this sample scenario:
   > *"I bought a Samsung Smart TV for ₹45,000 from an electronics dealer in Mumbai on 10th January 2024 with a 1-year warranty. After 5 days the display stopped working. The dealer refuses to replace it or give a refund, claiming 'sold goods cannot be returned'. What legal remedy do I have?"*
4. **Watch the Agents in Action:**
   - Agent 1 structures the parties, amount (₹45,000), date, and claims.
   - Agent 2 identifies violations under the **Consumer Protection Act, 2019** (Deficiency of Service & Unfair Trade Practice).
   - Agent 3 scores the case merit (~4.5/5) and recommends the District Consumer Disputes Redressal Commission.
   - Agent 4 generates a formatted **Legal Notice** ready for download in `.docx` format.
   - Agent 5 provides an easy-to-understand breakdown in your chosen language.

---

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

### 1. `Docker failed to start or ports already in use`
- **Cause:** Another instance of PostgreSQL (`5432`) or Redis (`6379`) is already running on your machine.
- **Fix:** Stop your local PostgreSQL/Redis service, or edit `docker-compose.yml` to change the host port (e.g., `"5433:5432"`).

### 2. `TesseractNotFoundError`
- **Cause:** Tesseract OCR is not installed or not present in your system's PATH.
- **Fix:** If on Windows, add `C:\Program Files\Tesseract-OCR` to your Environment Variables, or specify `TESSERACT_CMD` in your `.env`.

### 3. `ModuleNotFoundError: No module named 'agents'`
- **Cause:** Python path was not set when executing directly.
- **Fix:** Always run from the `backend` folder using `uvicorn main:app --reload` (which has path auto-resolution configured).

### 4. `CORS Error in Browser Console`
- **Cause:** Frontend (`localhost:3000`) is blocked from calling the backend.
- **Fix:** Ensure backend `main.py` has `CORSMiddleware` configured (default allows `*` in development).

---

## ⚖️ Legal Disclaimer

> **IMPORTANT NOTICE:** LawGrid is an AI-powered legal information, document assistance, and discovery platform. It **does not provide formal legal representation** and does not establish an attorney-client privilege relationship. The information, scores, and draft documents provided are for preliminary informational and drafting purposes only.
>
> Users should always seek formal advice and representation from an advocate registered with the **Bar Council of India** for court litigation, bail hearings, or contentious legal matters.

---

<div align="center">
  <sub>Built with ❤️ to democratize access to justice across India. Grounded in the Constitution of India and the Bharatiya Nyaya Sanhita.</sub>
</div>
