# MAEF Improvement Plan
**Status**: Proposal untuk diskusi sebelum implementasi  
**Created**: 25 Juli 2026  
**Priority**: HIGH, MEDIUM, LOW

---

## 🎯 HIGH PRIORITY - Stability Improvements

### ✅ 4. Error Handling & Graceful Degradation
**Status**: ✓ SUDAH BAGUS - Tidak perlu perubahan

**Yang sudah ada**:
- `llm_service.py` memiliki `_call_gemini_with_retry()` dengan exponential backoff
- Retry logic untuk HTTP 404, 500, 502, 503, 504
- Timeout handling untuk Gemini API
- ELFA graceful degradation (returns None on error)
- Fallback templates untuk semua LLM operations

**Kesimpulan**: Sudah production-ready ✓

---

### 🟡 5. Gas Management & Monitoring System
**Status**: PERLU IMPROVEMENT (Non-invasive additions)

#### Analisis Code Existing:
```python
# backend/routers/agents.py line 86-98
async def _update_agent_balance_cache(doc_ref, balance: float | None) -> None:
    # Sudah ada function untuk update balance cache
    # Tapi tidak ada warning system
```

#### Proposal Improvements (NON-BREAKING):

**Option A - Minimal (Recommended)**:
1. Tambah endpoint baru `/api/v1/agent/{id}/gas-status` (tidak mengubah code existing)
2. Endpoint ini hanya READ, tidak modify apapun
3. Frontend bisa polling endpoint ini untuk warning banner

**Option B - Medium**:
1. Tambah background task untuk check gas balance (scheduled, tidak blocking)
2. Write warning flags ke Firestore (field baru, tidak touch existing fields)
3. Frontend read warning flags untuk tampilkan alert

**Yang TIDAK akan diubah**:
- ❌ Tidak mengubah existing mint flow
- ❌ Tidak mengubah Web3 service
- ❌ Tidak mengubah transaction signing logic

---

### 🟡 6. Spawn Quota UI & Logic Improvements
**Status**: PERLU IMPROVEMENT (Minor additions)

#### Analisis Code Existing:
```solidity
// V4 contract sudah ada spawn quota logic
// Max 3 spawned agents per wallet (bred agents tidak dihitung)
```

#### Proposal Improvements (NON-BREAKING):

**Option A - API Only (Recommended)**:
1. Tambah endpoint `/api/v1/agent/spawn-quota?wallet=0x...`
2. Return: `{ "spawned": 2, "max": 3, "remaining": 1, "bred": 5 }`
3. Tidak mengubah logic spawn existing

**Option B - Validation Enhancement**:
1. Add pre-flight validation di spawn endpoint
2. Return clear error message jika quota exceeded
3. Tidak mengubah contract logic

**Yang TIDAK akan diubah**:
- ❌ Tidak mengubah smart contract
- ❌ Tidak mengubah spawn flow existing
- ❌ Tidak mengubah Firestore structure

---

## 📊 MEDIUM PRIORITY - Quality & UX

### 7. Testing Coverage
**Status**: PERLU DIBUAT (Completely new, zero impact on existing)

**Proposal**:
1. Create `backend/tests/` directory (baru)
2. Add pytest untuk service layer (tidak touch production code)
3. Add integration tests untuk critical paths
4. Setup CI/CD untuk run tests

**Impact**: Zero - tests tidak mengubah production code

---

### 8. Documentation Improvements
**Status**: PERLU UPDATE (Zero code changes)

**Proposal**:
1. Update README.md - hilangkan overclaim tentang ERC-8004
2. Add API documentation dengan OpenAPI/Swagger
3. Create DEPLOYMENT.md dengan step-by-step runbook
4. Add ARCHITECTURE.md dengan diagram

**Files to update**:
- `README.md` - Remove overclaims, add accurate status
- `backend/main.py` - OpenAPI description sudah ada, cukup enhance
- Create new docs (tidak touch code)

---

### 9. Security Audit Preparation
**Status**: DOKUMENTASI ONLY (No code changes)

**Proposal**:
1. Create SECURITY.md dengan security practices yang sudah implemented
2. Document KMS encryption flow
3. Document Mode A vs Mode B authorization
4. Checklist untuk third-party audit

**Impact**: Zero code changes, pure documentation

---

## 🔧 LOW PRIORITY - Nice to Have

### 11. Monitoring & Observability
**Proposal**: Add Cloud Monitoring dashboards (infrastructure only)

### 12. Frontend State Management
**Proposal**: Refactor ke Zustand/Context (besar, post-hackathon only)

### 13. Mobile Responsiveness
**Proposal**: CSS improvements only (no logic changes)

---

## 🚦 IMPLEMENTATION STRATEGY

### Phase 1 - Documentation Only (SAFE)
**Timeline**: 1-2 hari  
**Risk**: Zero  

1. Update README.md - remove overclaims ✓
2. Create API documentation ✓
3. Create SECURITY.md ✓
4. Create DEPLOYMENT.md ✓

### Phase 2 - Non-Invasive Additions (LOW RISK)
**Timeline**: 2-3 hari  
**Risk**: Very Low  

1. Add gas status endpoint (new, tidak touch existing) ✓
2. Add spawn quota endpoint (new, tidak touch existing) ✓
3. Add test suite (completely separate) ✓

### Phase 3 - Review & Testing (CRITICAL)
**Timeline**: 1 hari  
**Risk**: None (testing phase)  

1. Test semua endpoints existing masih berfungsi ✓
2. Test gas endpoint baru tidak interfere ✓
3. Review dengan owner sebelum merge ✓

---

## ❌ WHAT WE WILL NOT TOUCH

1. **Smart Contract** - Already deployed, working, audited
2. **Web3 Service** - Core minting logic stable
3. **KMS Service** - Encryption working perfectly
4. **LLM Service** - Retry logic already solid
5. **Existing API Endpoints** - Tidak mengubah behavior
6. **Firestore Structure** - Tidak mengubah schema existing
7. **Mode B Signing** - Agent autonomy logic untouched

---

## 📋 NEXT STEPS - DISKUSI DULU

**Untuk Owner**:
1. Review plan ini
2. Pilih mana yang mau di-implement (bisa pilih sebagian)
3. Konfirmasi: "Oke, boleh lanjut ke Phase 1" atau "Tunda dulu"

**Yang saya tunggu**:
- ✅ Approved: Mulai Phase 1 (Documentation only)
- ⏸️ Hold: Tunggu diskusi lebih lanjut
- ❌ Reject: Tidak perlu improvement sekarang

**Prinsip**:
- Minimal intervention
- Maximum value
- Zero breaking changes
- Always test before merge

---

*Dokumen ini untuk diskusi, bukan untuk langsung di-implement.*
