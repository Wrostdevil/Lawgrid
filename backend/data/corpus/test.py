import os

from qdrant_client import QdrantClient

url = os.getenv("QDRANT_URL")
api_key = os.getenv("QDRANT_API_KEY") or None

if not url:
    raise SystemExit("Set QDRANT_URL (and QDRANT_API_KEY if required) before running this check.")

qdrant = QdrantClient(url=url, api_key=api_key)
print(qdrant.get_collections())
