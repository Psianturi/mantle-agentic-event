# MAEF - Mantle Agentic Event Factory

**Turn Information Overload into On-Chain Wisdom.**

MAEF is a production-ready SaaS platform built on the **Mantle Network** that enables users to spawn autonomous AI agents. These agents attend digital events, extract key insights, and mint verifiable **Proof-of-Attendance NFTs** on-chain. This is not just automation—it's true agent autonomy with real blockchain ownership.

## Latest Deployment

- **Mantle Sepolia MAEF V2 Contract**: `0x110edEa5DB874589ec4492d15660082634E173f0`
- **Explorer**: https://explorer.sepolia.mantle.xyz/address/0x110edEa5DB874589ec4492d15660082634E173f0
- **What changed in V2**: spawned agents can self-mint attendance NFTs in True Mode B without manual `MINTER_ROLE` grants, while backend minter wallets remain a safe fallback path.

## 🚀 What Makes MAEF Different

### True Autonomous Agents (Not Bots)
- **Own Wallet**: Each agent has a unique Mantle wallet and private key (encrypted in GCP KMS)
- **Gas Budget**: Autonomous agents funded with $0.5 MNT for independent transaction signing
- **Real Wisdom**: Agents analyze actual YouTube transcripts + event metadata for deep insights
- **Blockchain Citizen**: Agents sign their own on-chain transactions (Mode B) for true agency

### Agentic Economy Blueprint
MAEF demonstrates an **"Agentic Wallet Economy"** where:
- Agents are economic entities with wallets, not just software commands
- Wisdom NFTs represent agent-owned intellectual property (IP)
- Agents learn from past events and adapt their participation strategy
- Breeding/Fusion creates knowledge inheritance and genetic traits

---

## ⚙️ Understanding Agent Transaction Modes

### Mode A: Backend Signing (Safe Default)
- **What it is**: Backend wallet (with MINTER_ROLE) signs all NFT mint transactions
- **When used**: Initial setup, demos, when network is unstable
- **Security**: Backend-controlled, familiar to enterprise users
- **Transaction visibility**: MantleScan shows backend deployer wallet as signer

### Mode B: Agent Autonomous Signing (True Autonomy) ⭐
- **What it is**: Agent's own private key (decrypted from GCP KMS) signs transactions directly
- **When used**: Live mode, final demo, proving agent independence to judges
- **Security**: Private key never touches frontend; stays encrypted in backend until signing moment
- **Transaction visibility**: MantleScan shows **agent's own wallet** as transaction signer
- **Impact**: Proves agent is blockchain citizen, not just backend automation

**Technical Flow (Mode B)**:
```
Event Submitted → Backend retrieves agent's encrypted private key from Firestore
→ GCP KMS decrypts key → Agent signs transaction → MantleScan shows agent's signature
```

**Pro Tip**: Enable Mode B for demo impact. Juri akan lihat agent's own wallet signature di blockchain—itu adalah bukti nyata autonomy.

---

## ✨ Core Features

- 🤖 **Autonomous AI Agents**: Spawn agents dengan specialized sub-agents (Secretary, Scribe, Social-Lite, Mint-Master)
- 🎯 **Event Attendance**: Agents attend YouTube, Luma, Eventbrite events dan extract key insights
- 📝 **Real Wisdom Generation**: Analyze actual event transcripts (bukan hanya metadata) untuk insights berkualitas tinggi
- 🏆 **NFT Minting**: Mint Proof-of-Attendance NFTs on Mantle dengan on-chain provenance
- 🧬 **Agent Breeding/Fusion**: Create offspring agents dengan inherited knowledge dari parent
- 📊 **Public Wisdom Showcase**: Featured Wisdom cards untuk discovery + conversion (public → wallet-connected)
- 💬 **Agent Chat**: Natural language interaction dengan agents tentang events mereka
- 🔗 **Full Blockchain Integration**: Mantle Sepolia testnet + mainnet ready

---

## 🏗️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS + Vite |
| **Backend** | FastAPI (Python 3.11) + async/await |
| **Blockchain** | Mantle Network (L2 OP Stack) |
| **Smart Contracts** | Solidity (ERC-721A optimized) |
| **Storage** | IPFS (Kubo RPC) + Firestore |
| **AI/LLM** | Gemini 2.5-Flash (YouTube transcript analysis) |
| **Security** | GCP KMS (agent private key encryption) |
| **Deployment** | GCP Cloud Run (serverless) |

---

## 🚀 Quick Start

### 1. Connect Wallet
- MetaMask → Mantle Sepolia Testnet (or mainnet for production)

### 2. Spawn Agent
- Choose niche (Blockchain/DeFi, Trading, Tech, Health/Wellness)
- Name your agent
- Agent auto-receives wallet + 0.5 MNT gas budget

### 3. Attend Event
- Paste YouTube/Luma/Eventbrite URL
- Choose Mode A (safe) or Mode B (autonomous signing)
- Wait for Gemini AI to analyze transcript
- NFT minted automatically to agent wallet

### 4. Explore Wisdom
- After 5 events → Wisdom Report unlocks
- Featured Wisdom carousel (public discovery)
- Share insights with community

---

## 📋 Essential Guidelines

### ✅ Before Deploying to Mainnet
1. **Security**: Verify GCP KMS key rotation policy
2. **Gas**: Ensure agent wallets have sufficient MNT for operations
3. **URLs**: Only YouTube, Luma, Eventbrite, Zoom are allowed (SSRF protection)
4. **Wisdom Quality**: Test LLM transcript analysis on various event types

### ✅ Agent Best Practices
1. **One niche per agent**: Agents learn niche-specific patterns faster
2. **Auto Scout enabled**: Let AI pick relevant events (data-driven, not hardcoded)
3. **Custom instructions optional**: Add personality traits for better wisdom
4. **Check cooldowns**: Breeding cooldown prevents gas waste on rapid fusions

### ✅ Transaction Monitoring
- Always verify tx hash on MantleScan after minting
- Mode B transactions show agent wallet as signer (proof of autonomy)
- Gas usage typically 80-120K units per mint (ERC-721A optimized)

### ✅ Production Checklist
- [ ] All environment variables set (CONTRACT_ADDRESS, LLM_API_KEY, etc.)
- [ ] Firestore composite indexes created (for Featured Wisdom queries)
- [ ] IPFS node accessible (for metadata storage)
- [ ] Backend deployed to Cloud Run with CORS configured
- [ ] Frontend environment: `VITE_GCP_BACKEND_URL` pointing to production backend

---

## 🎯 Agent System Architecture

### Parent Agent (Main Coordinator)
- Owns unique Mantle wallet (encrypted private key in Firestore)
- Makes strategic decisions on which events to attend
- Accumulates wisdom and level from events

### Sub-Agents (Specialized Workers)
- **Secretary** `👔`: Event registration, platform interaction
- **Scribe** `📝`: Content extraction, transcript analysis, summary generation
- **Social-Lite** `💬`: Community monitoring (future phase)
- **Mint-Master** `🪙`: Gas optimization, NFT minting transaction execution

### Genetic Traits (Breeding)
- `niche_preference_weight`: Inherited tendency to attend certain event types
- `wisdom_quality_baseline`: Offspring benefit from parent's analysis patterns
- `generation`: Track lineage (gen 0 = spawned, gen N = offspring)
- `max_breedings`: Prevent infinite fusion chains (currently 3 per agent)

---

## 📊 Platform Metrics

- **Global Wisdom Index** = (Total Wisdom NFTs × Average Agent Level)
- **Agency Score** = (Autonomous Mode B Signatures / Total Transactions) × Wisdom Quality
- **Public Discovery**: Featured Wisdom rotates hourly (trending 60% + quality 30% + wildcard 10%)

---


### Key Resources
- **[Product Requirements](./PRD.md)** — Feature specifications and acceptance criteria
- **[Blockchain Integration](./BLOCKCHAIN_INTEGRATION.md)** — Smart contract & gas optimization details
- **[Security Guidelines](./SECURITY.md)** — KMS, key management, and audit standards
- **[Architecture Analysis](./ARCHITECTURE_RESTRUCTURE.md)** — System design deep-dive

---

## 🔒 Security

- **Private Keys**: Encrypted via GCP KMS, never logged or exposed
- **API URLs**: Allowlist-protected (SSRF mitigation)
- **Firestore**: Role-based access control (no public read)
- **CORS**: Restricted to frontend domain only
- **Audit Trail**: All Mode B transactions logged with agent wallet signature

---

## 📝 Contributing

When committing changes:
1. Use **English** for commit messages and code comments
2. Reference ticket/issue number if available
3. Include both **what changed** and **why**
4. Test on Mantle Sepolia before pushing

---

## 📄 License

MIT License — See [LICENSE](./LICENSE) file for details.

---

**🌟 MAEF is ready for production.**
