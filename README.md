# MAEF — Mantle Agentic Event Factory

AI agents that autonomously attend events, earn on-chain NFTs, and evolve into sovereign intelligence through neural fusion — built on Mantle blockchain.

> **Live:** [mantle-agentic-event.vercel.app](https://mantle-agentic-event.vercel.app)

## Status Snapshot 

- **Production-verified:** agent connect to Luma, auto-RSVP a real Luma event, then continue through `attend` and mint/update state on Mantle Sepolia.
- **Luma auth hardening:** OTP + password login supported, session cookies stored KMS-encrypted in Firestore, valid sessions reused without forcing re-login.
- **Dual-State Luma hardening:** future events now rely on `start_at` extracted from `__NEXT_DATA__`, JSON-LD, or embedded page metadata before falling back to OpenGraph-only parsing.
- **Upcoming Scouts sync:** frontend derives Luma scheduled/completed state from `lumaStartAt`, so future events stay visible in the NFT Vault's **Upcoming Scouts** tab.
- **ELFA in production:** `ELFA_API_KEY` is active in Cloud Run (rev `00122`, 21 May 2026); event enrichment now runs in production with graceful degradation fallback.
- **Still pending config:** `AUTONOMOUS_VAULT_ADDRESS` is not yet active in runtime config.

---

## What Is MAEF?

MAEF lets you spawn AI agents that work for you 24/7 in the Web3 knowledge economy. Each agent:

- **Autonomously attends** digital events (YouTube live, conferences, webinars)
- **Mints Proof-of-Attendance NFTs** on Mantle after generating AI summaries
- **Evolves** through 5 levels, unlocking progressively autonomous capabilities
- **Generates strategic proposals** for human approval (HITL governance)
- **Breeds with other agents** to produce offspring with inherited wisdom

---

## Live Deployments

| Component | URL / Address |
|-----------|--------------|
| Frontend | https://mantle-agentic-event.vercel.app |
| Backend (Cloud Run) | https://mantle-agentic-event-21898396920.asia-southeast1.run.app |
| **Contract V4 (ACTIVE)** | [`0x66fD8b5411856D42c08D9356e879a6e7dF0c9419`](https://explorer.sepolia.mantle.xyz/address/0x66fD8b5411856D42c08D9356e879a6e7dF0c9419) |
| Contract V3 (deprecated) | `0x460b794FD0afaA04bf3BFFfc6c29386c1Be8C334` — do not use |

---

## Full Agent Lifecycle

```
1. SPAWN     User pays 1 MNT → spawnAgent() on V4
             Agent wallet gets 0.5 MNT gas reserve + isAgentSpawned=true
             Agent receives unique identity, personality, niche, sub-agent squad

2. ATTEND    User submits event URL → Secretary sub-agent registers
             Scribe sub-agent extracts transcript/content
             Gemini generates AI wisdom summary
             Agent self-signs mintAttendanceNFT() → Proof-of-Attendance NFT minted

3. AUTO      Cloud Scheduler fires every 4h → Secretary discovers YouTube events
   SCOUT     Gemini scores event relevance (0–100) for agent's niche
             Agent autonomously attends & mints if score ≥ 60

4. EVOLVE    Agent levels up as it attends more events
             Level 3 → Strategic Consult (HITL) unlocked
             Level 4 → Wisdom Synthesis + Neural Fusion eligibility

5. PROPOSE   Gemini generates niche-specific strategic proposals
   (HITL)    User reviews and approves on-chain via MetaMask
             +5 Heritage Score per approved proposal on V4

6. BREED     User selects 2 level-3+ agents → pays 2.5 MNT → breedAgents() on V4
             Offspring inherits genetic traits, niches, Wisdom Heritage Score
             Gemini generates unique Lineage Biography
             spawnBredAgent() registers offspring → 0.5 MNT provisioned
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

## Key Features

### Luma Event Integration (Dual-State Engine)

Agents can attend live events on [lu.ma](https://lu.ma) — not just YouTube recordings.

**Dual-State Logic:**
- **Future event (scheduled):** Agent generates a *Scouting Brief* — predictive analysis using ELFA market signals. No NFT minted yet. Saved to "Upcoming Scouts" in NFT Vault.
- **Past event (completed):** Full Wisdom NFT minted on Mantle. XP awarded.
- **Unknown timestamp fallback:** If Luma blocks richer metadata, MAEF falls back to embedded page metadata before treating the event as unknown. This reduces false mints for future events.

**Luma Auto-RSVP Flow:**
1. User connects Luma account via OTP (email → 6-digit code, Playwright-driven)
2. Session encrypted with GCP KMS, stored in Firestore (multi-instance safe)
3. On event attend: agent auto-RSVPs via headless Chromium before minting NFT
4. "Already connected" detection — re-uses valid session without re-prompting OTP
5. Re-connect button for forced session refresh
6. Refreshed Luma cookies are persisted back to Firestore after RSVP, keeping long-lived sessions warm

**Luma Fetch Cascade:**
1. Official Luma API (requires LUMA_API_KEY)
2. `httpx` + `__NEXT_DATA__` JSON parse
3. `httpx` + schema.org JSON-LD / embedded event metadata (`startDate`, `start_at`, `eventStatus`)
4. `httpx` + OpenGraph meta tags
5. Domain fallback

**Stale status prevention:** If a Scouting Brief was saved when the event was future but the event date has now passed, the frontend re-evaluates status dynamically from `lumaStartAt` — it appears as "completed" (not stuck as "scheduled" forever).

---

### ELFA Market Intelligence Layer

> Runtime note: ELFA is enabled in production. If ELFA API is slow/unavailable, MAEF degrades gracefully to `None` and continues the pipeline.

Every Luma event attend triggers a parallel **ELFA API** call to enrich Gemini with real-time social signals.

**Pipeline:**
```
Luma fetch → determine_elfa_query(title, niche) → asyncio.create_task(ELFA)
                                                          │
              [Firestore key load runs here in parallel]  │
                                                          ↓
                                              elfa_signals = await elfa_task
                                                          │
                                              Gemini sees "REAL-TIME MARKET INTELLIGENCE"
                                              section with velocity_24h + sentiment_bullish_pct
```

**Hybrid query:** Scans event title for crypto keywords first, falls back to niche-based ticker.  
**Graceful degradation:** Returns `None` on timeout/error — never blocks the pipeline.  
**Stored:** `elfa_signals` snapshot persisted per event record in Firestore.

---

## Operational Limits and Guardrails

- **Spawn quota:** max **3 directly spawned agents** per wallet (`ownership_status != "bred"` counted). Bred offspring do not consume this spawn quota.
- **Breed constraints:** parent level 3+, max 3 breedings per parent, 24h cooldown, and no self-breeding.
- **Mode B gas autonomy:** agents need gas balance for autonomous signing. If out of gas, top-up is required before retry.
- **Luma automation safety:** OTP/password flow is supported; valid encrypted sessions are reused to avoid repeated login friction.

---

## Known Gaps (Current) and Priority Improvements


1. **Wallet compatibility hardening**
  - Current UX and error copy is still MetaMask-centric in some paths.
  - Improve injected provider detection/selection so other EIP-1193 wallets connect reliably.

2. **E2E Luma reliability verification on Cloud Run**
  - OTP and RSVP flows are implemented, but should be validated repeatedly as an end-to-end demo path under production latency.

3. **Demo-first resilience checks**
  - Validate spawn quota messaging and bred-agent behavior are clearly communicated in UI.
  - Keep ELFA graceful degradation visible and non-blocking in logs/toasts.



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
1. User selects 2 parent agents → clicks **Neural Fusion**
2. MetaMask prompt: `breedAgents(p1Wallet, p2Wallet, offspringId, generation, heritageScore)` — costs **2.5 MNT**
3. Backend verifies the `AgentsBred` event on-chain, extracts the exact `offspringKey` (bytes32)
4. Offspring inherits:
   - Personality and niche (deterministically blended from parents)
   - Genetic traits (`Cross-Domain Intelligence`, `Legendary Wisdom Heritage`, etc.)
   - Wisdom Heritage Score (0–100 rarity metric)
   - Inherited event docs from both parents
5. Gemini generates a unique **Lineage Biography** narrative
6. Backend calls `spawnBredAgent(offspringWallet, offspringKey)` → offspring gets 0.5 MNT + V4 registration
7. Offspring shows **Sovereign Mode Active** and can autonomously mint NFTs

**Guardrails:** Same agent cannot breed with itself; each parent limited to 3 breeds; 24h cooldown; offspring ID is deterministic (idempotent re-submission).

---

### Auto Scout

Cloud Scheduler (every 4h) triggers automatic event discovery and attendance:

1. Scheduler calls `POST /api/v1/scheduler/run-all-scouts` (OIDC-protected)
2. For each agent with `auto_scout_enabled=true`:
   - Secretary sub-agent searches YouTube for events matching agent's niche
   - Gemini Flash scores relevance (0–100), rationale, and event quality
   - If score ≥ 60: agent automatically attends and mints an NFT
   - Scout log written to Firestore — visible in agent's **Decision Log**

Users can enable/disable Auto Scout per agent and configure the check interval.

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
| **Secretary** | Event registration, calendar management, Auto Scout discovery |
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
       ├─ GCP Secret Mgr   — MINTER_SERVICE_PRIVATE_KEY, LLM_API_KEY, YOUTUBE_API_KEY, ELFA_API_KEY
       ├─ Gemini 2.5 Flash — wisdom, chat, scout scoring, HITL proposals
       ├─ YouTube Data API — Auto Scout event discovery
       ├─ ELFA AI API      — real-time social signals (velocity, sentiment) for Luma events
       ├─ Playwright       — headless Chromium for Luma OTP login + RSVP automation
       ├─ Web3.py          — Mantle Sepolia RPC
       │    └─ MAEFDynamicNFTV4 (0x66fD...)
       │         ├─ spawnAgent / spawnBredAgent
       │         ├─ mintAttendanceNFT / batchMint
       │         ├─ breedAgents
       │         └─ recordExecutedProposal (HITL)
       └─ Cloud Scheduler  — auto-scout every 4h (OIDC-protected)
```

---

## Smart Contract V4 — MAEFDynamicNFTV4

**Address:** `0x66fD8b5411856D42c08D9356e879a6e7dF0c9419`  
**Network:** Mantle Sepolia Testnet (Chain ID 5003)  
**Deployed:** 17 May 2026

| Function | Cost | Description |
|----------|------|-------------|
| `spawnAgent(agentWallet)` | 1 MNT | Registers agent, provisions 0.5 MNT gas reserve, sets `isAgentSpawned=true` |
| `spawnBredAgent(agentWallet, offspringId)` | 1 MNT | Links offspring to BreedRecord, activates Mode B for offspring |
| `mintAttendanceNFT(...)` | gas only | Proof-of-Attendance NFT — dual-auth: `MINTER_ROLE` OR spawned agent self-signs |
| `breedAgents(p1, p2, offspringId, gen, score)` | 2.5 MNT | Records breed on-chain, emits `AgentsBred` event |
| `recordExecutedProposal(agentWallet, hash)` | gas only | HITL governance — MINTER_ROLE only, +5 Heritage Score |
| `getAgentStats(wallet)` | view | Returns full AgentStats struct |

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
- `ELFA_API_KEY` — ELFA AI API key (enables real-time market intelligence for Luma events)

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
