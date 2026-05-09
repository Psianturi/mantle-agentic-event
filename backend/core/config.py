import os

try:
    from pydantic_settings import BaseSettings  # pydantic v2
except ImportError:
    from pydantic import BaseSettings  # type: ignore[no-redef]


class Settings(BaseSettings):
    # GCP Project
    gcp_project_id: str = "agentic-event-factory"

    # Mantle Network
    mantle_rpc_url: str = "https://rpc.sepolia.mantle.xyz"
    contract_address: str = ""
    chain_id: int = 5003

    # App
    environment: str = "development"
    use_secret_manager: bool = True

    # CORS — comma-separated origins or "*"
    allowed_origins_raw: str = (
        "https://*.github.app,http://localhost:5173,http://localhost:5174"
    )

    @property
    def allowed_origins(self) -> list[str]:
        raw = self.allowed_origins_raw.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
