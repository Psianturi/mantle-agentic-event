# MAEF Multi-Chain Implementation Report
**Date**: 2026-07-26 (Updated after code verification + ETH Sepolia deployment)
**Status**: Phase 1B Complete — Foundation + ETH Sepolia contract live

---

## Current Status

| Layer | Status | Notes |
|---|---|---|
| Mantle Sepolia contract | ✅ Production | `0x66fD8b54...` — tidak diubah |
| ETH Sepolia contract | ✅ Deployed | `0x110edEa5...` — baru |
| Polygon Amoy contract | ⏳ Pending | Butuh testnet MATIC |
| `chains.ts` config | ✅ Done | Single source of truth |
| Frontend UI components | ⏳ Next | ChainBadge, ChainSelector, dll |
| Backend multi-chain | ⏳ After frontend | Surgical changes ke web3_service.py |

---

## Verified Architecture (Actual Codebase)

### Contract Files di Repo
```
contracts/contracts/
  ├── MAEFNFTContract.sol    — versi awal (deprecated)
  ├── MAEFNFTERC721A.sol     — versi lama tanpa breed/proposal
  └── MAEFNFTV4.sol          — PRODUCTION VERSION ✅
```

### Contract V4 Functions
```
spawnAgent()              — 1 native token, provisions 0.5 ke agent wallet
spawnBredAgent()          — untuk offspring dari breeding
mintAttendanceNFT()       — dual-auth: MINTER_ROLE atau spawned agent
batchMintAttendanceNFTs() — gas-optimized batch
breedAgents()             — 2 MNT, records BreedRecord on-chain
recordExecutedProposal()  — HITL +5 heritage score
```

### Spawn Fee Reality
```solidity
uint256 public constant SPAWN_FEE = 1 ether;  // CONSTANT — tidak bisa diubah post-deploy
```
- Mantle: 1 MNT ≈ $0.50 ✅ wajar
- ETH Sepolia testnet: 1 ETH gratis dari faucet ✅ tidak masalah
- ETH Mainnet nanti: 1 ETH ≈ $3500 ❌ perlu Option B (setSpawnFee)

### Frontend Config (Verified)
```
src/lib/blockchain/
  ├── config.ts    — hanya Mantle mainnet + sepolia
  ├── chains.ts    — BARU: semua chain config ✅
  ├── mantleService.ts — hardcoded switchToMantleNetwork()
  └── abi.ts       — ABI V4 (sama untuk semua chain)
```

### Backend Config (Verified)
```python
# config.py — masih single-chain
chain_id: int = 5003
mantle_rpc_url: str = "https://rpc.sepolia.mantle.xyz"
contract_address: str = ""
# Belum ada CHAIN_CONFIGS
```

---

## Deployed Contracts

| Chain | Chain ID | Address | MINTER_ROLE |
|---|---|---|---|
| Mantle Sepolia | 5003 | `0x66fD8b5411856D42c08D9356e879a6e7dF0c9419` | `0xCBA7951...` ✅ |
| Ethereum Sepolia | 11155111 | `0x110edEa5DB874589ec4492d15660082634E173f0` | `0xCBA7951...` ✅ |
| Polygon Amoy | 80002 | TBD | TBD |

**Deployer**: `0xe52bb4B913B83A71d0d2deD47683B1154bf2560b`

---

## Implementation Plan (Remaining)

### Next: Frontend UI (Zero Risk)
1. `ChainBadge.tsx` — badge di agent card & NFT card
2. `ChainSelector.tsx` — dropdown di top bar
3. `NetworkMismatchAlert.tsx` — warning saat mismatch
4. Update `AgentCard.tsx`, `SpawnAgentDialog.tsx`, `App.tsx`

### After Frontend: Backend (Surgical)
1. `config.py` — tambah CHAIN_CONFIGS dict
2. `web3_service.py` — tambah `chain_id: int = 5003` default param
3. `agents.py` — tambah chain_id ke SpawnRequest
4. Firestore: backward compatible `data.get("chain_id", 5003)`

### Key Safety Rules for Backend
- Semua fungsi dapat `chain_id` sebagai **optional** param dengan default 5003
- Existing Mantle calls tanpa chain_id harus tetap bekerja identik
- Test regression Mantle sebelum deploy ke production
- Pertimbangkan `MULTI_CHAIN_ENABLED` feature flag

---

## Spawn Fee Decision Tree

```
Testing ETH Sepolia?
  ├── Punya 1 ETH Sepolia dari faucet?
  │     YES → Lanjut, deploy as-is ✅
  │     NO  → Switch ke Option B:
  │           - Ubah SPAWN_FEE dari constant ke variable
  │           - Tambah setSpawnFee() function
  │           - Redeploy ke ETH Sepolia
  │           - Set fee ke 0.001 ETH (~$3)
  └── Mainnet nanti → Wajib Option B sebelum launch
```

---

## Commits

| Commit | Description |
|---|---|
| `950e4db` | fix: API endpoint alignment, CORS, wallet compatibility, session management |
| `52de336` | feat: multi-chain support — ETH Sepolia contract deployed, chains config added |
