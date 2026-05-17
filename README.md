# MAEF — Mantle Agentic Event Factory

AI agents that autonomously attend events, earn NFTs, and evolve through neural fusion — built on Mantle blockchain.

---

## Live Deployments

| Component | URL |
|-----------|-----|
| Frontend | https://mantle-agentic-event.vercel.app |
| Backend (Cloud Run) | https://mantle-agentic-event-21898396920.asia-southeast1.run.app |
| Contract V3 (Active) | [`0x460b794FD0afaA04bf3BFFfc6c29386c1Be8C334`](https://explorer.sepolia.mantle.xyz/address/0x460b794FD0afaA04bf3BFFfc6c29386c1Be8C334) |

---

## Environment Variables

### Frontend — Vercel Dashboard

Go to **Vercel → Project → Settings → Environment Variables** and add:

```
VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=0x460b794FD0afaA04bf3BFFfc6c29386c1Be8C334
VITE_CLOUD_RUN_BASE_URL=https://mantle-agentic-event-21898396920.asia-southeast1.run.app
```

### Backend — Cloud Run

Set via `gcloud run services update maef-backend --region asia-southeast1 --update-env-vars`:

```
CONTRACT_ADDRESS=0x460b794FD0afaA04bf3BFFfc6c29386c1Be8C334
NETWORK=mantle-sepolia
```

Secrets (via Secret Manager, already configured):
- `AGENT_PRIVATE_KEY` — backend minter wallet private key
- `LLM_API_KEY` — Gemini API key
- `YOUTUBE_API_KEY` — YouTube Data API key

### Local Development

Copy `.env.example` to `.env` and fill in:

```
VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=0x460b794FD0afaA04bf3BFFfc6c29386c1Be8C334
VITE_CLOUD_RUN_BASE_URL=http://localhost:8080
```

---

## Smart Contracts

### MAEFNFT (V3) — ACTIVE
**Address:** `0x460b794FD0afaA04bf3BFFfc6c29386c1Be8C334`
**File:** `contracts/contracts/MAEFNFTContract.sol`

| Function | Description |
|----------|-------------|
| `mintAttendanceNFT(...)` | Mint proof-of-attendance NFT — requires `MINTER_ROLE` |
| `breedAgents(p1, p2, offspringId)` | Payable 2.5 MNT — records breed on-chain, emits `AgentsBred` |
| `grantMinterRole(address)` | Owner-only — grants `MINTER_ROLE` to backend wallet |
| `revokeMinterRole(address)` | Owner-only — revokes `MINTER_ROLE` |
| `setBreedCost(uint256)` | Owner-only — update breed fee |
| `withdraw()` | Owner-only — sweep accumulated breed fees |
| `getAgentTokenIds(wallet)` | Returns all token IDs minted to an agent wallet |
| `getEventDetails(tokenId)` | Returns event metadata for a specific NFT |
| `getTotalMinted()` | Returns total NFT count |

**Events:**
- `NFTMinted(tokenId, agentWallet, eventTitle, agentName, timestamp)`
- `AgentsBred(user, offspringKey, parent1Wallet, parent2Wallet, cost)`

**Roles:**
- Deployer `0xe52bb4B913B83A71d0d2deD47683B1154bf2560b` — has `DEFAULT_ADMIN_ROLE` + `MINTER_ROLE` via constructor
- Backend minter wallet — must be granted `MINTER_ROLE` via `grantMinterRole()`

### MAEFDynamicNFT (ERC721A) — NOT DEPLOYED / INACTIVE
**File:** `contracts/contracts/MAEFNFTERC721A.sol`

Old design using ERC721A (gas-optimized batch mint). Features `spawnAgent()` with spawn fee, `batchMintAttendanceNFTs()`, dynamic `tokenURI()` based on agent level, `AgentLevelUp` and `WisdomUnlocked` events. Not used — superseded by MAEFNFT V3.

---

## Grant MINTER_ROLE (one-time setup)

After deploying a new contract or rotating the backend wallet, grant minter access:

```bash
cd contracts
MINTER_WALLET=0x<backend-minter-address> npx hardhat run scripts/grant-minter-role.js --network mantleSepolia
```

The script checks if the role is already granted before sending a transaction.

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
            ├─ Firestore (agent state, events, scout logs)
            ├─ Gemini 2.0 Flash (LLM: chat, wisdom, scoring)
            ├─ YouTube Data API (event discovery)
            ├─ Web3.py → Mantle Sepolia RPC
            │    └─ MAEFNFT V3 Contract (NFT mint + breed)
            └─ Cloud Scheduler (auto-scout every 4h, OIDC-protected)
```

### Neural Fusion (Agent Breeding)
1. User pays 2.5 MNT via MetaMask → `breedAgents()` on-chain
2. Backend verifies tx (`AgentsBred` event, age < 1h, correct contract)
3. Offspring inherits: genetic traits, parent event summaries, lineage narrative
4. Wisdom Heritage Score (0-100) quantifies genetic quality
5. Offspring appears in agent card with DNA badge + "Born from X x Y" tooltip
