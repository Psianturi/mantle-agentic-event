# ASAJU AI

ASAJU AI gives people autonomous on-chain agents that turn digital events into AI summaries and Proof-of-Attendance NFTs. The original MAEF contract name remains in the codebase and deployed contracts.

> **Live:** [asaju.vercel.app](https://asaju.vercel.app)

## Status Snapshot 

- **Active contracts:** Mantle Sepolia and Ethereum Sepolia contracts are deployed; the minter service wallet has the required role on both. Fees (`spawnFee`, `agentProvision`, `breedCost`) are owner-mutable per chain via `setFees()`/`setBreedCost()` — each chain is calibrated independently rather than sharing one hardcoded value.
- **Multi-chain frontend wiring:** chain selection is propagated through spawn, wallet funding, event attendance, gas monitoring/top-up, event history, balances, and explorer links. **Ethereum Sepolia end-to-end verified** — spawn → on-chain `spawnAgent()` → Mode B self-signed mint, all confirmed on a live redeployed contract.
- **YouTube-only event attendance:** agents attend and mint from YouTube videos exclusively — Luma auto-RSVP and the Eventbrite/Zoom placeholders were removed as unsupported dead surface (no real API integration ever backed them).
- **Still pending config:** `AUTONOMOUS_VAULT_ADDRESS` is not yet active in runtime config.

---

## What Is ASAJU AI?

ASAJU AI lets you spawn agents that build persistent knowledge from events. Each agent:

- **Autonomously attends** YouTube videos and livestreams
- **Mints Proof-of-Attendance NFTs** on Mantle after generating AI summaries
- **Evolves** through 5 levels, unlocking progressively autonomous capabilities
- **Generates strategic proposals** for human approval (HITL governance)
- **Breeds with other agents** to produce offspring with inherited wisdom

---

## Live Deployments

| Component | URL / Address |
|-----------|--------------|
| Frontend | https://asaju.vercel.app |
| Backend (Cloud Run) | https://mantle-agentic-event-21898396920.asia-southeast1.run.app |
| **Mantle Sepolia V4** | [`0x66fD8b5411856D42c08D9356e879a6e7dF0c9419`](https://explorer.sepolia.mantle.xyz/address/0x66fD8b5411856D42c08D9356e879a6e7dF0c9419) |
| **Ethereum Sepolia V4** | [`0x9FEF11E45cFD550b33F13A31E8d80BE61cda80f4`](https://sepolia.etherscan.io/address/0x9FEF11E45cFD550b33F13A31E8d80BE61cda80f4) — redeployed 16 Aug 2026, fee-configurable |
| Ethereum Sepolia (orphaned) | `0x110edEa5DB874589ec4492d15660082634E173f0` — do not use, no agents were ever spawned on it |
| Contract V3 (deprecated) | `0x460b794FD0afaA04bf3BFFfc6c29386c1Be8C334` — do not use |

---

## Full Agent Lifecycle

```
1. SPAWN     User pays the configured testnet fee → spawnAgent() on the selected V4 contract
             Agent wallet gets its configured native-token gas reserve + isAgentSpawned=true
             Agent receives unique identity, personality, niche, sub-agent squad

2. ATTEND    User submits event URL → Secretary sub-agent registers
             Scribe sub-agent extracts transcript/content
             Gemini generates AI wisdom summary + classifies the event's actual
             content category → agent's skill_scores grow for that category
             (independent of the agent's static niche — see Skill Scores below)
             Agent self-signs mintAttendanceNFT() → Proof-of-Attendance NFT minted

3. AUTO      Cloud Scheduler fires every 6h → Secretary discovers YouTube events
   SCOUT     Gemini scores event relevance (0–100) for agent's niche
             Agent autonomously attends & mints if score ≥ dynamic threshold (80/90/95)

4. EVOLVE    Agent levels up as it attends more events
             Level 3 → Strategic Consult (HITL) unlocked
             Level 4 → Wisdom Synthesis + Neural Fusion eligibility

5. PROPOSE   Gemini generates niche-specific strategic proposals
   (HITL)    User reviews and approves on-chain via MetaMask
             +5 Heritage Score per approved proposal on V4

6. BREED     User selects 2 level-3+ agents on the SAME chain → pays breedCost
   (Mantle: 2 MNT · Ethereum Sepolia: 0.04 ETH) → breedAgents() on V4
             Offspring inherits genetic traits, niches, Wisdom Heritage Score
             Gemini generates unique Lineage Biography
             spawnBredAgent() registers offspring → agent gas provision transferred
```

---

## Evolution Path

Each agent progresses through 5 levels as it attends more events:

| Level | Title | Events Required | Key Capabilities |
|-------|-------|----------------|-----------------|
| 1 | Event Summarization & NFT Minting | 0 | Autonomous attendance, AI summaries, Proof-of-Attendance NFTs, sub-agent coordination |
| 2 | Multi-Platform Integration | 2 | Multi-platform monitoring, community sentiment analysis, enhanced transcript processing, gas optimization |
| 3 | Strategic Consult (HITL) | 4 | **Live:** AI generates on-chain proposals, +5 Heritage Score per approval, agent learns from rejections, cross-event pattern recognition |
| 4 | Wisdom Synthesis & Neural Fusion | 6 | Full Wisdom Report (niche-specific insights), Neural Fusion eligibility (breed with another agent), offspring inherits heritage score |
| 5 | Semi-Autonomous Action Execution | 8 | *(Roadmap)* Agent executes approved proposals autonomously, full on-chain transaction authority |

---

## Operational Limits and Guardrails

- **Spawn quota:** max **3 directly spawned agents per wallet on each supported network** (`ownership_status != "bred"` counted). Bred offspring do not consume this quota.
- **Breed constraints:** parent level 3+, max 3 breedings per parent, 24h cooldown, and no self-breeding.
- **Mode B gas autonomy:** agents need gas balance for autonomous signing. If out of gas, top-up is required before retry.

---

## Known Gaps (Current) and Priority Improvements


1. **Wallet compatibility hardening**
  - Current UX and error copy is still MetaMask-centric in some paths.
  - Improve injected provider detection/selection so other EIP-1193 wallets connect reliably.

2. **E2E verification on Cloud Run**
  - The YouTube attend → mint flow should be validated repeatedly as an end-to-end demo path under production latency.

3. **`App.tsx` frontend maintainability**
  - Single ~2,500-line component holding most app state and handlers. No frontend tests. Refactor into hooks/views is planned before further UI-heavy features (skill profile display, public-analyst posting) land on top of it.

4. **Metric definition reconciliation**
  - `total_wisdom_nfts` and `total_events_attended` use different backend sources and should not be compared until unified.

5. **Demo-first resilience checks**
  - Validate spawn quota messaging and bred-agent behavior are clearly communicated in UI.

6. **Skill score display**
  - `skill_scores` (per-category, grown from actual attended-event content — see below) is live on the backend and in `SpawnResponse`, but has no frontend UI yet.



---

### Strategic Consult — Human-in-the-Loop (HITL)

Available at Level 3+. The agent's Gemini AI analyzes all attended events and generates **context-aware strategic proposals** specific to the agent's niche and knowledge base.

**Flow:**
1. Agent generates proposal via Gemini (cross-event pattern analysis)
2. Proposal appears in the agent's "Strategic Consult" panel
3. User reviews and clicks **Approve** → MetaMask signs → `recordExecutedProposal()` on V4
4. Agent earns **+5 Heritage Score** on-chain per approved proposal
5. User clicks **Reject** → agent learns from feedback, proposal refined

Each proposal is a unique `bytes32` hash committed on-chain, creating an immutable record of the agent's strategic evolution.

---

### Neural Fusion (Agent Breeding)

Two agents with Level 3+ can merge their intelligence to produce a second-generation offspring.

**Flow:**
1. User selects 2 parent agents on the same chain → clicks **Neural Fusion**
2. MetaMask prompt: `breedAgents(p1Wallet, p2Wallet, offspringId, generation, heritageScore)` — costs `breedCost` for that chain (Mantle: 2 MNT, Ethereum Sepolia: 0.04 ETH)
3. Backend verifies the `AgentsBred` event on-chain, extracts the exact `offspringKey` (bytes32)
4. Offspring inherits:
   - Personality and niche (deterministically blended from parents)
   - Genetic traits (`Cross-Domain Intelligence`, `Legendary Wisdom Heritage`, etc.)
   - Wisdom Heritage Score (0–100 rarity metric)
   - Inherited event docs from both parents
5. Gemini generates a unique **Lineage Biography** narrative
6. Backend calls `spawnBredAgent(offspringWallet, offspringKey)` → offspring gets `agentProvision` in gas + V4 registration
7. Offspring shows **Sovereign Mode Active** and can autonomously mint NFTs

**Guardrails:** Same agent cannot breed with itself; each parent limited to 3 breeds; 24h cooldown; offspring ID is deterministic (idempotent re-submission).

---

### Auto Scout

Cloud Scheduler (every 6h) triggers automatic event discovery and attendance:

1. Scheduler calls `POST /api/v1/scheduler/run-all-scouts` (OIDC-protected)
2. For each agent with `auto_scout_enabled=true`:
   - Secretary sub-agent searches YouTube for events matching agent's niche
   - Gemini Flash scores relevance (0–100), rationale, and event quality
   - Mint threshold is dynamic based on agent gas balance: ≥0.15 MNT → 80, ≥0.08 MNT → 90, <0.08 MNT → 95
   - If score ≥ threshold: agent automatically attends and mints an NFT
   - Scout log written to Firestore — visible in agent's **Decision Log**

Users can enable/disable Auto Scout per agent and configure the check interval.

---

### Skill Scores

Each agent has a `niche` chosen at spawn time (fixed) — but its **skill** is separate and grows dynamically. On every successful attend+mint, Gemini classifies the event's actual content category from its wisdom summary (not the agent's preset niche) into one of the spawn-dialog niche options, plus `"Other"` for anything that doesn't clearly fit. That category's score in `skill_scores` increments by 1.

This means an agent's demonstrated expertise reflects what it actually attended — including events outside its home niche via manual "Attend Event" (which, unlike Auto Scout, isn't niche-restricted) — rather than a static label repeated for every event. `skill_scores` is exposed on `SpawnResponse`; no frontend display yet (see Known Gaps).

---

### Wisdom Reports

After attending 5+ events, agents unlock the ability to generate a **Wisdom Report** — a Gemini-powered cross-event analysis specific to the agent's niche. Reports include:

- Identified macro trends across all attended events
- Niche-specific strategic opportunities
- Key insights and actionable recommendations
- Heritage score contributing to Neural Fusion rarity

---

### Memory Echoes (Agent Chat)

Each agent maintains a persistent memory of all events it attended. The chat interface allows users to converse with their agent, which answers with awareness of its full event history, niche, personality, and lineage narrative (for bred offspring).

---

## Sub-Agent Architecture

Each agent coordinates a squad of 4 specialized sub-agents:

| Sub-Agent | Role |
|-----------|------|
| **Secretary** | Auto Scout discovery, event metadata resolution |
| **Scribe** | Content extraction, transcript processing, AI summarization |
| **Social-Lite** | Community sentiment monitoring, social signal analysis |
| **Mint-Master** | Gas fee optimization, NFT minting coordination |

---

## Architecture

```
User Browser (React + Vite → Vercel)
  │
  ├─ Injected EIP-1193 wallet (MetaMask / compatible wallet — pays for spawn/breed)
  │
  └─ Cloud Run (FastAPI backend)
       ├─ Firestore        — agent state, events, scout logs, proposals
       ├─ GCP KMS          — agent private key encryption
       ├─ GCP Secret Mgr   — MINTER_SERVICE_PRIVATE_KEY, LLM_API_KEY, YOUTUBE_API_KEY
       ├─ Gemini 2.5 Flash — wisdom, chat, scout scoring, HITL proposals
       ├─ YouTube Data API — Auto Scout event discovery
      ├─ Web3.py          — per-chain RPC and contract cache
      │    ├─ Mantle Sepolia MAEFDynamicNFTV4 (0x66fD...)
      │    └─ Ethereum Sepolia MAEFDynamicNFTV4 (0x9FEF...)
       │         ├─ spawnAgent / spawnBredAgent
       │         ├─ mintAttendanceNFT / batchMint
       │         ├─ breedAgents
       │         └─ recordExecutedProposal (HITL)
       └─ Cloud Scheduler  — auto-scout every 6h (OIDC-protected)
```

---

## Smart Contract V4 — MAEFDynamicNFTV4

Same source (`contracts/contracts/MAEFNFTV4.sol`) deployed independently per chain. Fees are **not** hardcoded — `spawnFee`, `agentProvision`, and `breedCost` are owner-mutable (`setFees()`, `setBreedCost()`), calibrated per chain to that chain's testnet faucet economics rather than sharing one value everywhere.

| Chain | Address | Deployed | spawnFee | agentProvision | breedCost |
|-------|---------|----------|----------|-----------------|-----------|
| Mantle Sepolia (5003) | [`0x66fD...c9419`](https://explorer.sepolia.mantle.xyz/address/0x66fD8b5411856D42c08D9356e879a6e7dF0c9419) | 17 May 2026 | 1 MNT | 0.5 MNT | 2 MNT |
| Ethereum Sepolia (11155111) | [`0x9FEF...a80f4`](https://sepolia.etherscan.io/address/0x9FEF11E45cFD550b33F13A31E8d80BE61cda80f4) | 16 Aug 2026 | 0.02 ETH | 0.01 ETH | 0.04 ETH |

Adding a new chain: `contracts/scripts/deploy-new-chain.js` deploys and calibrates fees in one step — add an entry to its `FEES_PER_CHAIN` map, run it, then point `src/lib/blockchain/chains.ts` + `backend/core/config.py` `CHAIN_CONFIGS` at the new address.

| Function | Description |
|----------|-------------|
| `spawnAgent(agentWallet)` | Registers agent, provisions `agentProvision` in gas reserve, sets `isAgentSpawned=true` |
| `spawnBredAgent(agentWallet, offspringId)` | Links offspring to BreedRecord, activates Mode B for offspring |
| `mintAttendanceNFT(...)` | Proof-of-Attendance NFT — dual-auth: `MINTER_ROLE` OR spawned agent self-signs |
| `breedAgents(p1, p2, offspringId, gen, score)` | Records breed on-chain, emits `AgentsBred` event. Both parents must be on the same chain. |
| `recordExecutedProposal(agentWallet, hash)` | HITL governance — MINTER_ROLE only, +5 Heritage Score |
| `setFees(spawnFee, agentProvision)` / `setBreedCost(cost)` | Owner-only economics calibration, atomic with an invariant so `agentProvision` can never exceed `spawnFee` |
| `getAgentStats(wallet)` | Returns full AgentStats struct |

**Key Events:**
- `NFTMinted(tokenId, agentWallet, eventTitle, agentName, agentLevel, timestamp)`
- `AgentsBred(user, offspringKey, parent1Wallet, parent2Wallet, generation, heritageScore, cost)`
- `WisdomUnlocked(agentWallet, totalEvents)`
- `ProposalExecuted(agentWallet, proposalHash, proposalsApprovedTotal, heritageScoreAfter)`

**Roles:**
- Deployer `0xe52bb4B913B83A71d0d2deD47683B1154bf2560b` — `DEFAULT_ADMIN_ROLE`
- Minter Service `0xCBA7951a8b5AE81303AC5E1017e34bF50A342D22` — `MINTER_ROLE`

---

## Transaction Signing Architecture

### Mode B — Agent Self-Signs (True Autonomy)

```
Agent Wallet (e.g. 0x9AE...818C)
  ├── holds 0.5 MNT from spawnAgent() gas reserve
  ├── isAgentSpawned = true on V4 contract
  ├── private key encrypted with KMS, stored in Firestore
  └── backend decrypts key → agent self-signs mintAttendanceNFT()
      → agent wallet pays its own gas
```

Default for all agents after spawning. Represents true agentic autonomy.

### Mode A — Minter Service Signs (Admin / Fallback)

```
Minter Service (0xCBA7951...)
  ├── holds MINTER_ROLE on V4
  └── used for: recordExecutedProposal(), explicit Mode A, Mode B fallback
```

Only for admin operations. Regular minting uses Mode B.

---

## Environment Variables

### Frontend — Vercel Dashboard

```
VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=0x66fD8b5411856D42c08D9356e879a6e7dF0c9419
VITE_NFT_CONTRACT_ADDRESS=0x66fD8b5411856D42c08D9356e879a6e7dF0c9419
VITE_GCP_BACKEND_URL=https://mantle-agentic-event-21898396920.asia-southeast1.run.app
```

### Backend — Cloud Run

```
CONTRACT_ADDRESS=0x66fD8b5411856D42c08D9356e879a6e7dF0c9419
CHAIN_ID=5003
GCP_PROJECT_ID=agentic-event-factory
USE_SECRET_MANAGER=true
KMS_KEY_NAME=projects/agentic-event-factory/locations/asia-southeast1/keyRings/maef-keyring/cryptoKeys/agent-key
```

GCP Secret Manager secrets:
- `MINTER_SERVICE_PRIVATE_KEY` — minter wallet, holds `MINTER_ROLE`
- `LLM_API_KEY` — Gemini API key
- `YOUTUBE_API_KEY` — YouTube Data API key (enables Auto Scout)

> Always create secrets with `echo -n "VALUE" | ...` — trailing newlines break eth_account.

### Local Development

```bash
# Frontend
cp .env.example .env
# Set: VITE_GCP_BACKEND_URL=http://localhost:8080
npm install && npm run dev

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in values
uvicorn main:app --reload --port 8080
```

---

## Grant MINTER_ROLE (after new contract deploy)

```bash
cd contracts
MINTER_WALLET=0xCBA7951a8b5AE81303AC5E1017e34bF50A342D22 \
  npx hardhat run scripts/grant-minter-role.js --network mantleSepolia
```

---

## Roadmap

- [ ] **Level 5** — Semi-autonomous proposal execution (no human click required)
- [ ] **Marketplace V4** — Buy/sell agents with `spawnBredAgent` limit per original creator
- [ ] **Retire / Archive flow** — Soft-delete with auto-sweep of agent assets
- [ ] **Multi-agent wisdom consensus** — Cross-agent insights from the same niche cohort
- [ ] **Gas warning banner** — Alert when agent gas balance drops below 0.08 MNT
- [ ] **AUTONOMOUS_VAULT_ADDRESS** — Configure multisig vault for Option A DeFi proposal execution
