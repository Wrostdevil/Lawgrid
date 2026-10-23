from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings.

    Every integration is optional so the API can start and run in local
    fallback mode. Set the relevant variables to enable the full AI stack.
    """

    # App
    APP_ENV: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "LawGrid"
    APP_VERSION: str = "4.1.0"

    # Auth. When true, case endpoints require a valid Supabase bearer token.
    # Keep false for a local single-user demo; set true for any shared deployment.
    AUTH_REQUIRED: bool = False
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Database (reserved for future SQLAlchemy/Alembic use)
    DATABASE_URL: str = ""
    SYNC_DATABASE_URL: str = ""

    # Redis (reserved for future background jobs)
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # LLM
    GROQ_API_KEY: str = ""
    SARVAM_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Pipeline
    PIPELINE_TIMEOUT_SECONDS: int = 45
    PIPELINE_CONFIDENCE_THRESHOLD: float = 0.6
    STRATEGY_ENGINE: str = "groq"

    # Qdrant (optional). Leave blank to use the local legal fallback.
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "nyay_ai_laws"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Neo4j Graph (optional, default OFF)
    NEO4J_GRAPH_ENABLED: bool = False
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = ""
    NEO4J_DATABASE: str = "neo4j"
    NEO4J_CORPUS_PATH: str = "app/data/corpus"

    # Files
    MAX_UPLOAD_SIZE_MB: int = 20

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="allow",
    )


settings = Settings()
