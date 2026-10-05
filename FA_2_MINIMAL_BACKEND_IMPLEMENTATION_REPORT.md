# FA-2 Minimal Backend Implementation Report

**Document Version:** 1.0.0  
**Implementation Date:** 2026-10-03  
**Status:** PASS / READY FOR FRONTEND  
**Automated Tests:** 74 / 74 PASSED (44 FA-2 + 30 Pre-existing Regression)  
**Dependencies Added:** 0  
**Frontend Modifications:** 0  

---

## 1. Objective

Implement **FA-2 — Minimal Financial Backend** to resolve the three architectural gaps identified during the forensic backend flow audit:
1. **`CommissionSnapshot` Ledger:** Immutably capture application-level tuition, rate, and gross commission upon invoice approval.
2. **`Payoff` Entity & Lifecycle:** Separate liabilities and offline settlement tracking from invoices via a 3-state state machine (`PENDING`, `SETTLED`, `CANCELLED`).
3. **`CorrectionRequired -> Resubmitted` State Flow:** Provide structured clarification feedback without terminally rejecting claims.

The implementation was designed to be **minimal, additive, transaction-safe, and backend-authoritative**, completely avoiding external payment gateways or premature UI code.

---

## 2. Files Added

| File Path | Purpose |
|---|---|
| `backend/models/CommissionSnapshot.js` | Sequelize model storing immutable application-level financial snapshots |
| `backend/models/Payoff.js` | Sequelize model storing settlement liability records with `UNIQUE(invoiceId)` |
| `backend/services/payoffService.js` | Domain service for payoff creation, listing, settlement, and cancellation |
| `backend/controllers/payoffController.js` | Express controller for payoff endpoints |
| `backend/routes/payoffRoutes.js` | Express route definitions mounted at `/api/payoffs` |
| `backend/scripts/migrate_fa_2.js` | Non-destructive database migration script |
| `backend/scratch/verify_fa_2.js` | Automated end-to-end test suite (44 test assertions) |

---

## 3. Files Modified

| File Path | Description of Changes |
|---|---|
| `backend/models/Invoice.js` | Added `'CorrectionRequired'` and `'Resubmitted'` to `financeReviewStatus` ENUM |
| `backend/models/index.js` | Registered `CommissionSnapshot` and `Payoff` models and their relational associations |
| `backend/server.js` | Registered new models and mounted `/api/payoffs` routes |
| `backend/services/invoiceReviewService.js` | Added snapshot & payoff creation inside atomic approval transaction; added `requestCorrection` and `resubmitInvoice` methods; updated review queue filtering |
| `backend/controllers/invoiceReviewController.js` | Added `requestCorrection` and `resubmitInvoice` controller actions |
| `backend/routes/invoiceReviewRoutes.js` | Exposed `PATCH /:invoiceId/correction` (admin) and `PATCH /:invoiceId/resubmit` (agent) |
| `backend/services/invoiceService.js` | Synchronized legacy `status = 'Paid'` updates with `Payoff` entity for backward compatibility |

---

## 4. Database Changes

Executed safely via `backend/scripts/migrate_fa_2.js` without dropping or rewriting historical data:
1. **ENUM Extension:**
   - PostgreSQL enum `enum_Invoices_financeReviewStatus` updated with values `'CorrectionRequired'` and `'Resubmitted'`.
2. **New Table `CommissionSnapshots`:**
   - Columns: `id` (UUID PK), `applicationId` (UUID FK), `invoiceId` (UUID FK), `contractualTuition` (DECIMAL 10,2), `commissionableTuition` (DECIMAL 10,2), `commissionRate` (DECIMAL 5,2), `grossAmount` (DECIMAL 10,2), `lockedAt` (TIMESTAMP), `lockedBy` (UUID FK), `createdAt`, `updatedAt`.
   - Constraints: `UNIQUE("applicationId", "invoiceId")`.
3. **New Table `Payoffs`:**
   - Columns: `id` (UUID PK), `payoffNumber` (VARCHAR 50 UNIQUE), `agentId` (UUID FK), `invoiceId` (UUID FK UNIQUE), `grossCommission` (DECIMAL 12,2), `deductions` (DECIMAL 12,2), `netAmount` (DECIMAL 12,2), `currency` (VARCHAR 10), `status` (ENUM `'PENDING'`, `'SETTLED'`, `'CANCELLED'`), `settlementReference` (VARCHAR 100), `settledAt` (TIMESTAMP), `settledBy` (UUID FK), `settlementNotes` (TEXT), `batchReference` (VARCHAR 100), `createdAt`, `updatedAt`.
   - Constraints: `UNIQUE("invoiceId")`, `UNIQUE("payoffNumber")`.

---

## 5. CommissionSnapshot Implementation

- **Snapshot Trigger:** Generated inside `invoiceReviewService.approveInvoice` when Admin approves an invoice review.
- **Tuition Mapping:** Maps `Application.tuitionFee` to both `contractualTuition` and `commissionableTuition`.
- **Calculation Base:**
  $$\text{grossAmount} = \text{round}\left(\text{commissionableTuition} \times \frac{\text{commissionRate}}{100}, 2\right)$$
- **Historical Immutability:** Once created, snapshot records cannot be altered. Subsequent attempts by Admin to alter an approved invoice's commission rate return `400 Bad Request`.
- **Duplicate Guard:** Enforced via `UNIQUE("applicationId", "invoiceId")` constraint; duplicate inserts throw database constraint violation errors.

---

## 6. Payoff Implementation

- **Payoff Trigger:** Automatically generated inside the same database transaction as invoice approval and snapshots.
- **Numbering:** Auto-generated deterministic format: `PO-YYYY-XXXXX`.
- **Amounts:**
  - `grossCommission = SUM(snapshot.grossAmount)`
  - `deductions = 0.00`
  - `netAmount = grossCommission - deductions`
- **State Machine:**
  - `PENDING`: Initial state upon invoice approval.
  - `SETTLED`: Human-confirmed offline settlement recording (`settlementReference`, `settledAt`, `settledBy`, `settlementNotes`, `batchReference`).
  - `CANCELLED`: Admin voids payoff before settlement.
- **Terminal Immutability:**
  - `SETTLED` cannot transition to `PENDING` or `CANCELLED` (blocked with 400).
  - `CANCELLED` cannot transition to `PENDING` or `SETTLED` (blocked with 400).
  - Terminal records reject modifications.

---

## 7. CorrectionRequired Implementation

- **Finance Review State Machine:**
  ```text
  PendingReview / Resubmitted
          ↓
     UnderReview
     ├──→ CorrectionRequired ──(Agent Resubmit)──> Resubmitted ──> UnderReview
     ├──→ Rejected [Terminal]
     └──→ Approved [Terminal] ──> CommissionSnapshots + Payoff
  ```
- **Admin Action (`PATCH /api/invoice-reviews/:id/correction`):**
  - Requires `UnderReview` status.
  - Remarks / reason are strictly required.
  - Transitions review to `CorrectionRequired`.
- **Agent Action (`PATCH /api/invoice-reviews/:id/resubmit`):**
  - Requires `CorrectionRequired` status.
  - Verified caller ownership (`invoice.agentId === currentUser.id`).
  - Agent can update remarks or supporting URL; agent cannot alter rates or amounts.
  - Transitions review to `Resubmitted`.
  - Automatically surfaces in Admin review queue.
- **Rejection Preservation:**
  - `Rejected` invoices cannot be resubmitted or transitioned to `CorrectionRequired` (blocked with 400).

---

## 8. API Endpoints

| Method | Endpoint | Auth | Role | Description |
|:---:|---|:---:|:---:|---|
| `GET` | `/api/payoffs` | YES | Any | List payoffs (Admin sees all; Agent sees own via isolation) |
| `GET` | `/api/payoffs/:id` | YES | Any | Get single payoff with snapshots (403 for unauthorized agents) |
| `PATCH` | `/api/payoffs/:id/settle` | YES | `admin` | Settle pending payoff (records UTR/reference, date, notes) |
| `PATCH` | `/api/payoffs/:id/cancel` | YES | `admin` | Cancel pending payoff |
| `PATCH` | `/api/invoice-reviews/:id/correction` | YES | `admin` | Request corrections on invoice review with mandatory remarks |
| `PATCH` | `/api/invoice-reviews/:id/resubmit` | YES | `agent` | Resubmit invoice with updated agent remarks (owner only) |
| `PATCH` | `/api/invoice-reviews/:id/approve` | YES | `admin` | Approves review, creates snapshots, creates payoff atomically |

---

## 9. Authorization & Security

- **Agent Isolation Preserved:**
  - `GET /api/payoffs`: Scoped to `where.agentId = currentUser.id` for agent callers.
  - `GET /api/payoffs/:id`: Throws `403 Access denied` if an agent attempts to access another agent's payoff.
  - `PATCH /api/invoice-reviews/:id/resubmit`: Throws `403 Access denied` if a non-owner agent attempts resubmission.
- **Admin Authority Preserved:**
  - Settle, cancel, review start, commission rate assignment, approval, and correction request endpoints strictly enforce `restrictTo('admin')`.
  - Agents attempting any admin endpoint receive `403 Forbidden`.
- **Zero Input Trust:**
  - `settledBy` is derived from authenticated JWT identity, never accepted from request body.
  - `commissionRate` and `grossAmount` cannot be provided by agents.

---

## 10. Transaction Safety

The invoice approval workflow is wrapped in a single PostgreSQL database transaction:
```javascript
const t = await sequelize.transaction();
try {
  // 1. Lock invoice with FOR UPDATE
  // 2. Validate authoritative tuition on all linked applications
  // 3. Create CommissionSnapshots for every application
  // 4. Update Invoice.amount and Invoice.financeReviewStatus = 'Approved'
  // 5. Create Payoff in PENDING state
  // 6. Commit transaction
} catch (error) {
  // Rollback on any failure — zero partial financial states
}
```
If snapshot creation fails or payoff generation fails, the approval is rolled back and no partial records remain in the database.

---

## 11. Tests Executed

Executed automated test suite: `backend/scratch/verify_fa_2.js` covering 44 assertions across 6 categories:
1. **Invoice Creation & Correction Flow:**
   - Agent creates invoice with rate=0 (PASS)
   - Admin starts review (PASS)
   - Agent blocked from requesting correction (PASS)
   - Correction requires non-empty remarks (PASS)
   - Admin transitions to `CorrectionRequired` (PASS)
   - Cannot approve while in `CorrectionRequired` (PASS)
   - Non-owner agent blocked from resubmission (PASS)
   - Owner agent resubmits invoice (PASS)
   - Resubmitted invoice appears in review queue (PASS)
   - Admin transitions `Resubmitted -> UnderReview` (PASS)
2. **Terminal Rejection State:**
   - Admin rejects invoice review (PASS)
   - Rejected invoice cannot be resubmitted (PASS)
   - Rejected invoice cannot enter `CorrectionRequired` (PASS)
3. **Commission Snapshot & Payoff Creation on Approval:**
   - Admin approves invoice (PASS)
   - CommissionSnapshot created for approved invoice (PASS)
   - Snapshot links correct application and invoice (PASS)
   - Snapshot captures contractualTuition & commissionableTuition ($25,000.00) (PASS)
   - Snapshot captures locked commissionRate (12%) & grossAmount ($3,000.00) (PASS)
   - Snapshot captures lockedAt timestamp & lockedBy admin UUID (PASS)
   - Database rejects duplicate snapshot for same application+invoice (PASS)
   - Exactly one Payoff created automatically (PASS)
   - Payoff initialized in PENDING state (PASS)
   - Unique formatted payoffNumber generated (PASS)
   - Payoff grossCommission & netAmount match snapshot aggregation (PASS)
   - Payoff links correct agentId and invoiceId (PASS)
   - Database rejects duplicate Payoff for same invoiceId (PASS)
   - Commission rate cannot be modified on approved invoice (PASS)
   - Snapshot values remain frozen and immutable (PASS)
4. **Payoff API & Settlement Flow:**
   - Agent can query payoffs (200 OK) (PASS)
   - Agent only sees own payoffs (Strict Isolation) (PASS)
   - Cross-agent payoff probe returns 403 (PASS)
   - Agent cannot settle payoff (403 Forbidden) (PASS)
   - Settlement requires settlementReference (PASS)
   - Admin settles payoff (PENDING -> SETTLED) (PASS)
   - Settlement stores settledBy attribution & settledAt timestamp (PASS)
   - Legacy Invoice status synchronized to Paid (PASS)
5. **Terminal State Immutability:**
   - SETTLED payoff cannot be re-settled (PASS)
   - SETTLED payoff cannot be cancelled (PASS)
   - PENDING -> CANCELLED works (PASS)
   - CANCELLED payoff cannot be settled (PASS)
   - CANCELLED payoff cannot be re-cancelled (PASS)
6. **Regression Verification:**
   - Backend health check remains 200 OK (PASS)
   - Unauthenticated payoff request rejected with 401 (PASS)

---

## 12. Test Results

- **Suite:** `backend/scratch/verify_fa_2.js`
- **Total Tests:** 44
- **Passed:** 44
- **Failed:** 0
- **Success Rate:** 100%

---

## 13. Existing Regression Results

- **Suite:** `backend/scratch/regression_phase_e_f_g.js`
- **Total Tests:** 30
- **Passed:** 30
- **Failed:** 0
- **Success Rate:** 100%
- **Result:** Zero regression across university lookup, scoped agent metrics, invoice creation guards, and institutional gates.

---

## 14. Legacy `Invoice.status = Paid` Handling

- **Compatibility Bridge:** In `invoiceService.js:updateInvoiceStatus`, if an Admin updates an invoice status to `Paid` via the existing endpoint (`PATCH /api/invoices/:id/status`), the system automatically checks if an associated `Payoff` exists in `PENDING` state and synchronizes it to `SETTLED` with the settlement attribution.
- **Authoritative Architecture:** `Payoffs` is now the authoritative settlement model. The legacy invoice field is preserved solely so existing frontend pages do not break before frontend updates are made.

---

## 15. Known Limitations & Next Steps

1. **Tuition Split Storage on Application:** Applications currently store a single `tuitionFee` decimal field. In this minimal implementation, `contractualTuition` and `commissionableTuition` are both initialized to this verified tuition fee. A future enhancement can provide granular itemized deductions (e.g. non-commissionable campus fees).
2. **Sub-roles:** System continues to use `admin` and `agent` roles. Dedicated `finance` and `verifier` roles were intentionally omitted per instructions.

---

## 16. Frontend Readiness

### Final Classification:
## **READY FOR FRONTEND**

The backend financial layer is fully operational and certified:
- `GET /api/payoffs` and `GET /api/payoffs/:id` are ready for the Agent and Admin Payoff UI.
- `PATCH /api/payoffs/:id/settle` and `PATCH /api/payoffs/:id/cancel` are ready for the Payoff Settlement modal.
- `PATCH /api/invoice-reviews/:id/correction` is ready for the Finance Review "Request Correction" modal.
- `PATCH /api/invoice-reviews/:id/resubmit` is ready for the Agent "Resubmit Invoice" flow.
- All institutional gates, agent isolation rules, and calculation formulas are enforced and covered by automated regression tests.
