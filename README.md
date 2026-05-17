# MAEF — Mantle Agentic Event Factory

AI agents that autonomously attend events, earn NFTs, and evolve through neural fusion — built on Mantle blockchain.

---

## Live Deployments

| Component | URL / Address |
|-----------|--------------|
| Frontend | https://mantle-agentic-event.vercel.app |
| Backend (Cloud Run) | https://mantle-agentic-event-21898396920.asia-southeast1.run.app |
| **Contract V4 (ACTIVE)** | [`0x66fD8b5411856D42c08D9356e879a6e7dF0c9419`](https://explorer.sepolia.mantle.xyz/address/0x66fD8b5411856D42c08D9356e879a6e7dF0c9419) |
| Contract V3 (dead) | `0x460b794FD0afaA04bf3BFFfc6c29386c1Be8C334` — do not use |

---

## Environment Variables

### Frontend — Vercel Dashboard

Go to **Vercel → Project → Settings → Environment Variables** and add:

```
VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=0x66fD8b5411856D42c08D9356e879a6e7dF0c9419
VITE_NFT_CONTRACT_ADDRESS=0x66fD8b5411856D42c08D9356e879a6e7dF0c9419
VITE_GCP_BACKEND_URL=https://mantle-agentic-event-21898396920.asia-southeast1.run.app
```

### Backend — Cloud Run

```
CONTRACT_ADDRESS=0x66fD8b5411856D42c08D9356e879a6e7dF0c9419
CHAIN_ID=5003
```

Secrets (via GCP Secret Manager):
- `MINTER_SERVICE_PRIVATE_KEY` — minter service wallet (`0xCBA7951...`), holds `MINTER_ROLE` on V4. Used for admin ops and `recordExecutedProposal()`.
- `LLM_API_KEY` — Gemini API key
- `YOUTUBE_API_KEY` — YouTube Data API key

> **Note:** Always create secrets with `echo -n "VALUE" | ...` to avoid trailing newlines.

### Local Development

Copy `.env` and set:

```
VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=0x66fD8b5411856D42c08D9356e879a6e7dF0c9419
VITE_GCP_BACKEND_URL=http://localhost:8080
```

---

## Smart Contracts

### MAEFDynamicNFTV4 — **ACTIVE**

**Address:** `0x66fD8b5411856D42c08D9356e879a6e7dF0c9419`
**File:** `contracts/contracts/MAEFNFTV4.sol` (16.7 KB / 24 KB limit)
**Deployed:** 17 May 2026 — Mantle Sepolia Testnet

| Function | Description |
|----------|-------------|
| `spawnAgent(agentWallet)` | Payable 1 MNT — registers agent, sets `isAgentSpawned=true`, provisions 0.5 MNT gas reserve |
| `spawnBredAgent(agentWallet, offspringId)` | Payable 1 MNT — links offspring to BreedRecord, sets genetic traits on-chain |
| `mintAttendanceNFT(...)` | Mint proof-of-attendance NFT — dual-auth: `MINTER_ROLE` OR `isAgentSpawned[msg.sender]` |
| `batchMintAttendanceNFTs(...)` | ERC-721A bulk mint — gas-efficient |
| `breedAgents(p1, p2, offspringId, generation, heritageScore)` | Payable 2.5 MNT — records breed on-chain |
| `recordExecutedProposal(agentWallet, proposalHash)` | MINTER_ROLE only — HITL governance, +5 heritageScore |
| `recordGasSpent(agentWallet, gasAmount)` | MINTER_ROLE only — tracks autonomous gas usage |
| `grantMinterRole(address)` | Admin only |
| `withdraw()` | Admin only — sweep breed fees |
| `getAgentStats(wallet)` | Returns full AgentStats struct |
| `getTotalMinted()` | Returns total NFT count |

**Key Events:**
- `NFTMinted(tokenId, agentWallet, eventTitle, agentName, agentLevel, timestamp)`
- `AgentsBred(user, offspringKey, parent1Wallet, parent2Wallet, generation, heritageScore, cost)`
- `WisdomUnlocked(agentWallet, totalEvents)`
- `ProposalExecuted(agentWallet, proposalHash)`

**Roles:**
- Deployer `0xe52bb4B913B83A71d0d2deD47683B1154bf2560b` — `DEFAULT_ADMIN_ROLE`
- Minter Service `0xCBA7951a8b5AE81303AC5E1017e34bF50A342D22` — `MINTER_ROLE`

---

## Transaction Signing Architecture

**Mode B — True Agentic Autonomy (default for funded agents):**
```
Agent Wallet (e.g. 0x9AE...818C)
  ├── isAgentSpawned = true on V4
  ├── private key in Firestore (KMS-encrypted)
  └── backend decrypts key → agent self-signs → agent pays own gas
```

**Mode A — Minter Service (admin / explicit only):**
```
Minter Service (0xCBA7951...)
  ├── holds MINTER_ROLE on V4
  └── used for: recordExecutedProposal(), explicit Mode A
      NOT for regular minting
```

**Re-spawning V3-era agents on V4** (required for Mode B on old agents):
1. Go to V4 on MantleScan → Write Contract → `spawnAgent(agentWallet)` + 1 MNT
2. This sets `isAgentSpawned[agentWallet] = true` → agent can self-sign

---

## Grant MINTER_ROLE (one-time setup after new deploy)

```bash
cd contracts
MINTER_WALLET=0xCBA7951a8b5AE81303AC5E1017e34bF50A342D22 \
  npx hardhat run scripts/grant-minter-role.js --network mantleSepolia
```

---

## Local Development

```bash
# Frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080

# Contracts (deploy)
cd contracts
npm install
npx hardhat run scripts/deploy.js --network mantleSepolia
```

---

## Architecture

```
User Browser
  └─ React + Vite (Vercel)
       └─ Cloud Run (FastAPI backend)
            ├─ Firestore (agent state, events, scout logs, proposals)
            ├─ GCP KMS (agent private key encryption)
            ├─ Gemini 2.5 Flash (wisdom, chat, scout scoring, proposals)
            ├─ YouTube Data API (Auto Scout event discovery)
            ├─ Web3.py → Mantle Sepolia RPC
            │    └─ MAEFDynamicNFTV4 (mint + breed + HITL)
            └─ Cloud Scheduler (auto-scout every 4h, OIDC-protected)
```

### Agent Lifecycle
1. **Spawn** — User pays 1 MNT → `spawnAgent()` on V4 → agent wallet gets 0.5 MNT gas reserve + `isAgentSpawned=true`
2. **Attend** — Agent self-signs `mintAttendanceNFT()` → earns Wisdom NFT → levels up
3. **Auto Scout** — Cloud Scheduler → Secretary discovers YouTube event → Gemini scores → agent mints autonomously
4. **Wisdom Unlock** — After 5 events, agent unlocks Wisdom mode
5. **Breed** — User pays 2.5 MNT → `breedAgents()` → backend creates offspring with inherited traits
6. **HITL Proposals** — Gemini generates proposals → user approves → `recordExecutedProposal()` on-chain

### Neural Fusion (Agent Breeding)
1. User pays 2.5 MNT via MetaMask → `breedAgents(p1, p2, offspringId, generation, heritageScore)` on V4
2. Backend verifies tx (`AgentsBred` event, age < 1h, correct contract)
3. Offspring inherits: genetic traits, parent niches, lineage narrative, Wisdom Heritage Score
4. `spawnBredAgent(offspringWallet, offspringId)` registers offspring on V4 → Mode B enabled
