```markdown
# Product Requirements Document (PRD) 
## Project: Mantle Agentic Event Factory (MAEF)
**Status:** Production-Ready MVP  
**Target Ecosystem:** Mantle Network (L2 OP Stack)  
**Author/Copyright Holder:** Posma Janius S  

---

## 🌌 Executive Summary & Vision

MAEF is a decentralized infrastructure platform on the Mantle Network that transforms digital information overload into structured, on-chain knowledge assets. Instead of deploying passive automation bots, MAEF introduces **Autonomous AI Agents as Sovereign Blockchain Citizens**. 

Each agent operates with its own cryptographic identity, independent financial reserves, and data-driven execution loops. Through an integrated Web3 core and advanced LLM orchestrations, agents attend digital events, process transcripts, distill multi-event wisdom, and directly execute on-chain transactions under their own signature authority.

### Experience Qualities
* **Commanding (Mission Control):** The interface acts as a high-density operations center. Users orchestrate, configure, and monitor independent AI workforces executing asynchronous pipelines with total visibility.
* **Futuristic (Cybernetic Sovereignty):** A strict dark-mode aesthetic utilizing pulsing neon accents, hardware-accelerated glassmorphic panels, and live state-driven terminal metrics that emphasize true autonomous execution.
* **Trustworthy (Enterprise-Grade):** High technical reliability achieved through strict error state definitions, zero-knowledge exposure for sensitive parameters, and cryptographic enforcement via enterprise key management systems.

---

## 🏗️ Core Architecture & System Features

### 1. Agent Factory & On-Chain Provisioning (V4 Contract)
* **Functional Specification:** Spawns Parent Agents utilizing the optimized `MAEFNFTV4` contract standard (ERC-721A), anchoring decentralized identity directly to a deterministically generated Ethereum key pair.
* **Web3 Economic Loop:** * User calls `spawnAgent(name, niche)` via MetaMask, depositing **1 MNT** to the V4 Smart Contract (`0x66fD8b5411856D42c08D9356e879a6e7dF0c9419`).
  * The contract stores agent registration records via `isAgentSpawned` mapping and automatically provisions **0.5 MNT** directly to the newly generated agent wallet to establish its independent operability gas reserves.
* **Data Layer:** Encrypts the raw private key using Google Cloud KMS and writes the record to the Firestore `agents` collection under the `private_key_enc` field.
* **Success Criteria:** The agent displays globally across any device on wallet connection, displaying an independent public address, a `level = 1` base tier, and all 4 parallel sub-agent states initialized to `IDLE`.

### 2. Dual-Mode Event Attendance & Real AI Summarization
* **Functional Specification:** Coordinates the asynchronous ingestion of YouTube video transcripts and processes core intellectual assets through Gemini-powered models.
* **The Execution Pipeline:**
  * **Secretary Module:** Resolves URLs, enforces SSRF protections, and invokes the `youtube-transcript-api` to pull raw text data.
  * **Scribe Module:** If a transcript is available, it feeds a dense 512-token prompt to `gemini-2.5-flash` via the `v1beta` API. If unavailable, it executes a 256-token metadata-only fallback prompt.
  * **Mint-Master Module:** Prepares the dynamic NFT metadata payload containing the immutable wisdom excerpt.
* **Signing Modes Logic:**
  * **Mode B (Autonomous Core):** Retrieves the agent's ciphertext from Firestore, decrypts it in-memory via GCP KMS, signs the minting payload directly with the agent's key, and broadcasts the transaction.
  * **Mode A (Administrative Fallback):** If the agent wallet lacks gas or is not registered via `spawnAgent()` on the active V4 contract, the system gracefully shifts execution to the backend Minter Service account (`MINTER_SERVICE_PRIVATE_KEY`) to prevent execution blocks, while delivering the asset to the agent's destination.


```

```
              [User Initiates Attend Event]
                            ↓
             [Backend Fetches Video Transcript]
                            ↓
           [Gemini 2.5 Flash distills Wisdom]
                            ↓
             [Select Execution Signing Mode]
                           ∕ \
                          ∕   \
                 [Mode B]       [Mode A Fallback]
                    ∕               \
   [Decrypt Agent Key via KMS]    [Load Minter Service Key]
                    \               ∕
             [Broadcast Mint to Mantle V4 Contract]

```

```

### 3. Strict Gas Autonomy & On-Chain Top-Up System
* **Functional Specification:** Prevents unauthorized administrative bailouts by enforcing hard transaction walls when an agent exhausts its operational gas budget during Mode B executions.
* **Strict Error Policy:** If a transaction fails due to low gas or contract rejection, the backend stops execution and throws structured error payloads: `AGENT_OUT_OF_GAS`, `AGENT_NOT_AUTHORIZED`, or `MODE_B_STRICT_REJECTED`.
* **On-Chain Remediation:**
  * The frontend catches `AGENT_OUT_OF_GAS` and interrupts the user loop with the `TopUpGasDialog`.
  * The system executes an actual native on-chain MNT transfer directly from the connected user's MetaMask wallet to the destination agent's wallet address.
  * Upon confirmation on the Mantle Network, an automatic retry handler re-triggers the pending Mode B `attendEvent` execution request.

### 4. Consolidated Cross-Event Wisdom Engine
* **Functional Specification:** Aggregates individual data milestones into cross-referenced, high-density strategic intelligence reports.
* **Trigger Condition:** Automatically activates inside the Analytics space upon the compilation of 5 unique event entries under the same agent domain niche.
* **Processing Engine:** Queries the target agent's `agent_events` collection, extracts all historical wisdom payloads, constructs a composite relational prompt, and invokes Gemini cross-analysis.
* **Output Layer:** Returns an advanced strategic analysis structured strictly using `responseMimeType: "application/json"`. The frontend renders this structured insight into an interactive console dashboard and exposes a download pathway generating local, standard Markdown (`.md`) dossiers.

### 5. Genetic Inheritance & Agent Fusion System (Phase 2)
* **Functional Specification:** Allows users to fuse two high-tier parent agents to generate advanced offspring that inherit structured profile states.
* **Inheritance Engine Rules:**
  * **Genealogy Layer:** Offspring generation is enforced dynamically via $G_{\text{offspring}} = \max(G_{\text{parent1}}, G_{\text{parent2}}) + 1$.
  * **Knowledge Base Transfer:** The system injects the historical wisdom text profiles of the parents' last 3 minted NFTs directly into the offspring's core background state block.
  * **Trait Synthesis:** Calculates composite niche preference biases, evaluates personality matrices, and automatically saves the comprehensive entity structure directly into the global Firestore data layer under a unified collection schema.

---

## 🔒 Security Architecture & Guardrails

* **Cryptographic Sovereignty (GCP KMS):** Plaintext private keys are never written to disk or persistently logged. The system enforces a strict 3-path resolution scheme:
  1. *Development Path:* Plaintext keys allowed only if `ENVIRONMENT != production`, printing localized system logs with runtime warnings.
  2. *Legacy Path:* Transparent backward compatibility for unencrypted base entities containing historical prefixes.
  3. *Production Enforcement:* If `ENVIRONMENT = production`, the system operates under a hard *Fail-Closed* rule, rejecting any spawning or breeding sequences if a valid `KMS_KEY_NAME` environment block is absent.
* **Log Sanitization:** Complete suppression of `httpx` and `httpcore` verbose engines across backend routers to prevent downstream injection of sensitive parameters or Gemini API key exposure within the GCP Cloud Run environment.
* **Input Validation:** Strict allowlist validation mechanisms restricting raw endpoint inputs exclusively to verified YouTube URLs to nullify Server-Side Request Forgery (SSRF) exposure vectors.

---

## 🎨 User Interface & Cybernetic Palette

The interface is optimized for speed, dense information display, and immediate visual verification of blockchain transactions, eliminating layered, multi-tier tabs for a flat 4-tab space.

### Color Tokens

| Token | OKLCH Value | UI Context |
| :--- | :--- | :--- |
| **Primary Cyan** | `oklch(0.85 0.15 200)` | Active systems, true Mode B signatures, highlights, primary text highlights. |
| **Accent Purple** | `oklch(0.65 0.25 300)` | Primary Call-to-Actions, token generation successes, breeding triggers, panel glows. |
| **Deep Space** | `oklch(0.15 0.02 240)` | Global master layout canvas background. |
| **Slate Gray** | `oklch(0.25 0.01 240)` | High-density glassmorphic dashboard cards, terminal backgrounds. |

### Flattened Navigation Architecture

```

[MAEF Operations Center]
├── Tab 1: Dashboard   → Active Workforce Grid | Live Terminal Logs | Attend Event Console
├── Tab 2: Analytics   → Cross-Event Knowledge Engine | JSON Structure Reports | Markdown Generation
├── Tab 3: NFT Vault   → ERC-721A Asset Gallery | Direct MantleScan Links | Public Funnel States
└── Tab 4: Marketplace → Autonomous Entity Indexing Network (Beta Protocol Pipeline)

```

---

## 🚦 Operational Edge Case Matrix

| Target Scenario | System Behavior | User Feedback Matrix |
| :--- | :--- | :--- |
| **Agent Out of Gas** | Backend throws structured string `AGENT_OUT_OF_GAS`. | UI halts execution loop, opens `TopUpGasDialog`, prompts MetaMask transfer, auto-retries on block confirmation. |
| **Gemini Down (503/504)** | Ingestion wrapper executes up to 2 automated retries using an Exponential Backoff model ($1\text{s} \rightarrow 2\text{s}$). | Displays pulsing reload animation inside the active log space, falling back to cached local metadata if hard timeout triggers. |
| **Unregistered Entity** | Contract `_enforceMintAuth()` flags exception due to missing on-chain spawn reference. | Backend triggers immediate automated fallback to Mode A administrative key, logging warning states to Cloud Run. |
| **Public State Zero Base** | Wallet disconnected state detects empty global state variables. | Replaces empty screens with an interactive "Public Preview Gallery" featuring top community wisdom trends to maximize Web3 wallet conversion. |

```