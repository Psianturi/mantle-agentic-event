import os


class Settings:
    # GCP Project
    gcp_project_id: str = os.environ.get("GCP_PROJECT_ID", "agentic-event-factory")

    # Mantle Network
    mantle_rpc_url: str = os.environ.get(
        "MANTLE_RPC_URL", "https://rpc.sepolia.mantle.xyz"
    )
    contract_address: str = os.environ.get("CONTRACT_ADDRESS", "")
    chain_id: int = int(os.environ.get("CHAIN_ID", "5003"))

    # App
    environment: str = os.environ.get("ENVIRONMENT", "development")

    # CORS — comma-separated list of allowed origins, or "*" for all
    _allowed_origins_raw: str = os.environ.get(
        "ALLOWED_ORIGINS",
        # Default: allow GitHub Spark domains + localhost dev
        "https://*.github.app,http://localhost:5173,http://localhost:5174",
    )

    @property
    def allowed_origins(self) -> list[str]:
        raw = self._allowed_origins_raw.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    # Whether to use GCP Secret Manager (True in Cloud Run, False in local dev)
    use_secret_manager: bool = (
        os.environ.get("USE_SECRET_MANAGER", "true").lower() == "true"
    )


settings = Settings()
