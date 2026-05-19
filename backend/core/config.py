from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # GCP Project
    gcp_project_id: str = "agentic-event-factory"

    # Mantle Network
    mantle_rpc_url: str = "https://rpc.sepolia.mantle.xyz"
    contract_address: str = ""
    chain_id: int = 5003
    mantle_explorer_url: str = ""

    # App
    environment: str = "development"
    use_secret_manager: bool = True

    # GCP KMS — set in production to encrypt agent private keys
    kms_key_name: str = ""

    # Cloud Run service URL — used as OIDC token audience for Cloud Scheduler auth.
    # Override in Cloud Run env vars if the URL changes.
    cloud_run_url: str = "https://mantle-agentic-event-21898396920.asia-southeast1.run.app"

    # Option A: Semi-Autonomous Proposal Execution — treasury/vault address
    autonomous_vault_address: str = ""

    # CORS — comma-separated origins or "*"
    # "*" is safe here because allow_credentials=False (no cookies/sessions)
    allowed_origins_raw: str = "*"

    @property
    def allowed_origins(self) -> list[str]:
        raw = self.allowed_origins_raw.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
