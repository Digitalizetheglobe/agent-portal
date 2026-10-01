# Phase 6 Audit: Invoice Management + Finance Review

## Overview & Scope
Phase 6 connects the completed and frozen backend Invoice Management (Phase F) and Finance Review (Phase G) to the QStudy Agent Portal frontend.
All previous backend phases (Phases A through H) and frontend phases (Phase 1 through 5) are frozen.
- **Backend changes**: 0 files
- **Database changes**: 0 migrations
- **Dependencies added**: 0 npm packages
- **Design consistency**: 100% adherence to existing portal typography (`Outfit` headings, `Inter` body), palette (`#042C53`, `#111827`, `#6B7280`, `#E5E7EB`), layout, table, card, dialog, and badge styles.

---

## Backend Invoice APIs (EXISTING & AUTHORITATIVE)

### 1. `POST /api/invoices`
- **Auth**: Required (`protect`)
- **Role Requirement**: `agent` or `admin`
- **Request Body**:
  ```json
  {
    "applicationIds": ["uuid-1", "uuid-2"], // preferred modern array
    "studentIds": ["uuid-1"],               // legacy support, mutually exclusive with applicationIds
    "amount": 1500,                         // required, non-negative number
    "commissionRate": 10,                   // optional percentage number, default 0
    "remarks": "Optional invoice remarks",
    "invoiceUrl": "https://..."             // optional document URL
  }
  ```
- **Response**: Created `Invoice` object with status `Pending`, `financeReviewStatus: 'PendingReview'`, populated `agent`, `applications` (with `student`, `university`), and `studentIds`.
- **Validation**:
  - Requires `amount` (valid non-negative number).
  - Cannot provide both `applicationIds` and `studentIds`.
  - Applications must be in `status === 'Enrolled'`.
  - Applications must have `isInvoiceEligible === true`.
  - Applications must have `isInvoiced === false` and `invoiceId === null`.
  - Agent ownership: Agents can only invoice applications assigned to them.
- **Status Codes**: 201 on success, 400 validation error, 403 authorization error, 404 application not found.

### 2. `GET /api/invoices`
- **Auth**: Required (`protect`)
- **Role Requirement**: Any authenticated user (`admin` sees all, `agent` sees only own invoices)
- **Parameters**: `page`, `limit`, `status` (`Pending`, `Paid`, `Rejected`), `search`, `agentId` (admin only), `envelope=true`
- **Response**: List of formatted invoices (or `{ total, page, totalPages, limit, invoices }` if envelope=true).
- **Headers**: `X-Total-Count`, `X-Page`, `X-Total-Pages`, `X-Limit`.

### 3. `GET /api/invoices/eligible-applications`
- **Auth**: Required (`protect`)
- **Role Requirement**: Any authenticated user (`agent` sees own eligible applications, `admin` sees all or filtered by `agentId`)
- **Parameters**: `page`, `limit`, `search`, `universityId`, `agentId`, `envelope=true`
- **Filtering Logic**: Returns applications where `status === 'Enrolled'`, `isInvoiceEligible === true`, `isInvoiced === false`, `invoiceId === null`.
- **Response**: Array of eligible `Application` objects populated with `student`, `university`, and `agent`.

### 4. `GET /api/invoices/:id`
- **Auth**: Required (`protect`)
- **Role Requirement**: `admin` or owner `agent`
- **Response**: Populated invoice object including `agent`, `applications` (with nested `student` and `university`), `studentIds`, and `reviewer`.

### 5. `PATCH /api/invoices/:id/status`
- **Auth**: Required (`protect`, `restrictTo('admin')`)
- **Request Body**: `{ "status": "Paid" | "Rejected", "remarks": "..." }`
- **Response**: Updated invoice object.

### 6. `DELETE /api/invoices/:id`
- **Auth**: Required (`protect`)
- **Role Requirement**: Admin or owner agent. Only unpaid invoices (`status !== 'Paid'`) can be deleted. Automatically unlinks applications (`isInvoiced: false, invoiceId: null`).

---

## Finance Review APIs (EXISTING & AUTHORITATIVE)

### 1. `GET /api/invoice-reviews`
- **Auth**: Required (`protect`)
- **Role Requirement**: `admin` only (enforced in `invoiceReviewService.js`)
- **Parameters**: `financeReviewStatus` (`PendingReview`, `UnderReview`, `Approved`, `Rejected`, or `ALL`), `status`, `search`, `agentId`, `page`, `limit`, `envelope=true`
- **Response**: Array of invoices in review queue with populated `agent`, `reviewer`, and `applications`.

### 2. `GET /api/invoice-reviews/:invoiceId`
- **Auth**: Required (`protect`)
- **Role Requirement**: `admin` or owner `agent` (agents can view their own review details)
- **Response**: Invoice review details object.

### 3. `PATCH /api/invoice-reviews/:invoiceId/start`
- **Auth**: Required (`protect`)
- **Role Requirement**: `admin` only
- **Validation**: Transition only valid from `PendingReview` -> `UnderReview`.
- **Response**: Updated invoice with `financeReviewStatus = 'UnderReview'`, `financeReviewedBy = currentUser.id`, `financeReviewedAt = now`, and review history updated with `REVIEW_STARTED`.

### 4. `PATCH /api/invoice-reviews/:invoiceId/approve`
- **Auth**: Required (`protect`)
- **Role Requirement**: `admin` only
- **Request Body**: `{ "notes": "Optional approval notes" }`
- **Validation**: Transition only valid from `UnderReview` -> `Approved`. Must be started first.
- **Response**: Updated invoice with `financeReviewStatus = 'Approved'`, `financeReviewNotes`, history updated with `REVIEW_APPROVED`. (Invoice payment status remains untouched).

### 5. `PATCH /api/invoice-reviews/:invoiceId/reject`
- **Auth**: Required (`protect`)
- **Role Requirement**: `admin` only
- **Request Body**: `{ "reason": "Mandatory rejection reason", "notes": "Optional notes" }`
- **Validation**: Transition only valid from `UnderReview` -> `Rejected`. `reason` is required.
- **Response**: Updated invoice with `financeReviewStatus = 'Rejected'`, `financeRejectionReason`, history updated with `REVIEW_REJECTED`.

### 6. `GET /api/invoice-reviews/:invoiceId/history`
- **Auth**: Required (`protect`)
- **Role Requirement**: `admin` or owner `agent`
- **Response**: Array of review audit entries:
  ```json
  [
    {
      "action": "REVIEW_STARTED" | "REVIEW_APPROVED" | "REVIEW_REJECTED",
      "from": "PendingReview" | "UnderReview",
      "to": "UnderReview" | "Approved" | "Rejected",
      "notes": "...",
      "changedBy": "user-uuid",
      "changedAt": "2026-10-01T..."
    }
  ]
  ```

---

## Invoice Model & Relationships

```
Invoice
 ├── agentId -> User (Role: Agent) [as: 'agent']
 ├── financeReviewedBy -> User (Role: Admin) [as: 'reviewer']
 ├── applications -> [Application] (foreignKey: 'invoiceId', as: 'applications')
 │     ├── studentId -> Student [as: 'student']
 │     └── universityId -> University [as: 'university']
 └── studentIds (JSONB array for backward compatibility)
```

### Invoice Fields
- `id` (UUID, primary key)
- `invoiceNumber` (STRING, unique, generated e.g. `INV-172778...`)
- `agentId` (UUID, required)
- `studentIds` (JSONB, array)
- `amount` (DOUBLE, required)
- `commissionRate` (DOUBLE, default 0)
- `status` (ENUM: `'Pending'`, `'Paid'`, `'Rejected'`, default `'Pending'`)
- `remarks` (TEXT)
- `invoiceUrl` (STRING, optional document URL)
- `raisedAt` (DATE)
- `paidAt` (DATE)
- `financeReviewStatus` (ENUM: `'PendingReview'`, `'UnderReview'`, `'Approved'`, `'Rejected'`, default `'PendingReview'`)
- `financeReviewedBy` (UUID)
- `financeReviewedAt` (DATE)
- `financeReviewNotes` (TEXT)
- `financeRejectionReason` (TEXT)
- `financeReviewHistory` (JSONB, array)

---

## Existing Frontend Infrastructure

### Existing Routes (`App.js`)
- `/admin/invoices` -> `AdminInvoicesPage.jsx`
- `/agent/invoices` -> `InvoicesPage.jsx`
- `/admin/applications/:id` -> `ApplicationDetailsPage.jsx`
- `/agent/applications/:id` -> `ApplicationDetailsPage.jsx`

### Existing Components
- `AdminInvoicesPage.jsx`: Contains basic invoice table and KPI cards, but lacks Finance Review Queue integration, start review / approval / rejection modals, and application-based invoice display.
- `InvoicesPage.jsx`: Used outdated `student.status === 'Converted'` filtering rather than the backend Phase F `GET /api/invoices/eligible-applications`.
- `ApplicationDetailsPage.jsx`: Contains comprehensive 6-milestone admission tracking (Phase 5), but has no invoice card or "Raise Invoice" integration.

### Existing Context / API Methods (`api.js` & `DataContext.js`)
- `invoiceAPI`: `getAll`, `getById`, `create`, `updateStatus`, `getEligibleApplications` (already in `api.js`)
- `invoiceReviewAPI`: `getAll`, `getByInvoiceId`, `start`, `approve`, `reject`, `getReviewHistory` (already in `api.js`)
- `DataContext.js`: Has `invoices`, `reviewQueue`, `fetchInvoices`, `fetchReviewQueue`, `createInvoice`, `updateInvoiceStatus`, `startInvoiceReview`, `approveInvoiceReview`, `rejectInvoiceReview`.

---

## Roles & Access Control

| Operation | Admin | Agent |
|---|---|---|
| View All Invoices | Yes | No (Only own) |
| Create Invoice | Yes | Yes (Only own eligible applications) |
| Delete Unpaid Invoice | Yes | Yes (Only own unpaid invoices) |
| Update Payment Status | Yes | No |
| View Finance Review Queue | Yes | No |
| View Own Invoice Review State | Yes | Yes |
| Start Finance Review | Yes | No |
| Approve Invoice Review | Yes | No |
| Reject Invoice Review | Yes | No |
| View Review History | Yes | Yes (Only own invoice) |

---

## Application Integration

In `ApplicationDetailsPage.jsx`:
- Application object contains `status`, `isInvoiceEligible`, `isInvoiced`, `invoiceId`.
- When `status === 'Enrolled'` and `isInvoiceEligible === true` and `!isInvoiced`:
  - Show "Invoice Eligible" badge.
  - Show "Raise Commission Invoice" button for the assigned agent or admin.
  - Clicking launches `InvoiceModal` with the application pre-selected.
- When `isInvoiced === true` or `invoiceId`:
  - Show "Invoiced" badge with linked invoice details.
  - Link directly to the invoice view modal or invoice page.
- When not yet eligible:
  - Show "Not yet eligible for invoicing (requires completed enrollment)".

---

## Status Lifecycles

### Payment Status
`Pending` -> `Paid` or `Rejected`

### Finance Review Status
`PendingReview` -> `UnderReview` -> `Approved` or `Rejected`

---

## What is Missing (To Be Implemented)

1. **`InvoiceModal.jsx`**:
   - Modern modal for raising invoices based on eligible applications (`GET /api/invoices/eligible-applications`).
   - Allows selecting one or multiple eligible applications.
   - Calculates default amount and commission rate.
   - Accepts invoice remarks and document/invoice URL.
   - Supports pre-selection when triggered from `ApplicationDetailsPage`.

2. **Finance Review Modals & Queue UI in `AdminInvoicesPage.jsx`**:
   - Tab for "Finance Review Queue" alongside Invoices.
   - Ability to filter by `PendingReview`, `UnderReview`, `Approved`, `Rejected`.
   - "Start Review" action button (transitions `PendingReview` -> `UnderReview`).
   - Finance Review Modal: Review invoice details, linked applications, students, universities, and agent; approve with notes, or reject with required rejection reason and notes.
   - Audit trail tab in invoice detail view showing complete review history timeline (`REVIEW_STARTED`, `REVIEW_APPROVED`, `REVIEW_REJECTED`).

3. **Modernized `InvoicesPage.jsx` (Agent)**:
   - Upgraded to fetch real eligible applications via `invoiceAPI.getEligibleApplications()`.
   - Displays finance review status badge (`PendingReview`, `UnderReview`, `Approved`, `Rejected`) alongside payment status badge (`Pending`, `Paid`, `Rejected`).
   - Displays linked application, student, and university in invoice item views.
   - Displays rejection reason and review notes when applicable.

4. **Integration in `ApplicationDetailsPage.jsx`**:
   - Add clean "Invoice & Commission" card in the right column or under Enrollment milestone.
   - Connect "Raise Invoice" to open `InvoiceModal`.
   - Preserve 100% of Phase 5 admission tracking, stepper, modals, and regression safety.

---

## Backend Gaps
- None. Backend Phase F (`/api/invoices`) and Phase G (`/api/invoice-reviews`) provide all required endpoints, queries, transitions, transactions, and audit histories.

---

## Implementation Plan

1. **Create `frontend/src/components/modals/InvoiceModal.jsx`**:
   - Component for raising invoices with eligible applications selector, amount, commission rate, remarks, invoice URL.
2. **Create `frontend/src/components/modals/FinanceReviewModal.jsx`**:
   - Admin modal to inspect invoice details, start review, approve with notes, or reject with reason & notes, with audit history.
3. **Enhance `frontend/src/pages/admin/AdminInvoicesPage.jsx`**:
   - Add Finance Review tab / queue with full actions, status badges, and review modals.
4. **Enhance `frontend/src/pages/agent/InvoicesPage.jsx`**:
   - Upgrade to use `InvoiceModal` with `getEligibleApplications`, display modern application relationships, finance review status, and review history.
5. **Update `frontend/src/pages/admin/ApplicationDetailsPage.jsx`**:
   - Add Invoice status card and "Raise Invoice" trigger without disturbing Phase 5 admission tracking.
6. **Verification & Build**:
   - Run verification test verifying end-to-end invoice creation, finance review transitions, agent isolation, and regression on Phases 2-5.
   - Execute `npm run build` in `frontend` ensuring 0 compilation errors.
