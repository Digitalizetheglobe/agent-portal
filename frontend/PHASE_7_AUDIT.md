# Phase 7 Audit: Payoff & Commission Management

## Overview & Scope
Phase 7 provides the frontend workflow for Payoff & Commission Management within the QStudy Agent Portal.
All previous backend phases (Phases A through H) and frontend phases (Phases 1 through 6) are complete and frozen.
- **Backend changes**: 0 files
- **Database changes**: 0 migrations
- **Dependencies added**: 0 npm packages
- **Design consistency**: 100% adherence to existing portal typography (`Outfit` headings, `Inter` body), palette (`#042C53`, `#111827`, `#6B7280`, `#E5E7EB`), layout, table, card, dialog, and badge styles.

---

## Existing Backend Payoff APIs (AUTHORITATIVE BACKEND REALITY)

### 1. Backend Domain Modeling
- There is **no separate `/api/payoffs` table or route in the existing backend**.
- The backend tracks agent commission settlements, payout approvals, and payment statuses through the **`Invoice` domain** (`backend/models/Invoice.js`, `backend/services/invoiceService.js`, and `backend/services/invoiceReviewService.js`).
- The payment and payoff lifecycle is implemented directly on the Invoice entity:
  - `amount`: DOUBLE — The total commission settlement/payoff amount.
  - `commissionRate`: DOUBLE — The agreed commission percentage rate (e.g., 10%).
  - `status`: ENUM (`'Pending'`, `'Paid'`, `'Rejected'`) — Represents the financial settlement / payment status.
  - `paidAt`: DATE — The authoritative settlement timestamp recorded when payment is executed.
  - `remarks`: TEXT — Payment reference, transaction notes, or agency bank details.
  - `financeReviewStatus`: ENUM (`'PendingReview'`, `'UnderReview'`, `'Approved'`, `'Rejected'`).
  - `financeReviewedBy`: UUID — The reviewing administrator.
  - `financeReviewedAt`: DATE — Timestamp of financial verification approval.
  - `financeReviewNotes`: TEXT — Finance approval / payout notes.
  - `financeReviewHistory`: JSONB — Complete audit history of review and payout transitions.

### 2. Endpoints Governing Commission & Payoffs
- `GET /api/invoices`:
  - Lists all commission invoices / payoff records.
  - Agent role sees only own payoffs; Admin role sees all agents.
  - Parameters: `status` (`Pending`, `Paid`, `Rejected`), `agentId`, `search`, `page`, `limit`.
- `GET /api/invoices/:id`:
  - Returns populated invoice with agent profile, linked applications, university details, student information, and payment timestamps.
- `PATCH /api/invoices/:id/status` (Admin only):
  - Records payment settlement: `{ "status": "Paid", "remarks": "Transaction reference / bank settlement notes" }`.
  - Automatically stamps `paidAt = new Date()`.
- `GET /api/invoice-reviews`:
  - Finance queue of invoices requiring verification before payoff approval.
- `PATCH /api/invoice-reviews/:id/approve` (Admin only):
  - Approves invoice for payoff (`financeReviewStatus = 'Approved'`).
- `GET /api/invoices/eligible-applications`:
  - Discovers enrolled applications eligible for commission invoicing.

---

## Existing Commission APIs
- Commission calculations are anchored to enrolled applications:
  - Each application records `tuitionFee` (DECIMAL) and `currency` (STRING, default USD).
  - Invoice creation takes `applicationIds: [...]`, `amount`, and `commissionRate` (DOUBLE).
  - `amount` represents the net commission claim (e.g. `tuitionFee * (commissionRate / 100)`).
  - Invoices are stored in the database with their immutable `amount` and `commissionRate`.

---

## Existing Payoff Model
- The `Invoice` table functions as the definitive payoff entity:
  ```
  Invoice (Table: "Invoices")
  ├── id: UUID (Primary Key)
  ├── invoiceNumber: STRING (Unique generated, e.g. "INV-172778-4921")
  ├── agentId: UUID (Foreign Key -> Users)
  ├── amount: DOUBLE (Commission payout amount)
  ├── commissionRate: DOUBLE (Percentage commission, e.g. 10.0)
  ├── status: ENUM('Pending', 'Paid', 'Rejected') (Payout settlement status)
  ├── remarks: TEXT (Payment reference / notes)
  ├── invoiceUrl: STRING (Attached documentation)
  ├── raisedAt: DATE (Date invoice/payoff claim was raised)
  ├── paidAt: DATE (Date payment was settled / paid to agent)
  ├── financeReviewStatus: ENUM('PendingReview', 'UnderReview', 'Approved', 'Rejected')
  ├── financeReviewedBy: UUID (Reviewer ID)
  ├── financeReviewedAt: DATE (Approval timestamp)
  └── financeReviewHistory: JSONB
  ```

---

## Existing Commission Model
- Application entity holds the underlying academic and commercial baseline:
  ```
  Application (Table: "Applications")
  ├── id: UUID
  ├── studentId: UUID (Applicant)
  ├── universityId: UUID (Partner University)
  ├── agentId: UUID (Agent)
  ├── courseName: STRING
  ├── courseLevel: ENUM
  ├── tuitionFee: DECIMAL(10, 2)
  ├── currency: STRING
  ├── status: ENUM (Draft ... Enrolled)
  ├── isInvoiceEligible: BOOLEAN
  ├── isInvoiced: BOOLEAN
  └── invoiceId: UUID (Linked Invoice)
  ```

---

## Invoice → Payoff Relationship
1. Application reaches `status === 'Enrolled'`.
2. Application is marked `isInvoiceEligible === true`.
3. Agent raises Commission Invoice (`POST /api/invoices`).
4. Finance reviews invoice (`PATCH /api/invoice-reviews/:id/start` -> `approve`).
5. Invoice enters **Payoff Eligible State**: `financeReviewStatus === 'Approved'` AND `status === 'Pending'`.
6. Finance/Admin executes payment settlement (`PATCH /api/invoices/:id/status` with `status: 'Paid'`).
7. Invoice enters **Settled / Paid Payoff State**: `status === 'Paid'`, `paidAt` is set, and commission is fully settled.

---

## Commission Calculation Rules
1. **Tuition Baseline**: Derived from `application.tuitionFee` in USD (or course tuition).
2. **Commission Rate**: Specified on invoice (default 10%, configurable per agency agreement).
3. **Commission Amount**: `amount = totalTuition * (commissionRate / 100)`.
4. **Authoritative Storage**: Stored in `Invoice.amount` and `Invoice.commissionRate`. Frontend must always display backend-returned values and never synthesize artificial fees.

---

## Payoff Eligibility Rules
An agent's commission is eligible for payoff when:
1. Student Application `status === 'Enrolled'`.
2. Application `isInvoiceEligible === true`.
3. Invoice has been raised (`isInvoiced === true`).
4. Finance review is approved (`financeReviewStatus === 'Approved'`).
5. Payment status is pending settlement (`status === 'Pending'`).

---

## Payoff Status Lifecycle
```
[Application Enrolled]
          ↓
[Invoice Raised] (financeReviewStatus: PendingReview, status: Pending)
          ↓
[Finance Review: UnderReview]
          ↓
[Finance Review: Approved] -> (PAYOFF ELIGIBLE)
          ↓
[Payment Settlement: Paid] -> (SETTLED / PAID) -> paidAt stamped
```
If rejected during review:
```
[Finance Review: Rejected] -> (INELIGIBLE / ACTION REQUIRED)
```

---

## Role Permissions

| Operation | Admin | Agent |
|---|---|---|
| View All Payoffs / Commissions | Yes | No (Only own) |
| View Payoff Breakdown by Student | Yes | Yes (Only own) |
| Review / Approve Payoff Claim | Yes | No |
| Record Settlement / Mark Paid | Yes | No |
| View Payment Reference & Date | Yes | Yes (Only own) |
| Request Payoff / Raise Invoice | Yes | Yes (Only own eligible) |

---

## Existing Frontend Infrastructure
- `api.js`: Contains `invoiceAPI` and `invoiceReviewAPI`.
- `DataContext.js`: Contains `invoices`, `reviewQueue`, `fetchInvoices`, `updateInvoiceStatus`.
- `Sidebar.jsx`: Contains links for Dashboard, Agents, Events, Students, Applications, Universities, Courses, Invoices.
- `App.js`: Configured with React Router routes for admin and agent.

---

## Existing Routes
- `/admin/invoices`
- `/agent/invoices`
- `/admin/applications/:id`
- `/agent/applications/:id`

---

## Missing Frontend Functionality (Phase 7 Deliverables)

1. **Agent Payoff & Commission Page (`/agent/payoffs`)**:
   - Financial Summary KPIs: Total Commission Earned, Ready for Payoff (Approved & Pending Settlement), In Review, Total Settled / Paid.
   - Payoff Settlement Table: Payoff ID, invoice reference, linked applications, student names, university, total commission amount, payoff status (`Eligible`, `In Review`, `Paid`, `Rejected`), settlement date.
   - Payoff Inspection Modal: Displays detailed breakdown of tuition, commission rate, settlement timestamp (`paidAt`), payment notes, and attached documents.
2. **Finance / Admin Payoff Settlement Queue (`/admin/payoffs`)**:
   - Settlement Queue tab: Invoices with `financeReviewStatus === 'Approved'` and `status === 'Pending'`, highlighted as Ready for Payout.
   - Payoff Settlement Modal (`PayoffSettlementModal.jsx`): Allows Admin to input payment reference / transaction number, payment method notes, and record official payout (`PATCH /api/invoices/:id/status` -> `Paid`).
   - Settled Payoffs History: Archive of all paid commission payouts with payment dates and references.
3. **Application Details Integration (`ApplicationDetailsPage.jsx`)**:
   - Update Commission card to display full Payoff lifecycle:
     - When invoiced and approved: "Eligible for Payoff" badge.
     - When paid: "Commission Settled / Paid" badge with settlement date and transaction reference.
4. **Navigation Integration**:
   - Add "Payoffs" navigation link in `Sidebar.jsx` for both Admin (`/admin/payoffs`) and Agent (`/agent/payoffs`).
   - Register routes in `App.js`.

---

## Backend Gaps
- None. The backend's `Invoice` and `InvoiceReview` infrastructure fully supports the complete financial lifecycle, status transitions, commission amounts, review approvals, and settlement timestamps without requiring database migrations or backend changes.

---

## Implementation Plan

1. **Create `frontend/src/components/modals/PayoffSettlementModal.jsx`**:
   - Modal for Admin to record payment reference, payment date, transaction ID, and mark payoff as Paid.
2. **Create `frontend/src/pages/agent/AgentPayoffsPage.jsx`**:
   - Dedicated Agent Payoff & Commission portal with KPI cards, settlement directory, status badges, and inspection dialog.
3. **Create `frontend/src/pages/admin/AdminPayoffsPage.jsx`**:
   - Dedicated Admin Payoff & Settlement management page with Ready for Payoff queue, settled archive, and settlement actions.
4. **Update `frontend/src/pages/admin/ApplicationDetailsPage.jsx`**:
   - Enhance Commission card with payoff eligibility and settlement status.
5. **Update Navigation & Routing (`Sidebar.jsx`, `App.js`)**:
   - Add `/admin/payoffs` and `/agent/payoffs` routes and sidebar items.
6. **Automated Verification**:
   - Run verification suite verifying agent isolation, settlement execution, status transitions, and regression on Phases 1–6.
   - Execute production build `npm run build` ensuring 0 compilation errors.
