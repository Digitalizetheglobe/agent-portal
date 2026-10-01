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
Finance Processes Payment
  ↓
Agent Receives Payoff
```

The portal should support the critical business flow first and expand only after the business rules are confirmed.

---

# 2. Current Project Status

## Overall Status

**Current Phase:** Phase 8.1 — Business Flow & Data Integrity Correction  
**Overall Status:** `IN PROGRESS`  
**Classification:** `Technical Implementation: PASS` | `Business Authorization & Flow: IN CORRECTION`

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
- **Phase 8.1-D:** Tuition, Commission & Payoff Integrity (P1) — `PASS / FROZEN` (36/36 Integrity Tests Passed, Zero Build Errors)

---

---

# 4. Current Priority

## Phase 0 — Business Process Discovery

**Status:** `IN_PROGRESS`

### Objective

Understand and freeze the real QStudy process before building database/UI architecture.

### Business questions to resolve

- [ ] Who creates the agent?
- [ ] Can an agent self-register?
- [ ] Who approves an agent?
- [ ] What information is required for an agent?
- [ ] How is a student linked to an agent?
- [ ] Can one student have multiple agents?
- [ ] When is an agent eligible to raise an invoice?
- [ ] What exactly does the invoice represent?
- [ ] Is the invoice based on admission, enrollment, university visit, or another milestone?
- [ ] Who verifies the student?
- [ ] Who verifies university admission?
- [ ] What documents are required?
- [ ] Who approves the invoice?
- [ ] How is commission calculated?
- [ ] Is commission fixed or university/course dependent?
- [ ] Who approves the payoff?
- [ ] How is payment made?
- [ ] What happens when an invoice is rejected?
- [ ] Can an invoice be resubmitted?
- [ ] Can an already-paid invoice be modified?
- [ ] What happens if admission is cancelled?

### Deliverable

`QStudy Business Workflow Document`

### Completion condition

Phase 0 can become `DONE` only after the business workflow is reviewed and confirmed by QStudy.

---

# 5. Phase 1 — Actors, Roles & Permissions

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

# 6. Phase 2 — Student & Application Lifecycle

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

# 7. Phase 3 — Invoice Lifecycle

**Status:** `NOT_STARTED`

## Proposed invoice flow

```text
Student Eligible
      ↓
Agent Creates Invoice
      ↓
Invoice Draft
      ↓
Agent Submits Invoice
      ↓
Finance Review
      ↓
Verification
      ↓
Approved / Rejected
      ↓
Payoff Processing
      ↓
Paid
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
PAYMENT_PROCESSING
PAID
CANCELLED
```

> These states are proposed and require business confirmation.

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

# 8. Phase 4 — Verification Workflow

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

# 9. Phase 5 — Commission & Payoff

**Status:** `NOT_STARTED`

## Proposed calculation flow

```text
Invoice Amount
      ↓
Commission Rule
      ↓
Eligible Amount
      ↓
Deductions / Taxes
      ↓
Final Payoff
```

## Rules to define

- [ ] Percentage-based or fixed commission
- [ ] University-specific commission
- [ ] Course-specific commission
- [ ] Student-type-specific commission
- [ ] Admission-status dependency
- [ ] Deductions
- [ ] Taxes
- [ ] Final payoff approval
- [ ] Finance adjustment permissions
- [ ] Agent visibility of calculation
- [ ] Payoff reversal rules
- [ ] Payment status
- [ ] Payment reference

### Deliverable

`Commission & Payoff Rules`

---

# 10. Phase 6 — Database / ERD / Data Model

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
Payoff
Payment
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

# 11. Phase 7 — UI / UX / Sitemap

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
├── Payments
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

# 12. Phase 8 — API + RBAC Architecture

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

# 13. Phase 9 — MVP Development

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
Payment
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
- [ ] Commission calculation
- [ ] Payoff generation
- [ ] Finance approval
- [ ] Payment processing
- [ ] Payment status

---

# 14. Phase 10 — Testing & Business Verification

**Status:** `NOT_STARTED`

## Required scenarios

### Scenario 1 — Successful invoice

```text
Agent
→ Student
→ Admission
→ Invoice
→ Verification
→ Approval
→ Payoff
→ Paid
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

### Scenario 6 — Already-paid invoice

```text
Paid Invoice
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

# 15. Phase 11 — QStudy UAT

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
Finance processes payoff
        ↓
Agent checks payment
```

## UAT checklist

- [ ] Agent workflow confirmed
- [ ] Student workflow confirmed
- [ ] Application workflow confirmed
- [ ] Invoice workflow confirmed
- [ ] Verification workflow confirmed
- [ ] Payoff calculation confirmed
- [ ] Payment workflow confirmed
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

# 16. Phase 12 — Production

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

**Phase:** Phase 0  
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
Complete and confirm Phase 0 business rules with QStudy.

---

# 21. Immediate Next Task

## `NEXT_TASK`

**Phase:** 0 — Business Process Discovery

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
Payment
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
| **Phase 8.1-C** | Granular Document Approval Gate | P1 | 35/35 | 0 | 0 | **PASS / FROZEN** |
| **Phase 8.1-D** | Tuition & Commission Authority Gate | P0 | 36/36 | 0 | 0 | **PASS / FROZEN** |
| **Phase 8.1-D-R1**| Admin-Controlled Commission Rate Remediation | P0 | 30/30 | 0 | 0 | **PASS / FROZEN** |

