# QStudy Agent Portal — AI Development Tracker

> **Purpose:** This document is the single source of truth for AI-assisted development of the QStudy Agent Portal.
>
> **AI rule:** Before making changes, read this file. Do not assume a phase is complete unless this document explicitly marks it `DONE` and the completion notes/evidence are recorded.

---

## 1. Project Goal

Build a QStudy Agent Portal that manages the complete business journey:

```text
Agent
  ↓
Student Referral
  ↓
Student Application
  ↓
University Selection
  ↓
University Visit
  ↓
Admission
  ↓
Agent Raises Invoice
  ↓
Finance Review
  ↓
Student / Application Verification
  ↓
Invoice Approval / Rejection
  ↓
Payoff Calculation
  ↓
Finance Approves Payoff
  ↓
Finance Records Offline Settlement
  ↓
Agent Sees Settlement Status
```

The portal should support the critical business flow first and expand only after the business rules are confirmed.

---

# 2. Current Project Status

## Overall Status

**Current Track:** Financial UI / UX Polish (FA-4)  
**Current Phase:** FA-4.4 — Admin Review & Rejection UX Polish (`PASS / FROZEN`)  
**Overall Status:** `READY FOR FA-4.5 (Payoff & Settlement UX Polish)`  
**Classification:** `FA-0 to FA-3: PASS / FROZEN` | `FA-4.1: PASS / AUDIT COMPLETE` | `FA-4.2: PASS / FROZEN` | `FA-4.3: PASS / FROZEN` | `FA-4.4: PASS / FROZEN`

### Module Status Matrix (Phases 1–8.1)

| Phase | Module | Technical Status | Business Flow Status | Action Needed |
|---|---|---|---|---|
| **Phase 1** | Portal Foundation & RBAC | `TECH PASS` | `FLOW REVIEW` | Enforce role boundaries across routes & DataContext |
| **Phase 2** | University & Courses | `TECH PASS` | `FLOW REVIEW` | Isolate agency application metrics & prevent leak |
| **Phase 3** | Student Management | `TECH PASS` | `FLOW REVIEW` | Enforce strict agent isolation & eliminate client fallback bleed |
| **Phase 4** | Application Management | `TECH PASS` | `FLOW REVIEW` | Remove unauthoritative tuition fallbacks |
| **Phase 5** | Admission Tracking | `TECH PASS` | `AUTHORITY FIX` | Reclaim institutional milestones from Agent to Admin |
| **Phase 6** | Invoice + Finance Review | `TECH PASS` | `FLOW REVIEW` | Tie invoice eligibility strictly to verified milestones |
| **Phase 7** | Payoff + Commission | `TECH PASS` | `AUTHORITY FIX` | Restrict payoff release strictly to Finance role |
| **Phase 8** | Student Verification | `TECH PASS` | `FLOW REVIEW` | Establish granular document review lifecycle |
| **Phase 8.1** | **Business Corrections** | `IN PROGRESS` | `IN PROGRESS` | **Active Remediation (Waves A–D)** |

### Phase 8.1 Remediation Sequence
- **Phase 8.1-A:** Agent Isolation & Security Hardening (P0) — `PASS / FROZEN` (41/41 Security Tests Passed, Zero Build Errors)
- **Phase 8.1-B:** Authority & Milestone Separation (P0) — `PASS / FROZEN` (39/39 Security Tests Passed, Zero Build Errors)
- **Phase 8.1-C:** Granular Document Approval Workflow (P1) — `PASS / FROZEN` (52/52 Security Tests Passed, Zero Build Errors)
- **Phase 8.1-D:** Tuition, Commission & Payoff Integrity (P0) — `PASS / FROZEN` (36/36 Integrity Tests Passed, Zero Build Errors)

---

---

# 4. Current Priority: Financial Architecture Track (FA-0 to FA-4)

## Financial Architecture Status Overview

| Track / Phase | Title | Status | Scope / Deliverable |
|---|---|---|---|
| **FA-0** | Business Rules & Commercial Policies | `PASS / FROZEN` | Frozen commercial triggers, tuition authority, settlement-only payment boundaries |
| **FA-1** | Read-Only Financial Architecture Audit | `PASS WITH GAPS → CLOSED` | Complete forensic audit against 27 criteria (0 code changes, 0 DB migrations) |
| **FA-2** | Minimal Financial Backend (Models, Snapshots, Payoffs, Correction Flow) | `PASS / FROZEN` | CommissionSnapshots, Payoffs (PENDING→SETTLED/CANCELLED), CorrectionRequired/Resubmit, 74/74 green tests |
| **FA-3** | Frontend Financial Flow (Agent & Admin Portals, Payoff Ledger, Correction/Resubmit) | `PASS / FROZEN` | Full FA-2 API integration, real payoff ledger, correction/resubmit lifecycle, offline settlement modal, zero build errors, 38/38 flow tests passed |
| **FA-4.1** | Financial UX Audit | `PASS / COMPLETE` | Systematic 6-pillar forensic audit across Agent & Admin financial screens; roadmap established for FA-4.2 through FA-4.8 |
| **FA-4.2** | Status / Badge / Financial Visual System | `PASS / FROZEN` | Centralized FinancialStatusBadge, FinancialStateHierarchy, token map, formatCurrency, tabular-nums, button utilities, 0 build errors |
| **FA-4.3** | Agent Invoice UX Polish | `PASS / FROZEN` | True lifecycle KPIs, action-required top banner with inline response, Approved snapshot card with Payoff state hierarchy, 0 build errors |
| **FA-4.4** | Admin Review & Rejection UX Polish | `PASS / FROZEN` | Unified operational tabs, quick correction prompt chips, coupled calculation preview, FinancialStateHierarchy, 0 build errors |

---

## 🔒 FROZEN HARD BOUNDARY (NON-NEGOTIABLE ARCHITECTURE CONTRACT)

```text
APPLICATION
    ↓
Enrolled + Deposit Verified
    ↓
Commission Eligible
    ↓
INVOICE / CLAIM
    ↓
Finance Review
    ↓
Application-level Commission Snapshot
    ↓
Approved Invoice
    ↓
PAYOFF
    ↓
PENDING
    ↓
Finance confirms offline transfer
    ↓
SETTLED
```

### Architectural Axioms:
```text
Invoice ≠ Commission
Commission ≠ Payoff
Payoff ≠ Payment Gateway
Payoff settlement = manual accounting confirmation
```

### Financial Domain Entities:
```text
Application
    │
    └── CommissionSnapshot
             │
             └── Invoice
                    │
                    └── Payoff
                         ├── PENDING
                         ├── SETTLED
                         └── CANCELLED
```

### Strict System Exclusions (Out of Scope):
- ❌ **NO PaymentTransaction Entity**
- ❌ **NO Payment Gateway (Razorpay, Stripe, PayPal)**
- ❌ **NO Bank API / Direct Rails / Wire Integrations**
- ❌ **NO Payment Webhooks**
- ❌ **NO Automated Money Transfer or Automated Verification**
- ❌ **NO Payment Processing State**

*The system records a human-confirmed offline settlement; it does not execute or verify financial transfers.*

---

## FA-0 — Business Rules & Commercial Policies

**Status:** `PASS / FROZEN`  
**Classification:** `Commercial Contract Signed & Frozen`  
**Implementation Changes:** `NONE (Specification only)`

### Confirmed Decisions & Boundaries

1. **Commission Payable Commercial Trigger:**
   $$\text{Application.status} == \text{'Enrolled'} \quad\wedge\quad \text{Deposit Verification} == \text{Satisfied}$$
   - When met, the application transitions to **Commission Eligible**.
   - This trigger establishes *eligibility to claim*; it does NOT mean invoice approved or payment settled.

2. **Tuition Authority Pipeline (Disambiguation):**
   ```text
   estimatedTuition (Agent Draft)
          ↓
   contractualTuition (Confirmed by Admin from University Admission Letter)
          ↓
   commissionableTuition (Contractual Base Tuition minus non-commissionable fees)
          ↓
   Commission Calculation Base
   ```
   - **`estimatedTuition`**: Informational only; entered by agent on intake. **Never** used for commission calculation.
   - **`contractualTuition`**: Authoritative tuition verified and locked by Admin during admission confirmation.
   - **`commissionableTuition`**: The exact base multiplied by the agent commission rate.

3. **Commission Rate Authority & Snapshots:**
   - **Rate Authority:** Admin-configured per Agent agreement (e.g., Agent A = 10%, Agent B = 12%). Agents can never submit or mutate rates.
   - **Application-Level Snapshot:** Calculation is derived per application ($\text{Commissionable Tuition} \times \text{Locked Rate}$) and frozen in `CommissionSnapshots`.
   - **Historical Immutability:** Changing an agent's agreement rate later never alters already-approved historical commission records.

4. **Settlement-Only Payment Tracking Model (Hard Boundary):**
   - System records human-confirmed offline payment settlements (wire/bank transfer confirmation, reference UTR, date, notes).
   - Zero external payment gateways or transaction entities.

5. **Aggregation Flow:**
   - An Invoice / Claim can bundle **one or more** eligible applications.
   - Granular `CommissionSnapshots` aggregate into the `Invoice` and generate the official `Payoff`.

---

## FA-1 — Read-Only Financial Architecture Audit

**Status:** `PASS WITH GAPS → CLOSED`  
**Code Changes:** `0` | **Database Changes:** `0` | **API Changes:** `0` | **Frozen Backend Changes:** `0`

### Audit Summary & Verified Gaps

- **Upstream Integrity:** Student Registration, Document Verification Gate, Application Management, and the 4-Pillar Milestone Gate are robust and securely role-isolated.
- **Identified Gaps (Closed for remediation in FA-2+):**
  1. **Entity Overload:** `Invoice` was overloaded as claim, commission calculation, payoff view, and payment record (`Invoice.status = 'Paid'`).
  2. **No Payoff Model:** No `Payoffs` table exists in PostgreSQL; UI payoff pages were cosmetic views over `Invoices`.
  3. **No Snapshot Table:** Commission rate was stored directly on `Invoice` without per-application snapshot immutability.
  4. **Unstructured Settlement:** Payment references (bank wire UTR) were concatenated into `Invoice.remarks` as text.
  5. **Terminal Rejection:** Invoice review rejection was a terminal state without structured `CorrectionRequired` / resubmission flow.
  6. **Primitive Deposit:** `depositPaid` is a boolean rather than a verified finance status.

---

## FA-2 — Financial Domain Model & Minimal Backend Implementation

**Status:** `PASS / FROZEN`  
**Classification:** `Production-Safe Backend Implemented & Verified`  
**Scope:** Models (`CommissionSnapshot`, `Payoff`), Migrations, Services, Controllers, Routes, Atomicity, 74/74 Green Regression Tests

### 1. Conceptual Architecture & Entity Hierarchy

```text
APPLICATION
    │
    │ eligible (Enrolled + Deposit Verified)
    ▼
COMMISSION SNAPSHOT
    │
    │ 1 application + 1 invoice claim: UNIQUE(applicationId, invoiceId)
    ▼
INVOICE
    │
    │ APPROVED (triggers automatic Payoff creation)
    ▼
PAYOFF
    ├── PENDING
    ├── SETTLED (Terminal)
    └── CANCELLED (Terminal)
```

---

### 2. The Two Lean Financial Entities

#### A. `CommissionSnapshots` (Application-level historical audit)
> **Historical Truth Principle:** Preserves exact financial terms at time of approval. If University admission letter states $20,000 but $2,000 is a non-commissionable campus fee, the snapshot preserves both what the university charged and what commission was calculated on.

- **Fields:**
  - `id`: UUID (Primary Key)
  - `applicationId`: UUID (References `Applications.id`)
  - `invoiceId`: UUID (References `Invoices.id`)
  - `contractualTuition`: DECIMAL(10,2) (Official tuition verified from University Admission Letter)
  - `commissionableTuition`: DECIMAL(10,2) (Calculation base after subtracting non-commissionable fees/discounts)
  - `commissionRate`: DECIMAL(5,2) (Snapshotted Agent Agreement Rate, e.g., `10.00`)
  - `grossAmount`: DECIMAL(10,2) ($\text{commissionableTuition} \times \frac{\text{commissionRate}}{100}$)
  - `lockedAt`: TIMESTAMP WITH TIME ZONE (Stamped permanently at invoice approval)
  - `lockedBy`: UUID (References `Users.id` - Admin/Finance reviewer who approved)
- **Constraints & Invariants:**
  - `UNIQUE(applicationId, invoiceId)` — Prevents duplicate claims for an application in the same invoice.
  - **Snapshot Timing & Immutability:**
    ```text
    Agent submits claim
            ↓
    Finance reviews claim
            ↓
    Finance verifies contractualTuition & commissionableTuition
            ↓
    System drafts CommissionSnapshot
            ↓
    Finance approves invoice (Invoice.status = 'APPROVED')
            ↓
    Snapshot becomes permanently immutable (lockedAt = NOW(), lockedBy = reviewerId)
    ```
  - **Agent Authority Restriction:** Agents can **never** submit, modify, or recalculate snapshot values.
  - **Re-claim Isolation:** If an eligible application is released from a rejected or cancelled invoice and subsequently included in a new invoice, a **new** `CommissionSnapshot` record is created for the new invoice. Historical snapshots are never reused, overwritten, or mutated across invoices.

#### B. `Payoffs` (Settlement Tracking Liability)
> **Liability Tracking Principle:** Tracks internal settlement obligation. The system records human-confirmed offline disbursements (wire, cheque, UTR); it does NOT integrate with external payment gateways or money rails.

- **Fields:**
  - `id`: UUID (Primary Key)
  - `payoffNumber`: VARCHAR(50) UNIQUE (e.g., `PO-2026-0001`)
  - `agentId`: UUID (References `Users.id`)
  - `invoiceId`: UUID UNIQUE (References `Invoices.id` — Enforces **strictly one** Payoff per approved Invoice)
  - `grossCommission`: DECIMAL(12,2) (Sum of associated snapshot gross amounts)
  - `deductions`: DECIMAL(12,2) (TDS / Tax withholding / Adjustments, default `0.00`)
  - `netAmount`: DECIMAL(12,2) ($\text{grossCommission} - \text{deductions}$)
  - `currency`: VARCHAR(10) (Default `'USD'`)
  - `status`: ENUM (`'PENDING'`, `'SETTLED'`, `'CANCELLED'`)
  - `settlementReference`: VARCHAR(100) (Bank UTR / Wire Ref / Cheque No)
  - `settledAt`: TIMESTAMP WITH TIME ZONE
  - `settledBy`: UUID (References `Users.id`)
  - `settlementNotes`: TEXT
  - `batchReference`: VARCHAR(100) (Optional batch grouping tag, e.g., `'BATCH-2026-OCT-01'`)
  - `createdAt`: TIMESTAMP WITH TIME ZONE (Default `NOW()`)
- **Authoritative Creation Trigger:**
  ```text
  Invoice.status = 'APPROVED'
          ↓
  Create exactly one Payoff
          ↓
  Payoff.status = 'PENDING'
  ```
  Enforced by `UNIQUE(invoiceId)` on `Payoffs` table to eliminate accidental duplicate liabilities.

---

### 3. State Machine Contracts

#### A. Payoff 3-State Lifecycle & Terminal Immutability:
```text
            ┌─────────────┐
            │   PENDING   │ ◄── (Auto-created when Invoice.status = 'APPROVED')
            └──────┬──────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
  ┌─────────────┐     ┌─────────────┐
  │   SETTLED   │     │  CANCELLED  │
  └─────────────┘     └─────────────┘
  (Offline payment     (Voided before
   manually confirmed)  settlement)
```
- **Terminal Immutability Invariant:** Both `SETTLED` and `CANCELLED` are terminal states.
- Once a Payoff enters `SETTLED`:
  - ❌ **Cannot edit amount:** `grossCommission`, `deductions`, and `netAmount` are permanently locked.
  - ❌ **Cannot edit agent:** `agentId` cannot be altered.
  - ❌ **Cannot edit invoice:** `invoiceId` cannot be changed.
  - ❌ **Cannot alter settlement details:** `settlementReference`, `settledAt`, and `settledBy` are permanently frozen.
  - 🛡️ **Post-Settlement Adjustments:** Any correction after settlement requires a separate, controlled reversal/adjustment record—never in-place mutation of the historical payoff.

#### B. Invoice Claim Lifecycle & State Disambiguation:
```text
Submitted ──> UnderReview ──> CorrectionRequired ──(Agent edits claim)──> Resubmitted ──> UnderReview ──> Approved
                        └──> Rejected
```
- **`CorrectionRequired`:** Claim is incomplete or contains discrepancies (e.g., missing proof, rate tier disagreement). The claim remains open and agent can correct details and resubmit back to `UnderReview`.
- **`Rejected`:** Claim is denied (e.g., fraudulent submission, duplicate claim, student cancelled prior to census). This is a **terminal state** for this claim; it cannot continue through normal resubmission. Associated applications are released or archived per institutional policy.

---

### 4. FA-2 Pre-Implementation Verification Checklist

- [x] Entity split verified: `CommissionSnapshots` + `Payoffs` (Lean model, zero Payment entities).
- [x] Tuition disambiguation: `contractualTuition` + `commissionableTuition` (no ambiguous `baseTuition`).
- [x] Snapshot timing locked: Immutable upon `Invoice.status = 'APPROVED'` (`lockedAt`, `lockedBy`).
- [x] Snapshot isolation: `UNIQUE(applicationId, invoiceId)` — Re-claims create new snapshots.
- [x] Payoff creation trigger: Exactly 1 Payoff generated on Invoice approval; `UNIQUE(invoiceId)`.
- [x] Terminal immutability: `SETTLED` and `CANCELLED` strictly locked against all mutations.
- [x] Review disambiguation: `CorrectionRequired` (resubmittable) vs `Rejected` (terminal claim denial).
- [x] No payment gateway / money transfer code allowed in any subsequent phase.
- [x] Backend Verification: 44/44 FA-2 Tests Passed, 30/30 Phase 8.1 Regression Tests Passed (74/74 Total Green).
- [x] Database Migration: `migrate_fa_2.js` executed cleanly against PostgreSQL.
- [x] Final Classification: `PASS / FROZEN` (Ready for Frontend).

---

# 5. P1 — Actors, Roles & Permissions

**Status:** `NOT_STARTED`

## Proposed actors

| Role | Responsibility |
|---|---|
| Agent | Register students, track applications, raise invoices |
| Finance | Review invoices, approve/reject, process payoff |
| Verification / Operations | Verify student, university, admission and documents |
| Admin | Manage agents, users, universities, configuration and overall system |
| Management | View reports and financial/agent performance |

> These responsibilities are proposed from the current workflow and must be confirmed by QStudy.

## Permission requirements

### Agent

- [ ] View own students
- [ ] Add student
- [ ] View application status
- [ ] Raise invoice
- [ ] View own invoices
- [ ] View own payoff

### Finance

- [ ] View invoices
- [ ] Review invoices
- [ ] Approve / reject
- [ ] Process payoff
- [ ] View financial reports

### Verification Team

- [ ] View assigned students
- [ ] Verify documents
- [ ] Verify university
- [ ] Verify admission
- [ ] Submit verification result

### Admin

- [ ] Manage agents
- [ ] Manage users
- [ ] Manage universities
- [ ] Manage commission rules
- [ ] View everything

### Deliverable

`Role & Permission Matrix`

---

# 6. P2 — Student & Application Lifecycle

**Status:** `NOT_STARTED`

## Proposed student flow

```text
Registered
    ↓
Application Submitted
    ↓
University Selected
    ↓
Application Under Review
    ↓
University Visit
    ↓
Offer Received
    ↓
Admission Confirmed
    ↓
Enrolled
    ↓
Eligible for Invoice
```

> These statuses are examples from the current planning document and must not be treated as final business rules until QStudy confirms them.

## Exception states to define

- [ ] Application Rejected
- [ ] Admission Cancelled
- [ ] Student Withdrawn
- [ ] Documents Missing
- [ ] Verification Failed

## Questions

- [ ] What are the exact student statuses?
- [ ] What are the exact application statuses?
- [ ] Which role can change each status?
- [ ] Which status makes the student invoice-eligible?
- [ ] Can statuses move backward?
- [ ] What happens after rejection?
- [ ] What happens after admission cancellation?

### Deliverable

`Student Lifecycle + Status Definition`

---

# 7. P3 — Invoice Lifecycle

**Status:** `NOT_STARTED`

## Proposed invoice flow

```text
Application Commission Eligible
      ↓
Agent Creates Claim / Invoice
      ↓
Invoice Draft
      ↓
Agent Submits Invoice
      ↓
Finance Review
      ↓
Verification Check
      ↓
Approved / Rejected
      ↓
Commission Snapshot Frozen
      ↓
Payoff Created (PENDING)
```

## Proposed invoice states

```text
DRAFT
SUBMITTED
UNDER_REVIEW
VERIFICATION_REQUIRED
ACTION_REQUIRED
APPROVED
REJECTED
CANCELLED
```

> Note: Settlement status (`PENDING`, `SETTLED`, `CANCELLED`) belongs exclusively to the Payoff entity, NOT the Invoice.

## Invoice rules to define

- [ ] Invoice eligibility condition
- [ ] Invoice numbering
- [ ] Invoice date
- [ ] Commission amount
- [ ] GST / tax requirements
- [ ] Supporting documents
- [ ] Student reference
- [ ] University reference
- [ ] Agent reference
- [ ] Payment terms
- [ ] Rejection reasons
- [ ] Resubmission rules
- [ ] Duplicate invoice prevention
- [ ] Modification rules after payment

### Deliverable

`Invoice Lifecycle + Business Rules`

---

# 8. P4 — Verification Workflow

**Status:** `NOT_STARTED`

## Verification flow

```text
Student Information
       ↓
Documents
       ↓
University
       ↓
Application
       ↓
University Visit
       ↓
Admission
       ↓
Enrollment
```

## Verification states

```text
PENDING
VERIFIED
REJECTED
NOT_REQUIRED
```

## Verification checklist

| Verification Item | Status |
|---|---|
| Student identity | `PENDING` |
| Passport | `PENDING` |
| Academic documents | `PENDING` |
| University | `PENDING` |
| University visit | `PENDING` |
| Admission | `PENDING` |
| Enrollment | `PENDING` |

> The actual checklist must be confirmed by QStudy. Items above are examples from the planning document.

## Rules to define

- [ ] What documents are required?
- [ ] Who performs each verification?
- [ ] Can different teams verify different items?
- [ ] What happens if one verification fails?
- [ ] Does one failure reject the entire invoice?
- [ ] Can the agent correct missing information?
- [ ] Can verification be repeated?
- [ ] What evidence must be stored?
- [ ] Who can override a verification result?

### Deliverable

`Verification Checklist + Rules`

---

# 9. P5 — Commission & Payoff

**Status:** `NOT_STARTED`

## Proposed calculation flow

```text
Invoice Claim (1+ Applications)
       ↓
Application-level Base Tuition (Contractual)
       ↓
Snapshotted Agent Commission Rate
       ↓
CommissionSnapshot (Gross Amount)
       ↓
Deductions / TDS / Taxes
       ↓
Final Payoff (Gross - Deductions)
       ↓
Offline Settlement (Marked by Finance)
```

## Rules to define

- [ ] Percentage-based or fixed commission
- [ ] University-specific commission
- [ ] Course-specific commission
- [ ] Student-type-specific commission
- [ ] Admission-status dependency
- [ ] Deductions (TDS / withholding tax)
- [ ] Taxes
- [ ] Final payoff approval
- [ ] Finance adjustment permissions
- [ ] Agent visibility of calculation
- [ ] Payoff reversal rules
- [ ] Payoff status (PENDING, SETTLED, CANCELLED)
- [ ] Settlement reference (Bank UTR / Wire Ref / Cheque No)
- [ ] Settlement date
- [ ] Settled by
- [ ] Settlement notes
- [ ] Batch reference (e.g., BATCH-2026-OCT-01)

### Deliverable

`Commission & Payoff Rules`

---

# 10. P6 — Database / ERD / Data Model

**Status:** `NOT_STARTED`

> Do not finalize the database before Phases 0–5 are verified.

## Proposed core entities

```text
User
Agent
Agency
Student
StudentDocument
University
Application
ApplicationStatus
UniversityVisit
Admission
Invoice
InvoiceItem
InvoiceDocument
Verification
VerificationChecklist
CommissionRule
CommissionSnapshot
Payoff
Notification
SupportTicket
AuditLog
```

## Proposed relationship

```text
Agent
  │
  ├── Students
  │      │
  │      └── Applications
  │              │
  │              ├── University
  │              ├── Visit
  │              └── Admission
  │
  └── Invoices
           │
           ├── Verification
           ├── CommissionSnapshots
           └── Payoff
```

## Tasks

- [ ] Confirm entities
- [ ] Confirm relationships
- [ ] Define primary keys
- [ ] Define foreign keys
- [ ] Define status enums
- [ ] Define audit fields
- [ ] Define soft-delete requirements
- [ ] Define document storage references
- [ ] Define uniqueness constraints
- [ ] Define indexes
- [ ] Define data retention requirements
- [ ] Create ERD
- [ ] Create data dictionary
- [ ] Review ERD against business workflow

### Deliverable

`Database ERD + Data Dictionary`

---

# 11. P7 — UI / UX / Sitemap

**Status:** `NOT_STARTED`

## Agent Portal

```text
Dashboard
│
├── Students
│   ├── Student List
│   ├── Add Student
│   └── Student Details
│
├── Applications
│
├── Invoices
│   ├── Invoice List
│   ├── Raise Invoice
│   └── Invoice Details
│
├── Payoffs
│
├── Notifications
│
├── Support
│
└── Profile
```

## Finance Portal

```text
Dashboard
│
├── Invoice Queue
├── Verification
├── Approved Invoices
├── Rejected Invoices
├── Payoff Queue
├── Settlement Tracking
├── Reports
└── Profile
```

## Admin

```text
Dashboard
│
├── Agents
├── Users
├── Students
├── Universities
├── Applications
├── Invoices
├── Commission Rules
├── Payoffs
├── Reports
├── Notifications
└── Settings
```

## UI tasks

- [ ] Confirm navigation
- [ ] Confirm module boundaries
- [ ] Confirm role-specific navigation
- [ ] Define list screens
- [ ] Define detail screens
- [ ] Define create/edit forms
- [ ] Define status displays
- [ ] Define approval/rejection actions
- [ ] Define validation messages
- [ ] Define empty/loading/error states
- [ ] Define responsive behavior

### Deliverable

`Portal Sitemap + Screen List`

---

# 12. P8 — API + RBAC Architecture

**Status:** `NOT_STARTED`

## Proposed API areas

```text
POST   /agents
GET    /agents
GET    /agents/:id

POST   /students
GET    /students
GET    /students/:id

POST   /applications
GET    /applications/:id

POST   /invoices
GET    /invoices
GET    /invoices/:id
POST   /invoices/:id/submit

POST   /verifications/:id/approve
POST   /verifications/:id/reject

POST   /payoffs/:id/process
GET    /payoffs
```

> These are architectural examples, not finalized API contracts.

## RBAC principle

Backend authorization must enforce ownership and role permissions.

```text
Agent
  → only own students / invoices / payoffs

Finance
  → financial workflow

Verification
  → verification workflow

Admin
  → full management
```

Frontend button hiding is not sufficient for security.

## Tasks

- [ ] Define API contracts
- [ ] Define request/response schemas
- [ ] Define authentication
- [ ] Define authorization middleware
- [ ] Define ownership checks
- [ ] Define validation
- [ ] Define error format
- [ ] Define audit logging
- [ ] Define API documentation

### Deliverable

`API Specification + RBAC Matrix`

---

# 13. P9 — MVP Development

**Status:** `NOT_STARTED`

## Critical path

```text
Login
  ↓
Agent
  ↓
Add Student
  ↓
Student Application
  ↓
University / Admission Information
  ↓
Raise Invoice
  ↓
Finance Review
  ↓
Verification
  ↓
Approve / Reject
  ↓
Payoff
  ↓
Offline Settlement
```

## MVP implementation order

### 9.1 Authentication & users
- [ ] Authentication
- [ ] User roles
- [ ] Role-based access
- [ ] Profile

### 9.2 Agent
- [ ] Agent management
- [ ] Agent profile
- [ ] Agent status
- [ ] Agent permissions

### 9.3 Student
- [ ] Student creation
- [ ] Student list
- [ ] Student details
- [ ] Agent-student relationship

### 9.4 Application
- [ ] Application creation
- [ ] University selection
- [ ] Application status
- [ ] Visit information
- [ ] Admission information

### 9.5 Invoice
- [ ] Eligibility check
- [ ] Invoice creation
- [ ] Invoice submission
- [ ] Finance review
- [ ] Approval/rejection
- [ ] Resubmission

### 9.6 Verification
- [ ] Verification checklist
- [ ] Document verification
- [ ] Student verification
- [ ] University/admission verification
- [ ] Verification result

### 9.7 Payoff
- [ ] Commission calculation (application-level)
- [ ] Payoff generation
- [ ] Finance approval
- [ ] Offline settlement recording
- [ ] Settlement status (PENDING, SETTLED, CANCELLED)

---

# 14. P10 — Testing & Business Verification

**Status:** `NOT_STARTED`

## Required scenarios

### Scenario 1 — Successful invoice & payoff settlement

```text
Agent
→ Student
→ Admission
→ Invoice
→ Verification
→ Approval
→ Payoff
→ Settled
```

- [ ] Tested
- [ ] Passed
- [ ] Evidence recorded

### Scenario 2 — Invoice rejected

```text
Invoice
→ Finance
→ Rejected
→ Reason
→ Agent
→ Correction
→ Resubmit
```

- [ ] Tested
- [ ] Passed
- [ ] Evidence recorded

### Scenario 3 — Missing document

```text
Invoice
→ Verification
→ Missing Document
→ Agent notified
→ Document uploaded
→ Re-verification
```

- [ ] Tested
- [ ] Passed
- [ ] Evidence recorded

### Scenario 4 — Student not eligible

```text
Student
→ Invoice attempt
→ Eligibility check
→ Invoice blocked
```

- [ ] Tested
- [ ] Passed
- [ ] Evidence recorded

### Scenario 5 — Duplicate invoice

```text
Agent
→ Same student
→ Invoice already exists
→ System prevents duplicate
```

- [ ] Tested
- [ ] Passed
- [ ] Evidence recorded

### Scenario 6 — Settled payoff

```text
Settled Payoff
→ Agent attempts modification
→ System prevents modification
```

- [ ] Tested
- [ ] Passed
- [ ] Evidence recorded

## Issue classification

```text
Business Rule Issue
UI Issue
Validation Issue
Permission Issue
Calculation Issue
Workflow Issue
Bug
```

---

# 15. P11 — QStudy UAT

**Status:** `NOT_STARTED`

## UAT flow

```text
Agent creates student
        ↓
Agent submits invoice
        ↓
Finance reviews invoice
        ↓
Operations verifies student
        ↓
Finance approves invoice
        ↓
Finance approves payoff
        ↓
Finance records offline settlement
        ↓
Agent checks settlement status
```

## UAT checklist

- [ ] Agent workflow confirmed
- [ ] Student workflow confirmed
- [ ] Application workflow confirmed
- [ ] Invoice workflow confirmed
- [ ] Verification workflow confirmed
- [ ] Payoff calculation confirmed
- [ ] Settlement workflow confirmed
- [ ] Permissions confirmed
- [ ] Reports confirmed
- [ ] Notifications confirmed

## UAT feedback categories

```text
Business Rule Issue
UI Issue
Validation Issue
Permission Issue
Calculation Issue
Workflow Issue
Bug
```

Every UAT issue must be logged before changing the architecture.

---

# 16. P12 — Production

**Status:** `NOT_STARTED`

## Deployment flow

```text
Production Database
       ↓
Backend Deployment
       ↓
Frontend Deployment
       ↓
Environment Configuration
       ↓
Admin Account
       ↓
Finance Accounts
       ↓
Agent Accounts
       ↓
Production Verification
       ↓
Go Live
```

## Production checklist

- [ ] Production database configured
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Environment variables configured
- [ ] Admin account created
- [ ] Finance accounts created
- [ ] Agent accounts configured
- [ ] Database backup configured
- [ ] Logging configured
- [ ] Monitoring configured
- [ ] Production smoke test completed
- [ ] Go-live approval received

## Production monitoring

- [ ] Failed invoices
- [ ] Failed payments
- [ ] API errors
- [ ] Authentication failures
- [ ] Document upload failures
- [ ] Incorrect commission calculations
- [ ] Workflow errors
- [ ] Audit logs

---

# 17. Current Business Modules

The client-facing module structure should remain compact and business-oriented. Internal functionality can be grouped inside these modules.

Recommended top-level modules:

1. Agent Management
2. Student / Application Management
3. University & Admission Tracking
4. Invoice Management
5. Invoice Verification / Finance Review
6. Student Verification
7. Payoff / Commission Management
8. Finance
9. Documents
10. Support / Queries
11. Notifications
12. Dashboard / Reports
13. User / Roles
14. Profile
15. Authentication / Security

> Module grouping can be refined after the business workflow is confirmed. Do not create unnecessary top-level modules just because a feature exists.

---

# 18. AI Implementation Rules

Any AI/Coding agent working on this project must follow these rules.

## Rule 1 — Read before changing

Before implementing anything:

1. Read this tracker.
2. Identify the current phase.
3. Check the phase status.
4. Check dependencies.
5. Check completed work.
6. Check open questions/blockers.
7. Inspect the existing codebase before creating new code.

## Rule 2 — Do not assume completion

Never mark work `DONE` because:

- code exists,
- a page renders,
- an API exists,
- a migration exists,
- a component was created.

`DONE` requires implementation + relevant testing/verification.

## Rule 3 — Do not invent business rules

If a business rule is marked as unconfirmed, ask for confirmation or keep the implementation configurable.

Do not silently assume:

- invoice eligibility
- commission percentage
- approval authority
- verification rules
- status transitions
- document requirements
- payment rules

## Rule 4 — Preserve existing work

Before modifying an existing feature:

- inspect the current implementation,
- understand dependencies,
- avoid unnecessary rewrites,
- avoid breaking existing workflows,
- make the smallest change that satisfies the requirement.

## Rule 5 — Backend security is authoritative

Permissions must be enforced on the backend.

Do not rely only on frontend UI visibility.

## Rule 6 — Test before marking DONE

Every completed implementation should have:

```text
Implementation
    ↓
Validation
    ↓
Test
    ↓
Evidence
    ↓
Status = DONE
```

## Rule 7 — Update this file after meaningful work

After completing a phase/task:

- update the status,
- mark completed checklist items,
- record what changed,
- record tests,
- record known limitations,
- record the next task.

---

# 19. AI Work Log

Use this section to keep a concise history of implementation.

## Entry Template

```text
### YYYY-MM-DD — [Task]

Phase:
Status:

Implemented:
- 

Files changed:
- 

Database changes:
- 

API changes:
- 

UI changes:
- 

Tests:
- 

Result:
- PASS / FAIL / PARTIAL

Known issues:
- 

Next step:
- 
```

---

# 20. Current Work Log

### 2026-09-26 — Initial AI Development Tracker

**Phase:** P0 — General Business Process Discovery  
**Status:** `IN_PROGRESS`

**Created:**
- Master project roadmap
- Business workflow
- Phase tracking
- Role/permission planning
- Student lifecycle planning
- Invoice lifecycle planning
- Verification workflow
- Commission/payoff workflow
- Database planning
- UI/navigation planning
- API/RBAC planning
- MVP flow
- Testing scenarios
- UAT checklist
- Production checklist
- AI implementation rules
- AI work log

**Source basis:**
The current workflow and phase structure are based on the existing QStudy Agent Portal implementation-flow document.

**Important:**
No application implementation has been marked as completed because the source material describes the planned workflow rather than verified code implementation.

**Next step:**
Complete and confirm P0 general business process discovery with QStudy. (Note: Financial business rules are independently frozen under FA-0).

---

### 2026-10-03 — Forensic Backend Flow Audit

Backend Flow Audit completed.

Status:
PASS WITH BLOCKERS

Code changes:
0

Migration changes:
0

Frontend changes:
0

Major findings:
- Student Registration, Event linkage, Document Verification Gate, and 4-Pillar Financial Gate are 100% operational in live backend code.
- Phase 8.1 hardening waves (8.1-A through 8.1-D-R1) are fully functional: Agent cannot manipulate commission rates or access competitor data; Admin sets 0-100% rate.
- Financial Architecture FA-2 entities (CommissionSnapshots, Payoffs) are NOT yet implemented in code or database.
- Settlement currently overloads Invoice.status = 'Paid' with string references concatenated in remarks; zero external payment gateways exist.
- User.role enum contains only 'admin' and 'agent'; Finance Review lacks 'CorrectionRequired' state.

Critical blockers:
- BLK-FIN-01: No Payoffs table or /api/payoffs endpoints (frontend currently uses Invoice.status = 'Paid').
- BLK-FIN-02: No CorrectionRequired state or resubmission flow in invoiceReviewService.
- BLK-FIN-03: No CommissionSnapshots table to lock application-level contractual vs commissionable tuition.

Frontend readiness:
READY WITH BLOCKERS (Frontend can safely build and test Student, Application, Verification, and Claim Review workflows; dedicated Payoff Settlement screen requires FA-2 backend migration first).

Next step:
Freeze FA-2 and execute lean backend migration for CommissionSnapshots and Payoffs before building the new settlement UI.

---

### 2026-10-03 — FA-2 Minimal Financial Backend Implementation

FA-2 Minimal Backend Implementation completed and verified.

Status:
PASS / FROZEN

Deliverables Completed:
1. **CommissionSnapshot Model & Logic:**
   - Table `CommissionSnapshots` created with PostgreSQL unique constraint `UNIQUE("applicationId", "invoiceId")`.
   - Application-level snapshot capturing `contractualTuition`, `commissionableTuition`, `commissionRate`, `grossAmount`, `lockedAt`, `lockedBy`.
   - Immutable historical record created atomically inside invoice approval transaction.
2. **Payoff Model, Service & Routes:**
   - Table `Payoffs` created with unique constraints `UNIQUE("invoiceId")` and `UNIQUE("payoffNumber")`.
   - Payoff 3-state machine: `PENDING` -> `SETTLED` / `CANCELLED` (Terminal states strictly protected).
   - Endpoints `/api/payoffs`, `/api/payoffs/:id`, `/api/payoffs/:id/settle`, `/api/payoffs/:id/cancel` implemented with strict role isolation (Admin-authoritative settlement, Agent read-only own visibility).
   - Structured offline settlement metadata (`settlementReference`, `settledAt`, `settledBy`, `settlementNotes`).
   - Zero external payment gateways or money rail integrations.
3. **Correction Required & Resubmission Flow:**
   - Added `'CorrectionRequired'` and `'Resubmitted'` to `financeReviewStatus`.
   - `PATCH /api/invoice-reviews/:id/correction`: Admin requests correction with mandatory remarks; transitions `UnderReview` -> `CorrectionRequired`.
   - `PATCH /api/invoice-reviews/:id/resubmit`: Authenticated invoice owner agent resubmits; transitions `CorrectionRequired` -> `Resubmitted`.
   - Rejected remains terminal; non-owners and invalid states rejected.
4. **Transaction Integrity & Backward Compatibility:**
   - Atomic transaction wraps Invoice Approval + CommissionSnapshots + Payoff creation.
   - Dual-write backwards compatibility syncs legacy `Invoice.status = 'Paid'` calls with the authoritative `Payoff` settlement record.

Test Results:
- FA-2 Dedicated Verification Suite: **44/44 PASSED (100%)**
- Frozen Phase 8.1 Regression Suite: **30/30 PASSED (100%)**
- Total Active Regression Tests: **74/74 GREEN**

Frontend Readiness:
READY FOR FRONTEND (Backend APIs, state machines, and data guarantees are fully in place).

Next step:
Present implementation report to user; await direction before starting frontend integration.

---

# 21. Immediate Next Task

## `NEXT_TASK`

**Phase:** P0 — General Business Process Discovery

**Task:**

Create/finalize:

`QSTUDY_AGENT_PORTAL_BUSINESS_FLOW.md`

It must contain the confirmed:

1. Actors & roles
2. Student lifecycle
3. Application lifecycle
4. Invoice lifecycle
5. Verification checklist
6. Commission rules
7. Payoff lifecycle
8. Required documents
9. Status definitions
10. Approval/rejection rules
11. Exception scenarios
12. Permission matrix
13. Final end-to-end workflow

### Do not start database/UI architecture as final until this phase is confirmed.

---

# 22. Definition of Done

The project is not considered complete merely because the UI exists.

The end-to-end system must support:

```text
Agent
  ↓
Student
  ↓
Application
  ↓
University / Admission
  ↓
Invoice
  ↓
Finance Review
  ↓
Verification
  ↓
Approval / Rejection
  ↓
Commission / Payoff
  ↓
Offline Settlement Recording
  ↓
Settlement Status
  ↓
Agent Visibility
```

And each stage must have:

- correct status
- correct permissions
- correct validation
- correct audit trail
- correct data relationship
- correct error handling
- relevant test coverage
- business verification

---

# 23. Change Control

If a new requirement conflicts with an existing frozen business rule:

1. Do not silently change the rule.
2. Record the requested change.
3. Identify affected phases.
4. Identify affected database/API/UI areas.
5. Identify migration/data impact.
6. Get business confirmation.
7. Update this tracker.
8. Then implement.

### Change Request Template

```text
## Change Request — YYYY-MM-DD

Requested change:

Reason:

Requested by:

Affected phase(s):

Affected business rules:

Affected database:

Affected APIs:

Affected UI:

Migration required:
YES / NO

Risk:

Decision:
PENDING / APPROVED / REJECTED

Implementation status:
NOT_STARTED / IN_PROGRESS / DONE
```

---

# 24. Final AI Instruction

When asked:

> "What should I implement next?"

Use this file to determine the answer.

Priority order:

```text
1. Resolve blockers
2. Complete current phase
3. Verify current phase
4. Update tracker
5. Move to next phase
6. Never skip unresolved business dependencies
```

When asked:

> "What is already implemented?"

Only report items marked `DONE` with implementation/testing evidence in this file.

When asked:

> "Implement the next phase"

First verify:

```text
Current phase = DONE
Dependencies = DONE
Business rules = confirmed
No blocking issue
```

Then implement only the next required scope.

When asked to modify an existing feature:

```text
Read tracker
   ↓
Inspect existing implementation
   ↓
Identify affected phase
   ↓
Identify dependencies
   ↓
Make minimal change
   ↓
Test
   ↓
Update tracker
```

---

# 25. Source / Reference

This tracker is derived from the existing QStudy Agent Portal implementation-flow planning document supplied for this project.

The original planning principle is:

```text
Understand
   ↓
Map
   ↓
Verify
   ↓
Freeze
   ↓
Design
   ↓
Implement
   ↓
Test
   ↓
Deploy
```

**Core principle:**

> Do not build the wrong business workflow faster.

The business workflow should be understood and verified first, then frozen before the database/API/UI architecture becomes difficult to change.

---

# 26. Phase 8.1 — Remediation & Hardening Waves Status

| Wave | Description | Priority | Tests | Migrations | Dependencies | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 8.1-A** | Agent Isolation & Security Hardening | P0 | 41/41 | 0 | 0 | **PASS / FROZEN** |
| **Phase 8.1-B** | Authority & Institutional 4-Pillar Gate | P0 | 39/39 | 0 | 0 | **PASS / FROZEN** |
| **Phase 8.1-C** | Granular Document Approval Gate | P1 | 52/52 | 0 | 0 | **PASS / FROZEN** |
| **Phase 8.1-D** | Tuition & Commission Authority Gate | P0 | 36/36 | 0 | 0 | **PASS / FROZEN** |
| **Phase 8.1-D-R1**| Admin-Controlled Commission Rate Remediation | P0 | 30/30 | 0 | 0 | **PASS / FROZEN** |

---

# 27. Financial Architecture (FA-0 to FA-3) Final Implementation Status

| Phase | Description | Scope | Tests / Verification | Status |
| :--- | :--- | :--- | :---: | :---: |
| **FA-0** | Business Rules & Commercial Policies | Commercial rules, 4-pillar trigger, settlement-only payment boundary | Architecture Review | **PASS / FROZEN** |
| **FA-1** | Financial Backend Flow Audit | Read-only audit across 27 criteria | Forensic Audit Report | **PASS / FROZEN** |
| **FA-2** | Minimal Financial Backend | CommissionSnapshot, Payoff, CorrectionRequired / Resubmit, Settlement API | 44/44 FA-2 + 30/30 Regression = 74/74 PASS | **PASS / FROZEN** |
| **FA-3** | Frontend Financial Flow | UI integration: Agent invoice resubmit, Admin correction, real Payoff ledger, offline settlement modal | 38/38 Flow PASS, Zero Build Errors | **PASS / FROZEN** |

### FA-3 Key Architectural Contracts Enforced:
1. **Payoff State Machine**: `PENDING` $\rightarrow$ `SETTLED` or `CANCELLED`. Authoritative source is `GET /api/payoffs` (scoped by role).
2. **Offline Settlement**: Settle action records manual offline transfers with UTR/reference, date, and notes. No payment gateway or payment processing execution.
3. **Correction & Resubmission**: Admin requests correction with mandatory remarks; Agent can only edit allowed non-financial fields (`remarks`) and resubmit via `PATCH /api/invoice-reviews/:invoiceId/resubmit`.
4. **Terminal State Immutability**: `SETTLED` and `CANCELLED` payoffs and `Rejected` invoices cannot be re-settled, cancelled, or resubmitted.
5. **Read-Only Commission Data**: Commission rates, tuitions, and gross commission amounts are strictly read-only for agents.

---

# 28. Financial UI / UX Polish Track (FA-4 Sequence)

| Sub-Phase | Title | Scope | Status | Deliverable |
| :--- | :--- | :--- | :---: | :--- |
| **FA-4.1** | **Financial UX Audit** | Forensic 6-pillar audit of Agent/Admin invoices, payoffs, modals, and tables | `PASS / COMPLETE` | `FA_4_1_FINANCIAL_UX_AUDIT_REPORT.md` |
| **FA-4.2** | **Status / Badge / Financial Visual System** | Centralized FinancialStatusBadge, FinancialStateHierarchy, standard color tokens, formatCurrency | `PASS / FROZEN` | `FA_4_2_FINANCIAL_VISUAL_SYSTEM_REPORT.md` |
| **FA-4.3** | **Agent Invoice UX Polish** | True lifecycle KPIs, action-required top banner with inline response, Approved snapshot card with Payoff state hierarchy | `PASS / FROZEN` | Enhanced `InvoicesPage.jsx`, `FA_4_3_AGENT_INVOICE_UX_REPORT.md` |
| **FA-4.4** | **Admin Review UX Polish** | Coupled rate calculation, quick correction prompt chips, vertical audit timeline, operational tabs | `PASS / FROZEN` | Enhanced `FinanceReviewModal.jsx`, `AdminInvoicesPage.jsx`, `FA_4_4_ADMIN_REVIEW_UX_REPORT.md` |
| **FA-4.5** | Payoff & Settlement UX Polish | Hero payout display, genuine UTR requirement, read-only voucher layout | `READY` | Enhanced `PayoffSettlementModal.jsx` & `AdminPayoffsPage.jsx` |
| **FA-4.6** | Responsive / Mobile Polish | Responsive card views, horizontal scroll indicators, sticky action columns | `QUEUED` | Mobile-optimized layout |
| **FA-4.7** | Motion / Micro-interactions | Clean button loading spinners, smooth accordion transitions, toast cues | `QUEUED` | Micro-interactions |
| **FA-4.8** | Final Financial UX Verification | Cross-browser validation, accessibility audit, final UI freeze | `QUEUED` | `FA_4_FINAL_UX_VERIFICATION_REPORT.md` |



