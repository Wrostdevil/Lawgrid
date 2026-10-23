"""Legal retrieval.

The production path uses Qdrant + SentenceTransformers when configured. When
those services are unavailable, a small curated local corpus keeps the demo
usable. The local corpus is intentionally labelled as a fallback and is not a
substitute for a verified statute database.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

COLLECTION = os.getenv("QDRANT_COLLECTION", "nyay_ai_laws")
EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)

TOPIC_ORDER = [
    "Most Used Section",
    "Primary Offence/Core Law Section",
    "Punishment/Liability Section",
    "Attempt/Abetment/Secondary Liability Section",
    "Procedure Related Section",
    "Special Case/Exception Section",
    "Recent Amendment/Updated Provision",
    "Related Supporting Section",
]

TOPIC_HINTS = {
    "Most Used Section": "most used legal section key provision",
    "Primary Offence/Core Law Section": "primary offence core law section",
    "Punishment/Liability Section": "punishment penalty liability section",
    "Attempt/Abetment/Secondary Liability Section": "attempt abetment secondary liability section",
    "Procedure Related Section": "procedure investigation trial complaint filing section",
    "Special Case/Exception Section": "exception proviso special case section",
    "Recent Amendment/Updated Provision": "recent amendment updated provision latest changes",
    "Related Supporting Section": "related supporting supplementary section",
}

DOMAIN_ALIASES = {
    "civil procedure": "civil",
    "cyber law": "cyber",
    "data privacy": "cyber",
    "pil": "constitutional",
    "rti": "rti",
    "consumer dispute": "consumer",
    "landlord": "tenant",
    "rent": "tenant",
    "employment": "labour",
    "salary": "labour",
    "cheque bounce": "debt_recovery",
    "loan": "debt_recovery",
    "matrimonial": "family",
    "divorce": "family",
    "property": "property",
    "police": "criminal",
    "fraud": "criminal",
}

# A compact fallback corpus. Each entry is deliberately concise so the rest of
# the pipeline has something grounded to work with without a vector database.
LOCAL_SECTIONS: list[dict[str, Any]] = [
    {
        "act": "consumer_protection_act_2019",
        "section": "2(11)",
        "text": "Deficiency in service means any fault, imperfection, shortcoming or inadequacy in the quality, nature or manner of performance of a service.",
        "domains": ["consumer"],
        "keywords": ["service", "deficiency", "defective", "refund", "warranty", "shop", "product", "seller"],
    },
    {
        "act": "consumer_protection_act_2019",
        "section": "2(47)",
        "text": "Unfair trade practice includes misleading advertisements, false representations and unfair methods of selling goods or services.",
        "domains": ["consumer"],
        "keywords": ["unfair", "advertisement", "misleading", "seller", "shop", "refund", "product"],
    },
    {
        "act": "consumer_protection_act_2019",
        "section": "34",
        "text": "The District Commission has jurisdiction to entertain complaints where the value of goods or services paid does not exceed the prescribed limit.",
        "domains": ["consumer"],
        "keywords": ["consumer", "forum", "district", "complaint", "claim", "refund"],
    },
    {
        "act": "consumer_protection_act_2019",
        "section": "35",
        "text": "A complaint may be filed before the District Commission by a consumer, a registered consumer association or the Central/State Government.",
        "domains": ["consumer"],
        "keywords": ["consumer", "complaint", "file", "forum", "district"],
    },
    {
        "act": "bns_2023",
        "section": "318",
        "text": "Cheating: deceiving a person and dishonestly inducing them to deliver property or consent to retention of property.",
        "domains": ["criminal", "cyber", "debt_recovery"],
        "keywords": ["cheating", "fraud", "deceive", "money", "payment", "online", "scam"],
    },
    {
        "act": "bns_2023",
        "section": "303",
        "text": "Theft: dishonestly taking movable property out of the possession of another person without consent.",
        "domains": ["criminal"],
        "keywords": ["theft", "stolen", "property", "took", "movable"],
    },
    {
        "act": "bns_2023",
        "section": "351",
        "text": "Criminal intimidation: threatening injury to a person, reputation or property with intent to cause alarm or compel an act.",
        "domains": ["criminal", "family"],
        "keywords": ["threat", "intimidation", "fear", "alarm", "harassment"],
    },
    {
        "act": "bnss_2023",
        "section": "173",
        "text": "Information in cognizable cases: every information relating to the commission of a cognizable offence may be given orally or in writing to an officer in charge of a police station.",
        "domains": ["criminal"],
        "keywords": ["fir", "police", "complaint", "cognizable", "station"],
    },
    {
        "act": "rti_act_2005",
        "section": "6",
        "text": "A person who desires information under the RTI Act may make a request in writing or electronically to the Public Information Officer.",
        "domains": ["rti"],
        "keywords": ["rti", "information", "pio", "request", "government"],
    },
    {
        "act": "rti_act_2005",
        "section": "7",
        "text": "The Public Information Officer should ordinarily provide the requested information within thirty days of receipt of the request.",
        "domains": ["rti"],
        "keywords": ["rti", "thirty days", "delay", "pio", "information"],
    },
    {
        "act": "rti_act_2005",
        "section": "19",
        "text": "A person aggrieved by a decision of the Public Information Officer may prefer a first appeal and, if necessary, a second appeal to the Information Commission.",
        "domains": ["rti"],
        "keywords": ["rti", "appeal", "commission", "refused", "no response"],
    },
    {
        "act": "it_act_2000",
        "section": "66C",
        "text": "Punishment for identity theft: dishonest use of another person's electronic signature, password or unique identification feature.",
        "domains": ["cyber"],
        "keywords": ["identity", "password", "account", "hacked", "online", "cyber"],
    },
    {
        "act": "it_act_2000",
        "section": "66D",
        "text": "Punishment for cheating by personation by using a computer resource or communication device.",
        "domains": ["cyber"],
        "keywords": ["online", "fraud", "cheating", "fake", "profile", "cyber", "otp"],
    },
    {
        "act": "it_act_2000",
        "section": "67",
        "text": "Punishment for publishing or transmitting obscene material in electronic form.",
        "domains": ["cyber"],
        "keywords": ["obscene", "image", "video", "online", "harassment"],
    },
    {
        "act": "transfer_of_property_act_1882",
        "section": "106",
        "text": "A lease of immovable property for a term exceeding one year can be terminated by a notice to quit served in the prescribed manner.",
        "domains": ["tenant", "property"],
        "keywords": ["rent", "landlord", "tenant", "eviction", "notice", "lease", "deposit"],
    },
    {
        "act": "transfer_of_property_act_1882",
        "section": "108",
        "text": "Rights and liabilities of the lessor and lessee, including the lessee's right to peaceful enjoyment and the lessor's obligation to maintain the property.",
        "domains": ["tenant", "property"],
        "keywords": ["rent", "landlord", "tenant", "deposit", "repair", "lease"],
    },
    {
        "act": "payment_of_wages_act_1936",
        "section": "15",
        "text": "A worker may apply to the prescribed authority for recovery of wages that have been delayed or deducted unlawfully.",
        "domains": ["labour"],
        "keywords": ["salary", "wages", "employer", "deduction", "unpaid", "labour"],
    },
    {
        "act": "industrial_disputes_act_1947",
        "section": "2A",
        "text": "An individual workman may raise an industrial dispute relating to discharge, dismissal, retrenchment or termination.",
        "domains": ["labour"],
        "keywords": ["termination", "dismissal", "employer", "job", "labour", "retrenchment"],
    },
    {
        "act": "industrial_disputes_act_1947",
        "section": "10",
        "text": "The appropriate Government may refer an industrial dispute to a Labour Court, Tribunal or National Tribunal for adjudication.",
        "domains": ["labour"],
        "keywords": ["labour court", "dispute", "reference", "termination", "employer"],
    },
    {
        "act": "domestic_violence_act_2005",
        "section": "12",
        "text": "An aggrieved person may present an application to the Magistrate seeking one or more reliefs under the Protection of Women from Domestic Violence Act.",
        "domains": ["family"],
        "keywords": ["domestic", "violence", "husband", "family", "protection", "harassment"],
    },
    {
        "act": "domestic_violence_act_2005",
        "section": "18",
        "text": "The Magistrate may pass a protection order prohibiting the respondent from committing acts of domestic violence.",
        "domains": ["family"],
        "keywords": ["domestic", "violence", "protection order", "family", "harassment"],
    },
    {
        "act": "hindu_marriage_act_1955",
        "section": "13",
        "text": "A marriage may be dissolved by a decree of divorce on grounds such as cruelty, desertion, adultery or irretrievable breakdown as recognised by law.",
        "domains": ["family"],
        "keywords": ["divorce", "marriage", "cruelty", "separation", "husband", "wife"],
    },
    {
        "act": "hindu_marriage_act_1955",
        "section": "24",
        "text": "Maintenance pendente lite and expenses of proceedings may be awarded to either spouse during the pendency of matrimonial proceedings.",
        "domains": ["family"],
        "keywords": ["maintenance", "alimony", "divorce", "wife", "husband", "support"],
    },
    {
        "act": "motor_vehicles_act_1988",
        "section": "166",
        "text": "An application for compensation arising out of an accident may be made to the Motor Accidents Claims Tribunal by the person injured or the legal representatives of the deceased.",
        "domains": ["civil", "motor_accident"],
        "keywords": ["accident", "vehicle", "insurance", "injury", "compensation", "mact"],
    },
    {
        "act": "rera_2016",
        "section": "18",
        "text": "If a promoter fails to complete or hand over a project, the allottee may withdraw and claim a refund with interest or choose another project.",
        "domains": ["property"],
        "keywords": ["builder", "flat", "possession", "refund", "rera", "project", "real estate"],
    },
    {
        "act": "rera_2016",
        "section": "31",
        "text": "Any aggrieved person may file a complaint with the Real Estate Regulatory Authority for violation of the Act or rules.",
        "domains": ["property"],
        "keywords": ["builder", "flat", "rera", "complaint", "possession", "project"],
    },
    {
        "act": "prevention_of_corruption_act_1988",
        "section": "7",
        "text": "A public servant who obtains or accepts an undue advantage in connection with the performance of public duty commits an offence.",
        "domains": ["corruption"],
        "keywords": ["bribe", "corruption", "public servant", "officer", "undue advantage"],
    },
    {
        "act": "prevention_of_corruption_act_1988",
        "section": "13",
        "text": "Criminal misconduct by a public servant, including dishonest or fraudulent misappropriation of property entrusted to them.",
        "domains": ["corruption"],
        "keywords": ["corruption", "misconduct", "public servant", "bribe", "misappropriation"],
    },
    {
        "act": "negotiable_instruments_act_1881",
        "section": "138",
        "text": "Dishonour of a cheque for insufficiency of funds or because the amount exceeds the arrangement, subject to the statutory notice and limitation requirements.",
        "domains": ["debt_recovery"],
        "keywords": ["cheque", "bounce", "dishonour", "bank", "payment", "loan"],
    },
    {
        "act": "indian_contract_act_1872",
        "section": "73",
        "text": "When a contract has been broken, the party who suffers loss is entitled to compensation for loss which naturally arose in the usual course of things or which the parties knew would likely result.",
        "domains": ["civil"],
        "keywords": ["contract", "breach", "compensation", "loss", "agreement", "damages"],
    },
    {
        "act": "indian_contract_act_1872",
        "section": "74",
        "text": "Reasonable compensation may be awarded for breach of contract where a sum is named in the contract as payable on breach.",
        "domains": ["civil"],
        "keywords": ["contract", "breach", "penalty", "liquidated damages", "agreement"],
    },
    {
        "act": "legal_services_authorities_act_1987",
        "section": "19",
        "text": "Lok Adalats are established to settle disputes through conciliation and compromise, and an award made by a Lok Adalat is binding on the parties.",
        "domains": ["civil", "consumer", "tenant", "family"],
        "keywords": ["lok adalat", "mediation", "settlement", "free", "compromise"],
    },
    {
        "act": "code_of_civil_procedure_1908",
        "section": "9",
        "text": "Civil courts have jurisdiction to try all suits of a civil nature except those expressly or impliedly barred.",
        "domains": ["civil", "property", "debt_recovery"],
        "keywords": ["civil court", "suit", "jurisdiction", "property", "money recovery"],
    },
]


def _normalize_domain(domain: str) -> str:
    normalized = (domain or "").strip().lower()
    return DOMAIN_ALIASES.get(normalized, normalized)


def _infer_domain(query: str) -> str:
    q = (query or "").lower()
    keyword_domains = {
        "consumer": ["consumer", "product", "refund", "warranty", "seller", "shop", "defective"],
        "tenant": ["rent", "landlord", "tenant", "eviction", "deposit", "lease"],
        "labour": ["salary", "wages", "employer", "termination", "job", "labour", "hr"],
        "criminal": ["fir", "police", "theft", "assault", "cheating", "threat", "criminal"],
        "cyber": ["online", "cyber", "hack", "otp", "fraud", "account", "password"],
        "property": ["property", "land", "flat", "builder", "possession", "registry", "rera"],
        "family": ["divorce", "marriage", "husband", "wife", "maintenance", "domestic", "custody"],
        "rti": ["rti", "information", "pio", "government office"],
        "corruption": ["bribe", "corruption", "public servant", "lokayukta"],
        "debt_recovery": ["cheque", "loan", "borrow", "recovery", "bounce"],
        "motor_accident": ["accident", "vehicle", "insurance", "mva"],
    }
    for domain, words in keyword_domains.items():
        if any(word in q for word in words):
            return domain
    return "civil"


def _local_search(query: str, limit: int = 5) -> list[dict[str, Any]]:
    q = (query or "").lower()
    tokens = set(re.findall(r"[a-z]{3,}", q))
    domain = _infer_domain(q)
    scored: list[tuple[float, dict[str, Any]]] = []

    for section in LOCAL_SECTIONS:
        keyword_hits = len(tokens.intersection(section["keywords"]))
        text_hits = sum(1 for token in tokens if token in section["text"].lower())
        domain_match = domain in section["domains"]
        # Avoid citing a specialist statute (for example RERA) merely because
        # one generic word such as "refund" appears in the narrative.
        if not domain_match and keyword_hits < 2:
            continue
        score = keyword_hits * 0.12 + text_hits * 0.03
        if domain_match:
            score += 0.55
        if any(word in q for word in section["keywords"][:4]):
            score += 0.08
        # Keep the fallback above Agent 2's 0.40 threshold.
        if score > 0:
            scored.append((min(0.92, 0.42 + score), section))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            "act": section["act"],
            "section": section["section"],
            "text": section["text"],
            "score": round(score, 3),
        }
        for score, section in scored[:limit]
    ]


_qdrant_client = None
_qdrant_checked = False
_embedding_model = None
_model_checked = False


def _get_qdrant():
    global _qdrant_client, _qdrant_checked
    if _qdrant_checked:
        return _qdrant_client
    _qdrant_checked = True

    url = os.getenv("QDRANT_URL", "").strip()
    if not url:
        logger.info("QDRANT_URL not set - using local legal fallback")
        return None

    try:
        from qdrant_client import QdrantClient

        _qdrant_client = QdrantClient(
            url=url,
            api_key=os.getenv("QDRANT_API_KEY") or None,
            timeout=8,
            check_compatibility=False,
        )
        logger.info("Qdrant client configured for %s", url)
    except Exception as exc:
        logger.warning("Qdrant unavailable (%s) - using local fallback", exc)
        _qdrant_client = None
    return _qdrant_client


def _get_model():
    global _embedding_model, _model_checked
    if _model_checked:
        return _embedding_model
    _model_checked = True

    if not _get_qdrant():
        return None

    try:
        from sentence_transformers import SentenceTransformer

        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Loaded embedding model %s", EMBEDDING_MODEL)
    except Exception as exc:
        logger.warning("Embedding model unavailable (%s) - using local fallback", exc)
        _embedding_model = None
    return _embedding_model


def search_law(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Search Qdrant, falling back to the local corpus on any failure."""
    client = _get_qdrant()
    model = _get_model()

    if client is not None and model is not None:
        try:
            vector = model.encode(query).tolist()
            if hasattr(client, "query_points"):
                results = client.query_points(
                    collection_name=COLLECTION, query=vector, limit=limit
                ).points
            else:  # older qdrant-client
                results = client.search(
                    collection_name=COLLECTION, query_vector=vector, limit=limit
                )

            matches = []
            for result in results:
                payload = result.payload or {}
                if not payload.get("text"):
                    continue
                matches.append(
                    {
                        "act": payload.get("act", "unknown_act"),
                        "section": payload.get("section", "N/A"),
                        "text": payload["text"],
                        "score": float(result.score),
                    }
                )
            if matches:
                return matches
        except Exception as exc:
            logger.warning("Vector search failed (%s) - using local fallback", exc)

    return _local_search(query, limit=limit)


def _one_line_explanation(text: str, max_chars: int = 170) -> str:
    clean = " ".join((text or "").split())
    if not clean:
        return "No explanation available for this provision."

    for sep in [". ", "; ", ": "]:
        if sep in clean:
            clean = clean.split(sep)[0].strip()
            break

    if len(clean) > max_chars:
        clean = clean[: max_chars - 3].rstrip() + "..."
    return clean


def get_domain_topic_sections(domain: str, per_topic_limit: int = 5) -> list[dict[str, Any]]:
    domain_query = _normalize_domain(domain)
    used_sections: set[tuple[str, str]] = set()
    topic_items: list[dict[str, Any]] = []

    for topic in TOPIC_ORDER:
        hint = TOPIC_HINTS[topic]
        scoped_query = f"{domain_query} law in India {hint}"
        candidates = search_law(scoped_query, limit=per_topic_limit)

        selected = None
        for item in candidates:
            key = (str(item.get("act", "")), str(item.get("section", "")))
            if key not in used_sections:
                selected = item
                used_sections.add(key)
                break

        is_fallback = False
        if selected is None:
            fallback_candidates = search_law(
                f"{domain_query} legal section India", limit=per_topic_limit
            )
            for item in fallback_candidates:
                key = (str(item.get("act", "")), str(item.get("section", "")))
                if key not in used_sections:
                    selected = item
                    used_sections.add(key)
                    is_fallback = True
                    break

        if selected is None:
            topic_items.append(
                {
                    "title": topic,
                    "explanation": "No directly relevant section found in current corpus for this domain.",
                    "source_section": "Not available",
                    "score": None,
                    "is_fallback": True,
                }
            )
            continue

        act = str(selected.get("act", "Unknown Act")).replace("_", " ").title()
        section = str(selected.get("section", "N/A"))
        topic_items.append(
            {
                "title": topic,
                "explanation": _one_line_explanation(str(selected.get("text", ""))),
                "source_section": f"{act} - Section {section}",
                "score": float(selected.get("score", 0.0)),
                "is_fallback": is_fallback,
            }
        )

    return topic_items
