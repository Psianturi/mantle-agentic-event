# Multi-Chain Strategy & Progress
**Date**: 2026-07-26
**Status**: Phase 1B COMPLETE — Contract deployed to ETH Sepolia
**Last Updated**: After ETH Sepolia deployment

---

## ✅ Completed Work

### Phase 0: Foundation — DONE (commit 52de336)
- `contracts/hardhat.config.js` — tambah `ethereumSepolia` (publicnode RPC) dan `polygonAmoy`
- `contracts/scripts/deploy-new-chain.js` — script deploy terpisah untuk chain baru (deploy.js original tidak disentuh)
- `src/lib/blockchain/chains.ts` — single source of truth untuk semua chain config

### Phase 1B: Contract Deployment — DONE
**Ethereum Sepolia (chainId: 11155111)**
- Contract: `0x110edEa5DB874589ec4492d15660082634E173f0`
- Deployer: `0xe52bb4B913B83A71d0d2deD47683B1154bf2560b`
- MINTER_ROLE: granted ke `0xCBA7951a8b5AE81303AC5E1017e34bF50A342D22` ✅
- Explorer: https://sepolia.etherscan.io/address/0x110edEa5DB874589ec4492d15660082634E173f0
- Deployer balance setelah deploy: ~0.02 ETH Sepolia (tidak habis 1 ETH)

**Mantle Sepolia (chainId: 5003) — existing, tidak diubah**
- Contract: `0x66fD8b5411856D42c08D9356e879a6e7dF0c9419`
- Status: Production, berjalan normal

---

## 🔑 Key Decisions Made

### Spawn Fee Strategy
- **Testnet**: Deploy as-is (1 ETH hardcoded) — gratis dari faucet, tidak masalah
- **Mainnet nanti**: Tambah `setSpawnFee()` function ke contract (Option B)
- **Trigger**: Jika saat testing user tidak punya 1 ETH Sepolia → switch ke Option B (modifikasi contract + redeploy)

### RPC untuk Ethereum Sepolia
- `rpc.sepolia.org` → 404 (down)
- Ganti ke `https://ethereum-sepolia-rpc.publicnode.com` ✅ bekerja

### Deploy Script Strategy
- `deploy.js` = original, hanya untuk Mantle, tidak diubah
- `deploy-new-chain.js` = script baru terpisah untuk chain lain
- Prinsip: tidak menyentuh yang sudah berjalan

---

## 📋 Remaining Work

### Phase 1A: Frontend UI — BELUM DIKERJAKAN
- [ ] `ChainBadge.tsx` — badge kecil di agent card & NFT card
- [ ] `ChainSelector.tsx` — dropdown di top bar
- [ ] `NetworkMismatchAlert.tsx` — warning saat wallet chain ≠ selected chain
- [ ] Update `AgentCard.tsx` — tampilkan chain badge
- [ ] Update `SpawnAgentDialog.tsx` — tambah network selector
- [ ] Update `App.tsx` — tambah chain state management

### Phase 2: Backend Multi-Chain — BELUM DIKERJAKAN
- [ ] `backend/core/config.py` — tambah CHAIN_CONFIGS dict
- [ ] `backend/services/web3_service.py` — surgical: tambah chain_id param (default=5003)
- [ ] `backend/routers/agents.py` — tambah chain_id ke SpawnRequest
- [ ] Firestore: `chain_id = data.get("chain_id", 5003)` — backward compatible
- [ ] `cloudRunService.ts` — kirim chain_id di spawn request

### Phase 3: Polygon Amoy — BELUM DIKERJAKAN
- [ ] Dapatkan testnet MATIC dari faucet
- [ ] Deploy V4 ke Polygon Amoy
- [ ] Grant MINTER_ROLE
- [ ] Update chains.ts

---

## 🏗️ Architecture: chains.ts (Source of Truth)

```typescript
// src/lib/blockchain/chains.ts
CHAIN_CONFIGS = {
  5003:     { name: 'Mantle Sepolia',   contract: '0x66fD8b54...', color: '#00F3FF' }  ✅ active
  11155111: { name: 'Ethereum Sepolia', contract: '0x110edEa5...', color: '#8B5CF6' }  ✅ deployed
  // 80002: Polygon Amoy — pending
}
```

---

## ⚠️ Important Notes

1. **Spawn fee 1 ETH di ETH Sepolia** — jika user tidak punya 1 ETH testnet saat testing, switch ke Option B (tambah setSpawnFee() + redeploy)

2. **Backend masih Mantle-only** — semua spawn/mint masih ke Mantle. Frontend chains.ts sudah siap tapi backend belum support multi-chain.

3. **Backward compatibility wajib** — semua backend changes harus pakai `chain_id = data.get("chain_id", 5003)` pattern agar existing Mantle agents tidak rusak.

4. **Feature flag** — pertimbangkan `MULTI_CHAIN_ENABLED` env var di backend sebelum deploy ke production.

---

## 📊 Progress Tracker

| Phase | Item | Status |
|---|---|---|
| Foundation | hardhat.config.js | ✅ Done |
| Foundation | deploy-new-chain.js | ✅ Done |
| Foundation | chains.ts | ✅ Done |
| Contract | Mantle Sepolia | ✅ Existing |
| Contract | Ethereum Sepolia | ✅ Deployed |
| Contract | Polygon Amoy | ⏳ Pending (need MATIC) |
| Frontend | ChainBadge | ⏳ Next |
| Frontend | ChainSelector | ⏳ Next |
| Frontend | NetworkMismatchAlert | ⏳ Next |
| Frontend | AgentCard update | ⏳ Next |
| Frontend | SpawnAgentDialog update | ⏳ Next |
| Backend | CHAIN_CONFIGS config.py | ⏳ After frontend |
| Backend | web3_service.py surgical | ⏳ After frontend |
| Backend | agents.py chain_id | ⏳ After frontend |
| Backend | cloudRunService.ts | ⏳ After frontend |

---

## 🔗 Contract Addresses Reference

| Chain | Chain ID | Contract Address | Status |
|---|---|---|---|
| Mantle Sepolia | 5003 | `0x66fD8b5411856D42c08D9356e879a6e7dF0c9419` | ✅ Production |
| Ethereum Sepolia | 11155111 | `0x110edEa5DB874589ec4492d15660082634E173f0` | ✅ Deployed |
| Polygon Amoy | 80002 | TBD | ⏳ Pending |

**Deployer wallet**: `0xe52bb4B913B83A71d0d2deD47683B1154bf2560b`
**Minter service**: `0xCBA7951a8b5AE81303AC5E1017e34bF50A342D22`
