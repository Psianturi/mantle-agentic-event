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
| `MINTER_SERVICE_PRIVATE_KEY` | Yes | Minter service wallet (holds MINTER_ROLE on V4 contract). Used for admin ops and Mode A. |
| `AGENT_PRIVATE_KEY` | Legacy | Old deployer key — only used as fallback if MINTER_SERVICE_PRIVATE_KEY is absent. |
| `LLM_API_KEY` | Yes | Google Gemini API key |
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 key — enables Auto Scout; omit to disable |
| `CONTRACT_ADDRESS` | Yes | Deployed NFT contract address (V4: `0x66fD8b5411856D42c08D9356e879a6e7dF0c9419`) |
| `MANTLE_RPC_URL` | No | Mantle network RPC endpoint (defaults to public Sepolia RPC) |
| `CHAIN_ID` | Yes | 5003 = Sepolia testnet, 5000 = mainnet |
| `GCP_PROJECT_ID` | Yes | GCP project for Firestore and Secret Manager |
| `USE_SECRET_MANAGER` | Yes | `true` = read secrets from GCP Secret Manager; `false` = read from env vars |
| `KMS_KEY_NAME` | No | Full KMS key resource name — enables encryption of agent private keys in Firestore |

## GCP Secret Manager

In production (`USE_SECRET_MANAGER=true`), secrets are read from GCP Secret Manager instead of environment variables. The Cloud Run service account must have `roles/secretmanager.secretAccessor` on each secret.

**Secrets used by this backend:**

| Secret Name | Contents | Purpose |
|-------------|----------|---------|
| `MINTER_SERVICE_PRIVATE_KEY` | Minter service wallet private key | Admin ops: `recordExecutedProposal()`, Mode A explicit requests |
| `LLM_API_KEY` | Gemini API key | Wisdom generation, Auto Scout |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (optional) | Auto Scout event discovery |

> **Note on `MINTER_SERVICE_PRIVATE_KEY`:** This wallet pays gas ONLY for admin operations and explicit Mode A requests. Regular minting (Mode B) is paid by each agent's own wallet. Keep this wallet topped up with ~1 MNT for admin use.

### Common Secret Manager Commands

```bash
# Project shorthand used in all commands below
PROJECT=agentic-event-factory

# List all secrets
gcloud secrets list --project=$PROJECT

# Create a new secret (use -n flag to avoid trailing newline!)
echo -n "YOUR_VALUE" | gcloud secrets create SECRET_NAME \
  --project=$PROJECT \
  --replication-policy=automatic \
  --data-file=-

# Add or update a secret value
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME \
  --project=$PROJECT \
  --data-file=-

# Read current value
gcloud secrets versions access latest \
  --secret=SECRET_NAME \
  --project=$PROJECT

# Grant Cloud Run SA read access to a secret
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --project=$PROJECT \
  --member="serviceAccount:SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

> **Important:** Always use `echo -n` (no trailing newline) when creating secrets. A trailing `\n` causes `Non-hexadecimal digit found` errors in eth_account.

**Cloud Run service account:** `21898396920-compute@developer.gserviceaccount.com`

## Transaction Signing Architecture

### Mode B — Agent Self-Signs (True Autonomy)

```
Agent Wallet (e.g. 0x9AE...818C)
  ├── holds MNT from spawnAgent() gas reserve (0.5 MNT)
  ├── isAgentSpawned = true on V4 contract
  ├── private key encrypted with KMS, stored in Firestore
  └── backend decrypts key → agent self-signs mintAttendanceNFT()
      → agent wallet pays gas
```

**Required:** Agent must be spawned via `spawnAgent(agentWallet)` on V4 contract (1 MNT from MetaMask). Sets `isAgentSpawned[agentWallet] = true` on-chain.

### Mode A — Minter Service Signs (Admin / Explicit)

```
Minter Service Wallet (0xCBA7951...)
  ├── holds MINTER_ROLE on V4 contract
  ├── used for: recordExecutedProposal(), explicit Mode A requests
  └── should NOT be the primary gas payer for regular minting
```

### Re-spawning V3-era Agents on V4

Agents originally spawned on V3 contract (`0x460b...`) are NOT registered on V4. They must be re-spawned:

1. Go to V4 contract on MantleScan: `0x66fD8b5411856D42c08D9356e879a6e7dF0c9419`
2. Call `spawnAgent(agentWallet)` with the agent's wallet address + 1 MNT
3. This sets `isAgentSpawned[agentWallet] = true` on V4
4. Mode B self-signing now works for that agent

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
GET  /api/v1/agent/{id}/scout-logs

GET  /api/v1/event/list?wallet=...
POST /api/v1/event/attend

GET  /api/v1/public/featured-wisdom
GET  /api/v1/public/metrics

POST /api/v1/scheduler/run-all-scouts  ← OIDC-protected (Cloud Scheduler)
```

## Agent Private Key Storage

| Key | Stored In | Used For |
|-----|-----------|----------|
| `MINTER_SERVICE_PRIVATE_KEY` (Secret Manager) | GCP Secret Manager | Admin ops only: `recordExecutedProposal()`, Mode A explicit |
| Per-agent key (`private_key_enc`) | Firestore, per-agent document | Mode B: agent self-signs. Encrypted with KMS if `KMS_KEY_NAME` is set. |

## Deploying to Cloud Run

```bash
gcloud run deploy mantle-agentic-event \
  --source . \
  --region=asia-southeast1 \
  --project=agentic-event-factory \
  --allow-unauthenticated
```

To update a single environment variable:

```bash
gcloud run services update mantle-agentic-event \
  --region=asia-southeast1 \
  --project=agentic-event-factory \
  --update-env-vars KEY=VALUE
```
