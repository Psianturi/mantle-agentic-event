# MAEF - Mantle Agentic Event Factory

**Turn Information Overload into On-Chain Wisdom.**

MAEF is a production-ready platform on the Mantle Network where users spawn autonomous AI agents that attend digital events, extract insights, and mint verifiable Proof-of-Attendance NFTs — signed by the agent's own wallet.

---

## Live Deployment

| Resource | URL / Address |
|----------|--------------|
| Frontend | https://mantle-agentic-event.vercel.app |
| Backend (Cloud Run) | https://mantle-agentic-event-21898396920.asia-southeast1.run.app |
| V2 Contract (Sepolia) | `0x110edEa5DB874589ec4492d15660082634E173f0` |
| Contract Explorer | https://explorer.sepolia.mantle.xyz/address/0x110edEa5DB874589ec4492d15660082634E173f0 |

**True Mode B — Confirmed Live:**
TX `0xfa9816937bed6c6907a7f0b175b33b516559b3a1024a6b90c44fb7663c9d8431` — agent wallet `0x8176f4B33D80484B1f56eE00921e1252d05558CA` signed and minted NFT Token ID 0 directly on V2 contract. No backend involvement in signing.

---

## What Makes MAEF Different

Agents are not bots. Each agent has:
- A unique Mantle wallet (private key encrypted in GCP KMS)
- 0.5 MNT gas budget for independent transaction signing
- On-chain attendance history and level progression
- Ability to breed/fuse with other agents to create offspring

The core proof: when an agent attends an event in Mode B, MantleScan shows **the agent's own wallet as the transaction signer** — not the backend, not the user.

---

## Agent Transaction Modes

**Mode A — Backend Signing (default)**
Backend wallet holds MINTER_ROLE and signs all mint transactions. Safe for initial setup and fallback scenarios. MantleScan shows backend deployer as signer.

**Mode B — Agent Autonomous Signing**
Agent's own private key (decrypted from KMS) signs the transaction directly. MantleScan shows the agent wallet as signer. Requires the agent to be registered via `spawnAgent()` on the V2 contract. This is the True Autonomy path.

Mode B automatically falls back to Mode A if the agent was not registered on-chain. The `signing_mode` field in event records reflects which mode was actually used.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | FastAPI (Python 3.11) + async/await |
| Blockchain | Mantle Network (L2 OP Stack) |
| Smart Contracts | Solidity — ERC-721A (60%+ gas savings vs ERC-721) |
| Database | Firestore (agent state, event history) |
| AI/LLM | Gemini 2.5 Flash via v1beta API (YouTube transcript analysis) |
| Key Security | GCP KMS (agent private key encryption) |
| Deployment | GCP Cloud Run (serverless backend) + Vercel (frontend) |

---

## V1 vs V2 Contract

| Feature | V1 (MAEFNFTContract.sol) | V2 (MAEFNFTERC721A.sol) |
|---------|--------------------------|--------------------------|
| Standard | ERC-721 | ERC-721A |
| Mint authorization | `MINTER_ROLE` only | `_enforceMintAuth()` — admin OR spawned agent |
| True Mode B | Not possible | Supported |
| `spawnAgent()` | Not available | Available — registers agent, provisions 0.5 MNT |
| `batchMint` | Not available | Available |
| On-chain agent stats | Not available | `agentStats`, level, `wisdomUnlocked` |

---

## Quick Start

**1. Connect Wallet** — MetaMask on Mantle Sepolia (Chain ID 5003)

**2. Spawn Agent** — Choose niche + name. Backend generates agent wallet. Frontend calls `spawnAgent()` on V2 contract (1 MNT required). Agent receives 0.5 MNT gas + `isAgentSpawned = true` on-chain.

**3. Attend Event** — Paste YouTube/Luma/Eventbrite URL. Select Mode A or Mode B. Gemini analyzes transcript. NFT minted to agent wallet.

**4. Explore Wisdom** — After 5 events, Wisdom Report unlocks. Public Featured Wisdom endpoint available for discovery.

---

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

GET  /api/v1/event/list?wallet=...
POST /api/v1/event/attend

GET  /api/v1/public/featured-wisdom
GET  /api/v1/public/metrics
```

---

## Environment Variables

**Frontend (Vercel):**
```
VITE_MANTLE_NETWORK_URL=https://rpc.sepolia.mantle.xyz
VITE_CHAIN_ID=5003
VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=0x110edEa5DB874589ec4492d15660082634E173f0
VITE_GCP_BACKEND_URL=https://mantle-agentic-event-21898396920.asia-southeast1.run.app
```

**Backend (Cloud Run):**
```
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
CONTRACT_ADDRESS=0x110edEa5DB874589ec4492d15660082634E173f0
AGENT_PRIVATE_KEY=0x...          # backend minter wallet (holds MINTER_ROLE)
LLM_API_KEY=...                  # Gemini API key
ENVIRONMENT=production
KMS_KEY_NAME=projects/.../cryptoKeys/...  # required in production
```

---

## Security

**Private Key Storage**
- Backend writes `private_key_enc` to Firestore.
- If `KMS_KEY_NAME` is set in Cloud Run: value is base64-encoded KMS ciphertext.
- If `KMS_KEY_NAME` is not set: value is stored as plaintext (acceptable for testnet only).
- In `ENVIRONMENT=production`, the backend **refuses to spawn or breed agents** if KMS is not configured.

**Legacy documents** (agents created before KMS was enabled) may still have a `private_key` field in plaintext. These must be re-encrypted or rotated before mainnet use.

**Other**
- API URL allowlist: YouTube, Luma, Eventbrite, Zoom only (SSRF protection)
- CORS restricted to frontend domain
- Gemini API key not logged (httpx logging suppressed)

---


## Pending Before Mainnet

- [ ] Set `KMS_KEY_NAME` in Cloud Run (single env var to activate encryption)
- [ ] Migrate legacy plaintext `private_key` docs in Firestore
- [ ] Breeding cost on-chain (2.5 MNT deduct currently UI-only)
- [ ] Firestore composite index for Featured Wisdom trending query
- [ ] Public Wisdom discovery frontend page
- [ ] Secret Manager binding for Cloud Run env vars

---

## Troubleshooting

**Spawn shows old contract in MetaMask**
Vercel is using stale `VITE_NFT_CONTRACT_ADDRESS_SEPOLIA`. Set it to `0x110edEa5DB874589ec4492d15660082634E173f0` and redeploy. If spawn registers on V1 while backend mints on V2, `isAgentSpawned` is not set on V2 and True Mode B will not work.

**Mode B falls back to Mode A**
Agent was not registered via `spawnAgent()` on V2 contract. Check `funded` field in Firestore and verify the spawn tx went to V2 address on MantleScan.

**Gemini 503 / timeout**
The backend retries up to 2 times with exponential backoff (1s → 2s). If still failing, check Gemini API quota or rotate the API key.

---

## License

MIT — see [LICENSE](./LICENSE)
