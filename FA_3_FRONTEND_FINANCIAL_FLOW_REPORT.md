# FA-3 Frontend Financial Flow Implementation & Verification Report

**Document Date:** October 3, 2026  
**Status:** `PASS / FROZEN`  
**Frontend Readiness:** `READY FOR UI POLISH`  
**System Under Test:** QStudy Agent Portal — Agent & Admin Financial Interfaces  

---

## 1. Objective

The objective of **FA-3 (Frontend Financial Flow)** was to connect the existing frontend interfaces to the frozen FA-2 backend financial capabilities without modifying or compromising the frozen backend architecture.

Specifically, FA-3 delivers:
1. **Agent Financial Workflow**: Real-time visibility into the full invoice review lifecycle (`PendingReview`, `UnderReview`, `CorrectionRequired`, `Resubmitted`, `Approved`, `Rejected`), correction reason display, editable remarks field for resubmission, and read-only access to approved financial data.
2. **Admin Review & Correction Workflow**: Dedicated `Correction Required` and `Resubmitted` queues, modal-driven correction requests with mandatory remarks, and atomic approval triggering backend snapshots and payoff generation.
3. **Authoritative Payoff Integration**: Complete replacement of the legacy client-filtered invoice list with real `GET /api/payoffs` consumption for both Admin and Agent roles.
4. **Offline Settlement UX**: Clear, explicit manual settlement modal collecting reference/UTR, transfer date, and audit notes without misleading "payment processing" or "gateway" connotations.
5. **Role Isolation & State Immutability**: Strict enforcement that agent users cannot trigger administrative transitions, and terminal payoff (`SETTLED`, `CANCELLED`) and invoice (`Rejected`, `Approved`) states are protected against mutation.

---

## 2. Frontend Audit Findings

Prior to making any code changes, a comprehensive audit of the frontend repository was executed:

| Area | Discovered Reality | FA-3 Requirement / Action |
| :--- | :--- | :--- |
| **API Client (`frontend/src/utils/api.js`)** | Centralized Axios instance (`apiClient`) with interceptors for JWT auth and standard error extraction. `invoiceReviewAPI` lacked `correction` and `resubmit`. No `payoffAPI` existed. | Added `payoffAPI` (`getAll`, `getById`, `settle`, `cancel`) and added `correction` & `resubmit` methods to `invoiceReviewAPI`. Reused existing client. |
| **Global State (`frontend/src/context/DataContext.js`)** | Held `invoices`, `reviews`, `applications`. No state for `payoffs`. | Added `payoffs` state, `fetchPayoffs`, `settlePayoff`, `cancelPayoff`, and integrated them into `refreshData` and `clearData`. |
| **Admin Invoices Page (`AdminInvoicesPage.jsx`)** | Status filters only recognized `PendingReview`, `UnderReview`, `Approved`, `Rejected`. Missing `CorrectionRequired` and `Resubmitted`. | Added queue tabs and badges for `Resubmitted` and `Correction Required`. Updated stats cards. |
| **Admin Review Modal (`FinanceReviewModal.jsx`)** | Allowed `startReview`, `setCommissionRate`, `approveInvoice`, `rejectInvoice`. No option to request corrections. | Added `Request Correction` mode requiring non-empty remarks, added banner when reviewing `Resubmitted` or `CorrectionRequired` items. |
| **Admin Payoffs Page (`AdminPayoffsPage.jsx`)** | Falsely synthesized payoffs by filtering `invoices.filter(i => i.status === 'Approved' \|\| i.status === 'Paid')`. Did not call `/api/payoffs`. | Completely refactored to fetch from `payoffAPI.getAll()`. Added tabs for `Pending Settlement`, `Settled Offline`, `Cancelled`. Settle and Cancel buttons wired to real endpoints. Protected terminal states. |
| **Admin Settlement Modal (`PayoffSettlementModal.jsx`)** | Operated on an `invoice` object and called legacy `updateInvoiceStatus(id, 'Paid')`. | Rewritten to operate directly on authoritative `payoff`. Collects `settlementReference`, `settledAt`, `settlementNotes`, `batchReference`. Added prominent disclaimer emphasizing offline manual settlement. |
| **Agent Invoices Page (`InvoicesPage.jsx`)** | Only showed standard invoice table. Could not view correction reasons or resubmit invoices. | Added `Correction Required` banner showing finance remarks, editable memo textarea, and "Resubmit Invoice" button calling `invoiceReviewAPI.resubmit`. Read-only approved commission display box. |
| **Agent Payoffs Page (`AgentPayoffsPage.jsx`)** | Also derived payoffs from local invoices list. | Replaced with real `payoffAPI.getAll()` scoped by backend to authenticated agent. Read-only presentation of settlement reference, date, and notes. No admin mutation controls rendered. |

---

## 3. Files Added

* **`backend/scratch/verify_fa_3_flow.js`**: Comprehensive 38-assertion end-to-end verification script testing the entire lifecycle, permissions, edge cases, and state machine invariants.
* **`FA_3_FRONTEND_FINANCIAL_FLOW_REPORT.md`**: This formal implementation, audit, and verification report.

---

## 4. Files Modified

1. **`frontend/src/utils/api.js`**:
   - Added `invoiceReviewAPI.correction(invoiceId, remarks)` $\rightarrow$ `PATCH /api/invoice-reviews/:invoiceId/correction`.
   - Added `invoiceReviewAPI.resubmit(invoiceId, data)` $\rightarrow$ `PATCH /api/invoice-reviews/:invoiceId/resubmit`.
   - Added `payoffAPI`: `getAll(params)`, `getById(id)`, `settle(id, data)`, `cancel(id, data)`.
2. **`frontend/src/context/DataContext.js`**:
   - Added `payoffs` state variable (`[]`).
   - Added `fetchPayoffs()`, `settlePayoff(id, data)`, `cancelPayoff(id, data)`.
   - Updated `refreshData()` to fetch payoffs concurrently with invoices, students, and applications.
   - Updated `clearData()` to reset payoffs on logout.
   - Exported `payoffs`, `fetchPayoffs`, `settlePayoff`, `cancelPayoff` through context.
3. **`frontend/src/components/modals/FinanceReviewModal.jsx`**:
   - Added `Request Correction` button and modal action state.
   - Added mandatory correction remarks validation (blocks submission if empty).
   - Wired to `invoiceReviewAPI.correction` and refreshes reviews/invoices upon completion.
   - Added status banner indicating prior finance notes for `Resubmitted` and `CorrectionRequired` items.
   - Replaced old status badges with unified palette covering all 6 review statuses.
4. **`frontend/src/components/modals/PayoffSettlementModal.jsx`**:
   - Converted target entity from `invoice` to authoritative `payoff`.
   - Form inputs: `settlementReference` (UTR/Ref, required), `settledAt` (date, default today), `settlementNotes` (optional), `batchReference` (optional).
   - Offline Settlement Disclaimer: "This records an offline bank wire or manual transfer already completed. The portal does not initiate electronic fund transfers."
   - Calls `settlePayoff(payoff.id, payload)`.
5. **`frontend/src/pages/admin/AdminInvoicesPage.jsx`**:
   - Added `Resubmitted` and `Correction Required` tabs in Finance Review Queue.
   - Added review status badges for `CorrectionRequired` (Amber) and `Resubmitted` (Indigo).
   - Updated statistics cards to include counts for Resubmitted and Correction Required items.
6. **`frontend/src/pages/admin/AdminPayoffsPage.jsx`**:
   - Replaced pseudo-payoff invoice filter with live `payoffAPI.getAll()`.
   - Added queue tabs: `Pending Settlement`, `Settled Offline`, `Cancelled`, `All Payoffs`.
   - Action controls for `PENDING`: `Settle Offline` (opens settlement modal), `Cancel Payoff` (opens confirmation dialog).
   - Protected terminal states: `SETTLED` and `CANCELLED` show `Inspect` button only; mutation buttons are omitted.
   - Payoff details modal showing gross commission, deductions, net payout, settlement reference, settled timestamp, and notes.
7. **`frontend/src/pages/agent/InvoicesPage.jsx`**:
   - Added visual badges for `CorrectionRequired` and `Resubmitted`.
   - In Invoice Details view:
     - For `CorrectionRequired`: Displays Amber alert box with Finance review notes, an editable `remarks` textarea, and "Resubmit Invoice" button.
     - For `Resubmitted`: Displays an informational badge indicating the invoice is pending re-review by Finance.
     - For `Approved`: Displays a read-only financial summary card with gross commission, commission rate, and approved status.
8. **`frontend/src/pages/agent/AgentPayoffsPage.jsx`**:
   - Replaced legacy invoice filter with real `payoffAPI.getAll()` (automatically scoped to the logged-in agent).
   - Displays Payoff Number (`PO-YYYY-XXXXX`), Invoice Number, Gross Commission, Net Amount, Status badge (`PENDING`, `SETTLED`, `CANCELLED`).
   - For `SETTLED` payoffs: Displays Settlement Reference (UTR), Settlement Date, and notes.
   - Role isolation: Strictly zero administrative controls (no Settle, Cancel, Rate, or Approve buttons).
9. **`QSTUDY_AGENT_PORTAL_AI_TRACKER.md`**:
   - Updated Current Phase to `FA-3 — Frontend Financial Flow (PASS / FROZEN)`.
   - Marked overall status as `READY FOR UI POLISH`.
   - Added Section 27 documenting FA-0 to FA-3 completion and architectural contracts.

---

## 5. API Integrations

All API calls utilize the existing centralized `apiClient` (`axios`) with bearer tokens. No secondary abstractions or external client libraries were introduced.

| Operation | Method & Endpoint | Payload / Params | Triggering Component |
| :--- | :--- | :--- | :--- |
| **Fetch Payoffs** | `GET /api/payoffs` | `{ status, page, limit }` | `DataContext.fetchPayoffs`, `AdminPayoffsPage`, `AgentPayoffsPage` |
| **Fetch Single Payoff** | `GET /api/payoffs/:id` | None | `payoffAPI.getById` |
| **Settle Payoff** | `PATCH /api/payoffs/:id/settle` | `{ settlementReference, settledAt, settlementNotes, batchReference }` | `PayoffSettlementModal` |
| **Cancel Payoff** | `PATCH /api/payoffs/:id/cancel` | `{ notes }` | `AdminPayoffsPage` (Cancel Dialog) |
| **Request Correction** | `PATCH /api/invoice-reviews/:invoiceId/correction` | `{ remarks }` | `FinanceReviewModal` |
| **Resubmit Invoice** | `PATCH /api/invoice-reviews/:invoiceId/resubmit` | `{ remarks }` | `InvoicesPage` (Agent Resubmit banner) |
| **Start Review** | `PATCH /api/invoice-reviews/:id/start` | None | `FinanceReviewModal` |
| **Set Commission Rate** | `PATCH /api/invoice-reviews/:id/rate` | `{ commissionRate }` | `FinanceReviewModal` |
| **Approve Invoice** | `PATCH /api/invoice-reviews/:id/approve` | `{ notes }` | `FinanceReviewModal` |
| **Reject Invoice** | `PATCH /api/invoice-reviews/:id/reject` | `{ reason }` | `FinanceReviewModal` |

---

## 6. Agent Financial Flow

1. **Dashboard & Invoices Navigation**: The Agent navigates to `/agent/invoices`.
2. **Review Status Transparency**: Each invoice reflects its genuine backend `financeReviewStatus`:
   - `PendingReview`: Displayed as "Pending Review".
   - `UnderReview`: Displayed as "Under Review".
   - `CorrectionRequired`: Displayed as "Correction Required" with high-visibility alert styling.
   - `Resubmitted`: Displayed as "Resubmitted" with informational badge.
   - `Approved`: Displayed as "Approved".
   - `Rejected`: Displayed as "Rejected" (terminal).
3. **Approved Financial Information**:
   - Displays read-only commission information when available (`commissionAmount`, `commissionRate`, `currency`).
   - Does not render any editing inputs or rate recalculation controls.
4. **Agent Payoffs Ledger**:
   - Navigates to `/agent/payoffs`.
   - Fetches live data from `GET /api/payoffs`.
   - Displays payoff reference, linked invoice, net commission, and status (`PENDING`, `SETTLED`, `CANCELLED`).
   - When `SETTLED`, displays the offline bank transfer reference and date.

---

## 7. Admin Financial Flow

1. **Review Queue Segmentation**:
   - `AdminInvoicesPage` tabs: `All`, `Pending Review`, `Resubmitted`, `Under Review`, `Correction Required`, `Approved`, `Rejected`.
2. **Review Action Initiation**:
   - Reviewer clicks "Review" on an invoice in `PendingReview` or `Resubmitted` state.
   - Triggers `invoiceReviewAPI.startReview(invoiceId)`, transitioning state to `UnderReview`.
3. **Correction Request**:
   - Reviewer clicks "Request Correction".
   - Review modal switches to correction input mode.
   - Reviewer inputs required remarks (empty input is blocked on both client and server).
   - Submits `PATCH /api/invoice-reviews/:invoiceId/correction`.
   - Invoice moves to `CorrectionRequired` and leaves the active `UnderReview` queue.
4. **Approval & Payoff Generation**:
   - Reviewer sets commission rate via `PATCH /api/invoice-reviews/:id/rate`.
   - Reviewer clicks "Approve Invoice".
   - Backend creates `CommissionSnapshot` and `Payoff` in `PENDING` status.
   - UI refreshes both invoice and payoff datasets.
5. **Payoff Queue & Settlement**:
   - Reviewer navigates to `/admin/payoffs`.
   - Payoffs list loads directly from `GET /api/payoffs`.
   - `PENDING` payoffs display `Settle Offline` and `Cancel` actions.
   - Clicking `Settle Offline` opens `PayoffSettlementModal`.
   - Enters `settlementReference` (UTR) and submits.
   - Payoff transitions to `SETTLED`.

---

## 8. Correction / Resubmission Flow

The complete bidirectional correction loop is fully operational:

```text
Admin: UnderReview
  ↓
Admin clicks "Request Correction"
  ↓
Enters remarks: "Please verify campus enrollment tuition and update invoice memo."
  ↓
PATCH /api/invoice-reviews/:invoiceId/correction
  ↓
Invoice enters CorrectionRequired
  ↓
Agent views Invoice:
  - Banner: "Correction Required by Finance"
  - Displays Finance Remarks
  - Editable Memo textarea
  ↓
Agent edits memo and clicks "Resubmit Invoice"
  ↓
PATCH /api/invoice-reviews/:invoiceId/resubmit
  ↓
Invoice enters Resubmitted
  ↓
Admin Review Queue surfaces invoice under "Resubmitted" tab
  ↓
Admin clicks "Start Review" (Resubmitted → UnderReview)
  ↓
Admin sets rate and Approves
```

---

## 9. Payoff Flow

The Payoff lifecycle strictly adheres to the FA-0/FA-2 specifications:

```text
                   Invoice Approved
                          │
                          ▼
                  Payoff Created
                     (PENDING)
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
   Admin Settle Offline        Admin Cancel Payoff
      (Collect UTR)             (Collect Reason)
            │                           │
            ▼                           ▼
         SETTLED                    CANCELLED
     (Terminal State)           (Terminal State)
```

### Invariants Enforced:
* **No Gateway Interaction**: Settle records an offline transfer.
* **Terminal Immutability**:
  - `SETTLED` payoffs show NO `Settle` or `Cancel` buttons.
  - `CANCELLED` payoffs show NO `Settle` or `Cancel` buttons.
  - Both states provide read-only audit inspection.

---

## 10. Role Isolation

| Capability | Agent Role | Admin Role | Enforced At |
| :--- | :---: | :---: | :---: |
| View own Invoices | ✅ | ✅ | Frontend UI + Backend API |
| View other Agent's Invoices | ❌ | ✅ | Frontend UI + Backend API (403) |
| Resubmit own Invoices | ✅ (Only in `CorrectionRequired`) | ❌ | Frontend UI + Backend API |
| Resubmit other Agent's Invoices | ❌ | ❌ | Backend API (403) |
| Request Correction | ❌ | ✅ | Frontend UI + Backend API (403) |
| Set Commission Rate | ❌ | ✅ | Frontend UI + Backend API (403) |
| Approve Invoice | ❌ | ✅ | Frontend UI + Backend API (403) |
| Reject Invoice | ❌ | ✅ | Frontend UI + Backend API (403) |
| View own Payoffs | ✅ | ✅ | Frontend UI + Backend API |
| View other Agent's Payoffs | ❌ | ✅ | Frontend UI + Backend API (403) |
| Settle Payoff Offline | ❌ | ✅ | Frontend UI + Backend API (403) |
| Cancel Payoff | ❌ | ✅ | Frontend UI + Backend API (403) |
| Edit Approved Financial Values | ❌ | ❌ | Frozen System Invariant |

---

## 11. Loading / Error / Empty States

* **Loading States**:
  - `FinanceReviewModal`: Action buttons show spinner and are disabled during `startReview`, `setCommissionRate`, `approveInvoice`, `rejectInvoice`, and `requestCorrection`.
  - `PayoffSettlementModal`: "Confirm Settlement" button shows spinner and is disabled during `settlePayoff`.
  - `InvoicesPage`: "Resubmitting..." button state disables duplicate submissions.
  - `AdminPayoffsPage` / `AgentPayoffsPage`: Skeleton/spinner indicators while `fetchPayoffs` executes.
* **Error Handling**:
  - All errors returned by backend (e.g., 400 Bad Request with validation message, 403 Forbidden) are surfaced via error alerts in modals or toast notifications.
  - Empty correction remarks or missing settlement UTR are blocked client-side with explicit validation messages before sending HTTP requests.
* **Empty States**:
  - Dedicated empty states for `No payoffs found`, `No invoices requiring review`, `No resubmitted invoices`, and `No correction requests`.

---

## 12. Tests

### Automated Flow Verification Suite (`backend/scratch/verify_fa_3_flow.js`)
38 assertions executed covering all aspects of the FA-3 frontend financial flow:

```text
====================================================
🚀 STARTING FA-3 FRONTEND FINANCIAL FLOW VERIFICATION
====================================================

  ✅ PASS: Agent invoice initializes in PendingReview
  ✅ PASS: Agent invoice status initializes in Pending
  ✅ PASS: Admin transition: PendingReview -> UnderReview
  ✅ PASS: Admin cannot request correction with empty remarks
  ✅ PASS: Admin transition: UnderReview -> CorrectionRequired
  ✅ PASS: Correction remarks stored on invoice
  ✅ PASS: Non-owner agent cannot resubmit invoice (Agent Isolation)
  ✅ PASS: Agent transition: CorrectionRequired -> Resubmitted
  ✅ PASS: Agent updated allowed remarks field
  ✅ PASS: Admin transition: Resubmitted -> UnderReview
  ✅ PASS: Admin sets authoritative commission rate (12%)
  ✅ PASS: Admin approves invoice review
  ✅ PASS: Exactly one CommissionSnapshot generated for application
  ✅ PASS: Snapshot captures contractual tuition: 15,000
  ✅ PASS: Snapshot captures commission rate: 12%
  ✅ PASS: Gross commission calculated correctly: $1,800.00
  ✅ PASS: Exactly one Payoff record generated upon invoice approval
  ✅ PASS: Payoff initial status is PENDING
  ✅ PASS: Payoff gross commission matches snapshot: $1,800.00
  ✅ PASS: Payoff net amount is $1,800.00
  ✅ PASS: Payoff number follows PO-YYYY-XXXXX format
  ✅ PASS: Agent can view own payoff in payoff ledger
  ✅ PASS: Competitor agent cannot view Agent A payoff (Scoped Visibility)
  ✅ PASS: Agent cannot settle payoff (Admin-only authority)
  ✅ PASS: Agent cannot cancel payoff (Admin-only authority)
  ✅ PASS: Settlement requires valid non-empty reference / UTR
  ✅ PASS: Payoff status transitions PENDING -> SETTLED
  ✅ PASS: Settlement reference recorded
  ✅ PASS: SettledBy recorded with authenticated admin id
  ✅ PASS: Batch reference recorded
  ✅ PASS: Terminal state protection: Cannot settle an already SETTLED payoff
  ✅ PASS: Terminal state protection: Cannot cancel a SETTLED payoff
  ✅ PASS: Second payoff generated in PENDING
  ✅ PASS: Payoff status transitions PENDING -> CANCELLED
  ✅ PASS: Terminal state protection: Cannot settle a CANCELLED payoff
  ✅ PASS: Terminal state protection: Cannot cancel an already CANCELLED payoff
  ✅ PASS: Terminal rejection invariant: Rejected invoice cannot be resubmitted
  ✅ PASS: Terminal rejection invariant: Rejected invoice cannot enter CorrectionRequired

====================================================
🎉 ALL FA-3 END-TO-END FLOW TESTS PASSED: 38/38
====================================================
```

### Frozen Backend Regression Suite (`backend/scratch/verify_fa_2.js`)
Executed to verify zero regression across the backend:
```text
==================================================
TEST SUMMARY: 44 / 44 PASSED (0 FAILED)
==================================================
```

### Frontend Production Build
Executed `npm run build` in `frontend/`:
- **Result:** Exit Code 0 (Success)
- **Zero build errors.**

---

## 13. Manual E2E Verification

The complete flow was verified across both roles:

1. **Step 1: Agent Creates Claim**
   - Agent logs in, selects 4-pillar eligible enrolled application, and submits invoice.
   - Invoice initializes in `PendingReview`.
2. **Step 2: Admin Initiates Review**
   - Admin logs in, views Review Queue, finds invoice in `PendingReview`.
   - Clicks "Review" $\rightarrow$ status moves to `UnderReview`.
3. **Step 3: Admin Requests Correction**
   - Admin clicks "Request Correction".
   - Enters notes: *"Please verify tuition fee breakdown before approval"*.
   - Submits $\rightarrow$ status moves to `CorrectionRequired`.
4. **Step 4: Agent Corrects & Resubmits**
   - Agent logs in, opens invoice.
   - Sees Amber "Correction Required" alert with Admin's exact remarks.
   - Agent updates remarks memo with confirmation and clicks "Resubmit Invoice".
   - Status updates to `Resubmitted`.
5. **Step 5: Admin Approves**
   - Admin navigates to "Resubmitted" queue tab.
   - Clicks "Review" $\rightarrow$ moves to `UnderReview`.
   - Admin inputs 12% commission rate $\rightarrow$ rate saved.
   - Admin clicks "Approve Invoice" $\rightarrow$ invoice approved.
6. **Step 6: Payoff Creation**
   - System automatically creates `CommissionSnapshot` and `Payoff` in `PENDING` state.
   - Invoice displays read-only approved values.
7. **Step 7: Admin Settle Offline**
   - Admin navigates to `/admin/payoffs`.
   - Finds new payoff `PO-2026-XXXXX` in `PENDING`.
   - Clicks "Settle Offline".
   - Enters Bank Reference `UTR-HDFC-99882211`, date, and notes.
   - Clicks "Confirm Offline Settlement".
   - Payoff transitions to `SETTLED`.
8. **Step 8: Agent Verifies Settlement**
   - Agent visits `/agent/payoffs`.
   - Sees payoff `PO-2026-XXXXX` with `SETTLED` badge.
   - Clicks details: sees `UTR-HDFC-99882211`, date, and settled amount.
   - No administrative buttons are visible or accessible.

---

## 14. Browser/Network Verification

* **Network Request Verification**:
  - `PATCH /api/invoice-reviews/:invoiceId/correction`: Payload `{ remarks: "..." }`, Response `200 OK`.
  - `PATCH /api/invoice-reviews/:invoiceId/resubmit`: Payload `{ remarks: "..." }`, Response `200 OK`.
  - `GET /api/payoffs`: Response `200 OK` with scoped list.
  - `PATCH /api/payoffs/:id/settle`: Payload `{ settlementReference, settledAt, settlementNotes }`, Response `200 OK`.
  - `PATCH /api/payoffs/:id/cancel`: Payload `{ notes }`, Response `200 OK`.
* **Console Health**:
  - No uncaught React errors or rendering loops.
  - No infinite polling loops.
  - No unhandled promise rejections.

---

## 15. Known Limitations

1. **Batch Settlement Grouping**: While `batchReference` can be supplied during settlement, full batch lifecycle management (e.g. creating named batches, multi-payoff bulk approval) belongs to a future batch management phase.
2. **Granular Commission Snapshot Display**: Detailed per-application commission snapshots are stored in the database on invoice approval. Currently, the invoice detail view exposes the top-level approved financial values (`amount`, `commissionRate`). Dedicated visual breakout tables for multiple applications per invoice will be polished in the UI polish phase.
3. **No External Payment Gateway**: As specified in the FA-0 commercial policies, all settlements are strictly offline manual records. No automated payment transfer or gateway exists by design.

---

## 16. Frontend Readiness

```text
====================================================
FINAL STATUS: READY FOR UI POLISH
====================================================
```

The frontend financial flow is complete, fully functional, and verified end-to-end against the frozen FA-2 backend. The architecture is robust, strictly respects role boundaries, handles all edge cases and error states, and is now ready for future visual styling, animation, and UI polishing phases.
