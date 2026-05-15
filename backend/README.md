# MAEF Backend

FastAPI backend for Mantle Agentic Event Factory. Handles agent lifecycle, NFT minting, AI wisdom generation, and autonomous event discovery.

## Running Locally

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in real values
uvicorn main:app --reload --port 8080
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_PRIVATE_KEY` | Yes | Backend minter wallet private key (holds MINTER_ROLE on contract) |
| `LLM_API_KEY` | Yes | Google Gemini API key |
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 key — enables Auto Scout; omit to disable |
| `CONTRACT_ADDRESS` | Yes | Deployed NFT contract address |
| `MANTLE_RPC_URL` | Yes | Mantle network RPC endpoint |
| `CHAIN_ID` | Yes | 5003 = Sepolia testnet, 5000 = mainnet |
| `GCP_PROJECT_ID` | Yes | GCP project for Firestore and Secret Manager |
| `USE_SECRET_MANAGER` | Yes | `true` = read secrets from GCP Secret Manager; `false` = read from env vars |
| `ENVIRONMENT` | Yes | `production` or `development` |
| `KMS_KEY_NAME` | No | Full KMS key resource name — enables encryption of agent private keys in Firestore |

## GCP Secret Manager

In production (`USE_SECRET_MANAGER=true`), secrets are read from GCP Secret Manager instead of environment variables. The Cloud Run service account must have `roles/secretmanager.secretAccessor` on each secret.

**Secrets used by this backend:**

| Secret Name | Contents |
|-------------|----------|
| `AGENT_PRIVATE_KEY` | Backend minter wallet private key |
| `LLM_API_KEY` | Gemini API key |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (optional) |

### Common Secret Manager Commands

```bash
# Project shorthand used in all commands below
PROJECT=agentic-event-factory

# List all secrets
gcloud secrets list --project=$PROJECT

# List versions of a secret
gcloud secrets versions list SECRET_NAME --project=$PROJECT

# Create a new secret
gcloud secrets create SECRET_NAME \
  --project=$PROJECT \
  --replication-policy=automatic

# Add or update a secret value (creates new version, old versions remain)
echo -n "VALUE" | gcloud secrets versions add SECRET_NAME \
  --project=$PROJECT \
  --data-file=-

# Read current value (latest version)
gcloud secrets versions access latest \
  --secret=SECRET_NAME \
  --project=$PROJECT

# Read a specific version
gcloud secrets versions access 2 \
  --secret=SECRET_NAME \
  --project=$PROJECT

# Disable a version (soft delete — reversible)
gcloud secrets versions disable VERSION_NUMBER \
  --secret=SECRET_NAME \
  --project=$PROJECT

# Destroy a version (permanent — cannot be undone)
gcloud secrets versions destroy VERSION_NUMBER \
  --secret=SECRET_NAME \
  --project=$PROJECT

# Delete entire secret + all versions (permanent)
gcloud secrets delete SECRET_NAME --project=$PROJECT

# Grant Cloud Run SA read access to a secret
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --project=$PROJECT \
  --member="serviceAccount:SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# Check who has access to a secret
gcloud secrets get-iam-policy SECRET_NAME --project=$PROJECT
```

**Cloud Run service account:** `21898396920-compute@developer.gserviceaccount.com`

## API Endpoints

```
GET  /health
GET  /health/blockchain

POST /api/v1/agent/spawn
POST /api/v1/agent/breed
GET  /api/v1/agent/list?wallet=...
GET  /api/v1/agent/{id}
POST /api/v1/agent/{id}/mark-funded
PATCH /api/v1/agent/{id}/state
POST /api/v1/agent/{id}/chat
POST /api/v1/agent/{id}/wisdom
POST /api/v1/agent/{id}/scout        ← Auto Scout: Secretary discovers + attends YouTube event

GET  /api/v1/event/list?wallet=...
POST /api/v1/event/attend

GET  /api/v1/public/featured-wisdom
GET  /api/v1/public/metrics
```

## Agent Private Key Storage

There are two distinct private key types in this system:

| Key | Stored In | Used For |
|-----|-----------|----------|
| `AGENT_PRIVATE_KEY` (Secret Manager) | GCP Secret Manager | Mode A: backend signs NFT mint transactions. Also fallback when agent wallet has no gas. |
| Per-agent key (`private_key_enc`) | Firestore, per-agent document | Mode B: agent signs its own transactions (true autonomy). Encrypted with KMS if configured. |

> **Known limitation:** When an agent runs out of gas during Mode B, the backend silently falls back to `AGENT_PRIVATE_KEY`. This is acceptable for testnet but should be replaced with explicit failure + user notification before mainnet.

## Transaction Signing Modes

**Mode A** — Backend signs using `AGENT_PRIVATE_KEY` (holds MINTER_ROLE). MantleScan shows backend wallet as signer.

**Mode B** — Agent signs using its own decrypted private key from Firestore. MantleScan shows the agent's own wallet as signer. Requires the agent to be registered via `spawnAgent()` on the V2 contract.

Mode B falls back to Mode A silently when:
- Agent wallet was not registered via `spawnAgent()`
- Agent wallet has insufficient MNT for gas

## Deploying to Cloud Run

```bash
gcloud run deploy mantle-agentic-event \
  --source . \
  --region=asia-southeast1 \
  --project=agentic-event-factory \
  --allow-unauthenticated
```

To update a single environment variable without redeploying source:

```bash
gcloud run services update mantle-agentic-event \
  --region=asia-southeast1 \
  --project=agentic-event-factory \
  --update-env-vars KEY=VALUE
```
