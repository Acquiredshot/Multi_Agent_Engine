"""Application settings, loaded from environment variables / .env file."""

from functools import lru_cache
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration object.

    Every value can be overridden by an environment variable of the same
    name (case-insensitive), or by an entry in a local .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- application ---
    app_name: str = "multi_agent_engine"
    app_env: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    api_prefix: str = ""
    # Comma-separated list of origins allowed to call the API from a browser
    # (the local Vite dev server, deployed frontends, ...). The Vite dev proxy
    # makes same-origin requests, so this is only needed when the frontend
    # talks to the API directly.
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # --- broker / result backend ---
    rabbitmq_host: str = "rabbitmq"
    rabbitmq_port: int = 5672
    rabbitmq_user: str = "guest"
    rabbitmq_password: Optional[str] = None
    rabbitmq_password_file: Optional[str] = None
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0
    result_backend_db: int = 1
    # Supply the password either inline or, preferably, as a path to a mounted
    # secret. redis_password_file wins when both are set.
    redis_password: Optional[str] = None
    redis_password_file: Optional[str] = None

    # --- worker behaviour ---
    task_time_limit_s: int = 300
    task_soft_time_limit_s: int = 240
    task_max_retries: int = 3
    task_retry_backoff_s: int = 5

    # --- ocr backend selection (strategy pattern) ---
    # Which OCRBackend implementation the ocr agent uses. See
    # app/ocr/registry.py for the registered names. Swapping this value is the
    # only change needed to move between dev and production extraction.
    ocr_backend: str = "tesseract"

    # Guards against loading an unbounded document into worker memory.
    source_max_bytes: int = 50 * 1024 * 1024
    source_timeout_s: int = 30

    # --- tesseract backend ---
    tesseract_lang: str = "eng"
    tesseract_timeout_s: int = 120
    tesseract_dpi: int = 200

    # --- aws textract backend ---
    # Region falls back to boto3's own resolution (AWS_REGION, profile...).
    textract_region: Optional[str] = None
    # Multi-page PDF/TIFF extraction is asynchronous and S3-only. When the
    # source is not already in S3, it is staged in this bucket first; without
    # it, such documents are rejected rather than silently truncated.
    textract_staging_bucket: Optional[str] = None
    textract_staging_prefix: str = "textract-staging/"
    # TABLES uses AnalyzeDocument instead of DetectDocumentText: richer, and
    # billed at a higher rate. Turn it off for plain text extraction.
    textract_extract_tables: bool = True
    textract_poll_interval_s: float = 2.0
    textract_max_poll_s: int = 180

    # --- queue names ---
    queue_ocr: str = "ocr"
    queue_compliance: str = "compliance"
    queue_anomaly: str = "anomaly"
    # Shared queue for work that is not agent-specific (result aggregation, and
    # anything that slips past task_routes). Every worker consumes it in
    # addition to its own agent queue, so nothing can be enqueued with no
    # consumer listening.
    queue_default: str = "default"

    # --- results ---
    result_expires_s: int = 3600

    @property
    def resolved_redis_password(self) -> Optional[str]:
        """The Redis password, read from the secret file when one is configured.

        Raises:
            RuntimeError: If redis_password_file points at a file that is not
                readable. Failing loudly beats connecting without credentials
                and reporting an opaque NOAUTH error from Redis instead.
        """
        if self.redis_password_file:
            path = Path(self.redis_password_file)
            try:
                secret = path.read_text(encoding="utf-8").strip()
            except OSError as exc:
                raise RuntimeError(
                    f"redis_password_file {path} could not be read: {exc}"
                ) from exc
            if not secret:
                raise RuntimeError(f"redis_password_file {path} is empty")
            return secret
        return self.redis_password or None

    def _redis_url(self, db: int) -> str:
        """Build a Redis URL for `db`, including credentials when set."""
        password = self.resolved_redis_password
        # The password can contain URL-reserved characters, so encode it.
        auth = f":{quote(password, safe='')}@" if password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{db}"

    @property
    def resolved_rabbitmq_password(self) -> Optional[str]:
        """RabbitMQ password, preferring a mounted secret file when configured."""
        if self.rabbitmq_password_file:
            path = Path(self.rabbitmq_password_file)
            try:
                secret = path.read_text(encoding="utf-8").strip()
            except OSError as exc:
                raise RuntimeError(
                    f"rabbitmq_password_file {path} could not be read: {exc}"
                ) from exc
            if not secret:
                raise RuntimeError(f"rabbitmq_password_file {path} is empty")
            return secret
        return self.rabbitmq_password or "guest"

    @property
    def broker_url(self) -> str:
        """AMQP URL used by Celery as the message broker."""
        password = self.resolved_rabbitmq_password
        auth = f"{quote(self.rabbitmq_user, safe='')}:{quote(password, safe='')}@" if password else ""
        if self.rabbitmq_user == "guest" and not password:
            auth = "guest:guest@"
        return f"amqp://{auth}{self.rabbitmq_host}:{self.rabbitmq_port}//"

    @property
    def result_backend_url(self) -> str:
        """Redis URL used by Celery to store task results."""
        return self._redis_url(self.result_backend_db)

    @property
    def safe_broker_url(self) -> str:
        """`broker_url` with any password masked, for logs and error messages."""
        if self.resolved_rabbitmq_password and self.rabbitmq_password:
            return f"amqp://{self.rabbitmq_user}:***@{self.rabbitmq_host}:{self.rabbitmq_port}//"
        return self.broker_url


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (safe as a FastAPI dependency)."""
    return Settings()


settings = get_settings()
