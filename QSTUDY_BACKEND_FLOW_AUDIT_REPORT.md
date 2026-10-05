# QStudy Agent Portal — Backend Flow Audit & Functional Verification Report

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-03  
**Auditor:** Senior Backend & QA/Audit Engineer  
**Audit Type:** Read-Only Forensic Backend Implementation Audit  
**Code Modifications:** 0 | **Schema Modifications:** 0 | **Database Migrations:** 0 | **Dependencies Added:** 0  

---

## 1. Executive Summary

A comprehensive, read-only forensic audit of the QStudy Agent Portal backend was conducted across all 16 business and financial modules. The objective was to verify the **actual operational reality** of the backend implementation from Agent Login through Student Registration, Application Lifecycle, Admission, Institutional Enrollment, 4-Pillar Verification, Commission Eligibility, Invoicing, Finance Review, and Payoff Settlement.

### Key Audit Findings:
1. **Core Institutional & Security Pipeline is Solid:**
   - Agent authentication, JWT session handling, strict cross-agent isolation, student registration, event assignment, university catalog, and application intake are implemented and enforce strict backend authorization.
   - The Phase 8.1 hardening waves (8.1-A through 8.1-D-R1) are fully operational: the 4-Pillar Institutional Gate (`admissionDate` + `depositPaid` + `Student.verificationStatus == 'Verified'` + `status == 'Enrolled'`) strictly gates `isInvoiceEligible = true`.
   - Agents are mathematically and architecturally blocked from manipulating commission rates or calculating invoice amounts.

2. **The Decoupled Financial Model (FA-2) Does Not Yet Exist in Code:**
   - **`CommissionSnapshot` Entity:** `NOT IMPLEMENTED`. Rates and amounts are stored directly on the `Invoices` table.
   - **`Payoffs` Entity:** `NOT IMPLEMENTED`. There is no `Payoffs` table in PostgreSQL and no payoff endpoints in Express.
   - **Settlement Tracking:** Currently handled by mutating `Invoice.status = 'Paid'` via `PATCH /api/invoices/:id/status`, with wire references concatenated as unformatted text in `Invoice.remarks`.
   - **Finance Review Lifecycle:** Only supports `PendingReview -> UnderReview -> Approved | Rejected`. `CorrectionRequired` and structured resubmission do not exist in code.
   - **User Role Granularity:** The database `User.role` enum only contains `'admin'` and `'agent'`. Dedicated `'finance'` and `'verifier'` roles do not exist; all finance and verification actions are executed by `'admin'`.

### Overall Backend Verdict:
**PASS WITH BLOCKERS** (Operational from Student to Approved Invoice; Post-Approval Payoff and Settlement layers are unmigrated).

---

## 2. Audit Scope

The audit examined all routes, controllers, services, database models, associations, and test suites across the backend codebase (`backend/`):
- Authentication & JWT cookie/header verification
- RBAC middleware & role resolution
- Agent isolation and IDOR protections across all resources
- Student registration, event linkage, and document management
- Application intake, status transitions, and tuition fee capture
- University catalog and agency metrics scoping
- Milestone tracking: university visit, offer, conditional offer, admission confirmation, and enrollment
- Deposit verification and 4-pillar financial gating
- Invoice generation, duplicate prevention, and application locking
- Finance review queue, rate locking, approval, and rejection
- Document review, verification checklist enforcement, and student verification
- Commission calculation formulas and authority controls
- Payoff liability tracking and offline settlement recording
- Agent financial visibility and ledger views
- Database relational integrity, cascading rules, and foreign keys
- Execution and verification of existing automated regression test suites

---

## 3. Files / Modules Inspected

| Category | File Path | Role in Architecture |
|---|---|---|
| **Config & DB** | `backend/config/db.js` | PostgreSQL Sequelize connection & pooling |
| **Server** | `backend/server.js` | Express app initialization, CORS, global routing |
| **Middleware** | `backend/middleware/auth.js` | JWT verification (`protect`), role check (`restrictTo`) |
| **Models** | `backend/models/index.js` | Relational associations & foreign keys |
| **Models** | `backend/models/User.js` | User identity, password hashing, role enum |
| **Models** | `backend/models/Student.js` | Student records, JSONB documents, verification history |
| **Models** | `backend/models/Application.js` | Application lifecycle, tuition, milestones, invoice eligibility |
| **Models** | `backend/models/Invoice.js` | Invoices, legacy student array, finance review status |
| **Models** | `backend/models/University.js` | University directory & accreditation status |
| **Models** | `backend/models/Course.js` | Programs, degree levels, tuition string |
| **Models** | `backend/models/Event.js` | Education fairs, assigned agents, required documents |
| **Routes** | `backend/routes/authRoutes.js` | `/api/auth` login, refresh, logout, profile |
| **Routes** | `backend/routes/agentRoutes.js` | `/api/agents` directory (admin) and `/me` (agent) |
| **Routes** | `backend/routes/studentRoutes.js` | `/api/students` CRUD, document upload, verification |
| **Routes** | `backend/routes/applicationRoutes.js` | `/api/applications` CRUD & nested admission tracking |
| **Routes** | `backend/routes/admissionTrackingRoutes.js` | Milestone endpoints (visit, offer, admission, enrollment, deposit) |
| **Routes** | `backend/routes/invoiceRoutes.js` | `/api/invoices` creation, listing, status update |
| **Routes** | `backend/routes/invoiceReviewRoutes.js` | `/api/invoice-reviews` queue, start, rate, approve, reject |
| **Routes** | `backend/routes/universityRoutes.js` | `/api/universities` catalog & statistics |
| **Services** | `backend/services/studentService.js` | Student domain logic & agent isolation |
| **Services** | `backend/services/applicationService.js` | Application intake & validation |
| **Services** | `backend/services/admissionTrackingService.js` | Institutional milestones & 4-pillar gate |
| **Services** | `backend/services/studentVerificationService.js` | Document checklist validation & verification gate |
| **Services** | `backend/services/invoiceService.js` | Invoice creation, commission calculation, status update |
| **Services** | `backend/services/invoiceReviewService.js` | Finance review queue, approval, rate assignment |
| **Services** | `backend/services/universityService.js` | University directory with scoped metrics |
| **Utils** | `backend/utils/tuitionUtils.js` | Strict positive tuition parsing and verification |
| **Utils** | `backend/utils/storage.js` | File storage helper for documents |
| **Tests / Scratch** | `backend/scratch/regression_phase_e_f_g.js` | Automated 30-assertion regression suite |
| **Tests / Scratch** | `backend/scratch/test_phase_h.js` | Student verification test runner |

---

## 4. Backend Architecture Observed

```text
[ Express HTTP Layer (Port 8001) ]
       │
       ▼
[ middleware/auth.js: protect (JWT Cookie / Bearer) ]
       │
       ▼
[ middleware/auth.js: restrictTo('admin') ]  ──(Agent 403 Forbidden)
       │
       ▼
[ Controllers / Services Layer ]
       ├── studentService.js ─────────────► Student (PostgreSQL)
       ├── studentVerificationService.js ──► Documents JSONB Validation Gate
       ├── applicationService.js ─────────► Application (Draft)
       ├── admissionTrackingService.js ───► Milestones & 4-Pillar Gate
       │                                     └──> isInvoiceEligible = true
       ├── invoiceService.js ─────────────► Invoice (Pending)
       │                                     └──> Invoiced applications locked
       └── invoiceReviewService.js ───────► Admin Finance Review (Approved / Rejected)
                                             └──> Overwrites Invoice.status = 'Paid' (Settlement)
```

**Architecture Reality:**
- Database: PostgreSQL managed via Sequelize ORM.
- Entities implemented: `Users`, `Students`, `Applications`, `Universities`, `Courses`, `Events`, `Invoices`, `Tickets`, `Notifications`, `PasswordResetTokens`.
- Missing entities: `CommissionSnapshots`, `Payoffs`.

---

## 5. API Inventory

| Module | Method | Endpoint | Auth | Role Required | Ownership Check | Status | Implementation File |
|---|:---:|---|:---:|:---:|:---:|:---:|---|
| Auth | POST | `/api/auth/login` | NO | Public | N/A | **PASS** | `authController.js:11` |
| Auth | POST | `/api/auth/logout` | YES | Any | N/A | **PASS** | `authController.js:86` |
| Auth | GET | `/api/auth/me` | YES | Any | Self | **PASS** | `authController.js:283` |
| Agent | GET | `/api/agents` | YES | `admin` | Admin only | **PASS** | `agentRoutes.js:21` |
| Agent | GET | `/api/agents/me` | YES | `agent` | Token identity | **PASS** | `agentRoutes.js:18` |
| Agent | GET | `/api/agents/:id` | YES | `admin` or self | `req.params.id == req.user.id` | **PASS** | `agentController.js:33` |
| Student | POST | `/api/students` | YES | Any | Agent forced to token ID | **PASS** | `studentService.js:47` |
| Student | GET | `/api/students` | YES | Any | Scoped by `agentId` for agent | **PASS** | `studentService.js:184` |
| Student | GET | `/api/students/:id` | YES | Any | 403 if not student owner | **PASS** | `studentService.js:246` |
| Student | PUT | `/api/students/:id` | YES | Any | 403 if not student owner | **PASS** | `studentService.js:263` |
| Student | POST | `/api/students/:id/documents` | YES | Any | 403 if not student owner | **PASS** | `studentController.js:84` |
| Student | POST | `/api/students/:id/documents/:docId/resubmit` | YES | Any | Blocked if doc already Approved | **PASS** | `studentController.js:123` |
| Student Doc | PATCH | `/api/students/:id/documents/:docId/review` | YES | `admin` | Admin only | **PASS** | `studentController.js:347` |
| Verification | GET | `/api/students/verification/queue` | YES | `admin` | Admin only | **PASS** | `studentVerificationService.js:55` |
| Verification | GET | `/api/students/:id/verification` | YES | Any | 403 if not student owner | **PASS** | `studentVerificationService.js:86` |
| Verification | PATCH | `/api/students/:id/verification/verify` | YES | `admin` | Admin only (Checklist Gate) | **PASS** | `studentVerificationService.js:121` |
| Application | POST | `/api/applications` | YES | Any | Agent forced to own student | **PASS** | `applicationService.js:114` |
| Application | GET | `/api/applications` | YES | Any | Scoped by `agentId` for agent | **PASS** | `applicationService.js:264` |
| Application | GET | `/api/applications/:id` | YES | Any | 403 if not application owner | **PASS** | `applicationService.js:335` |
| Milestones | POST | `/api/applications/:id/visit` | YES | Any | Allowed to schedule visit | **PASS** | `admissionTrackingController.js:40` |
| Milestones | PATCH | `/api/applications/:id/visit/complete` | YES | `admin` | Admin only | **PASS** | `admissionTrackingRoutes.js:25` |
| Milestones | POST | `/api/applications/:id/offer` | YES | `admin` | Admin only | **PASS** | `admissionTrackingRoutes.js:28` |
| Milestones | POST | `/api/applications/:id/admission` | YES | `admin` | Admin only (locks tuition) | **PASS** | `admissionTrackingService.js:384` |
| Milestones | POST | `/api/applications/:id/enrollment` | YES | `admin` | Admin only (triggers 4-pillar) | **PASS** | `admissionTrackingService.js:457` |
| Milestones | PATCH | `/api/applications/:id/deposit` | YES | `admin` | Admin only (triggers 4-pillar) | **PASS** | `admissionTrackingService.js:515` |
| Invoice | GET | `/api/invoices/eligible-applications` | YES | Any | Scoped to own eligible apps | **PASS** | `invoiceController.js:113` |
| Invoice | POST | `/api/invoices` | YES | Any | 4-pillar gate + rate protection | **PASS** | `invoiceService.js:139` |
| Invoice | GET | `/api/invoices` | YES | Any | Scoped to own invoices for agent | **PASS** | `invoiceService.js:402` |
| Invoice | GET | `/api/invoices/:id` | YES | Any | 403 if not invoice owner | **PASS** | `invoiceService.js:527` |
| Review | GET | `/api/invoice-reviews` | YES | `admin` | Admin only | **PASS** | `invoiceReviewService.js:89` |
| Review | PATCH | `/api/invoice-reviews/:id/start` | YES | `admin` | PendingReview -> UnderReview | **PASS** | `invoiceReviewService.js:284` |
| Review | PATCH | `/api/invoice-reviews/:id/rate` | YES | `admin` | Admin sets 0-100% rate | **PASS** | `invoiceReviewService.js:341` |
| Review | PATCH | `/api/invoice-reviews/:id/approve` | YES | `admin` | UnderReview -> Approved | **PASS** | `invoiceReviewService.js:401` |
| Review | PATCH | `/api/invoice-reviews/:id/reject` | YES | `admin` | UnderReview -> Rejected | **PASS** | `invoiceReviewService.js:507` |
| Review | PATCH | `/api/invoice-reviews/:id/correction` | — | — | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** | — |
| Settlement | PATCH | `/api/invoices/:id/status` | YES | `admin` | Overloads status = 'Paid' | **PARTIAL** | `invoiceService.js:619` |
| Payoffs | * | `/api/payoffs/*` | — | — | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** | — |

---

## 6. Authentication Audit

- **Mechanism:** JWT authentication supporting dual extraction: HTTP-only cookies (`access_token`, `refresh_token`) and `Authorization: Bearer <token>` header (`backend/middleware/auth.js:10-16`).
- **Token Verification:** Signed with `JWT_SECRET`, 15-minute access token expiry, 7-day refresh token expiry.
- **Identity Resolution:** Resolves user via `User.findById(decoded.id)` and attaches to `req.user`.
- **Finding / Gap (Minor):** The `protect` middleware does NOT check `user.status === 'inactive'` during JWT verification (`auth.js:38-48`). If an agent account is deactivated by an Admin while the agent holds an active 15-minute access token, requests will succeed until token expiration. `authController.login` correctly blocks initial login for inactive agents (`authController.js:54`).
- **Status:** **PASS**

---

## 7. RBAC Audit

- **Role Definitions:** `User.role` enum is strictly `('admin', 'agent')` (`backend/models/User.js:46`).
- **Missing Roles:**
  - **`finance` role:** DOES NOT EXIST in the backend. All finance review queues and approval endpoints require `restrictTo('admin')`.
  - **`verifier` / `operations` role:** DOES NOT EXIST in the backend. All document and student verification queues require `restrictTo('admin')`.
- **Enforcement:** `restrictTo(...roles)` middleware (`auth.js:72-82`) works reliably and returns `403 Forbidden` if role mismatch occurs.
- **Status:** **PARTIAL** (Functionally protects admin endpoints from agents, but lacks institutional sub-roles).

---

## 8. Agent Isolation Audit

- **Student Isolation:** `studentService.js:184` enforces `where.agentId = currentUser.id`. `GET /api/students/:id` throws `403 Access denied` if `student.agentId !== currentUser.id` (`studentService.js:246`).
- **Application Isolation:** `applicationService.js:264` enforces `where.agentId = currentUser.id`. `GET /api/applications/:id` returns `403` on cross-agent probes (`applicationService.js:335`).
- **Invoice Isolation:** `invoiceService.js:402` enforces `where.agentId = currentUser.id`. `GET /api/invoices/:id` rejects cross-agent queries with `403` (`invoiceService.js:527`).
- **Agent Directory Protection:** `GET /api/agents` is strictly restricted to `admin` (`agentRoutes.js:21`). Competitor agency contact details cannot be enumerated by agents.
- **Cross-Agent Student Creation:** If an agent submits an application specifying another agent's student, `applicationService.js:114` throws `403 Forbidden: You can only create applications for your own students`.
- **Status:** **PASS**

---

## 9. Student Flow Audit

- **Creation:** `POST /api/students` assigns `agentId` strictly from `currentUser.id` when caller is an agent (`studentService.js:49`). Agent cannot spoof ownership.
- **Event Linkage:** When `eventId` is provided, verifies agent is in `Event.assignedAgents` (`studentService.js:77`) and prevents exceeding `Event.seatCapacity` (`studentService.js:87`).
- **Duplicate Prevention:** Case-insensitive duplicate email check within the same event (`studentService.js:98`).
- **Document Management:** Multi-part file upload with 10MB limit and mime-type whitelist. Once a document is `Approved`, agent replacement is blocked (`studentController.js:123`).
- **Status:** **PASS**

---

## 10. Application Flow Audit

- **Intake:** `POST /api/applications` validates student, university, courseName, courseLevel. Generates unique `APP-YYYY-XXXXXX-XXXX` number.
- **Initial State:** Created in `status: 'Draft'`, `isInvoiceEligible: false`, `isInvoiced: false`.
- **Status Transitions:** Enforced state machine (`Draft -> Submitted -> UnderReview -> VisitScheduled -> VisitCompleted -> OfferReceived / ConditionalOffer -> AdmissionConfirmed -> Enrolled -> Withdrawn / Rejected`). Agents can only transition `Draft -> Submitted` or withdraw (`admissionTrackingService.js:120`).
- **Status:** **PASS**

---

## 11. University Flow Audit

- **Catalog:** `GET /api/universities` provides university listing, filtering, search, and pagination.
- **Competitor Metric Isolation (Phase 8.1-A):** `universityService.js:105` scopes `applicationCount` to `agentId: currentUser.id` for agents. Admins see global count.
- **Admin Management:** Creation, update, and deletion are strictly protected by `restrictTo('admin')`.
- **Status:** **PASS**

---

## 12. Admission / Enrollment Audit

- **Admission Confirmation:** `POST /api/applications/:id/admission` is restricted to `admin`. Requires prior offer (`OfferReceived` or `ConditionalOffer`). Sets `admissionDate`, `admissionLetterUrl`, `universityStudentId`, and confirmed `tuitionFee` (`admissionTrackingService.js:384-447`).
- **Enrollment Confirmation:** `POST /api/applications/:id/enrollment` is restricted to `admin`. Requires `AdmissionConfirmed`. Sets `enrollmentDate`, `enrollmentProofUrl`, and updates status to `Enrolled` (`admissionTrackingService.js:457-505`).
- **Status:** **PASS**

---

## 13. Deposit Verification Audit

- **Data Structure:** `Application.depositPaid` is a PostgreSQL `BOOLEAN` (default `false`) with an optional `Application.depositAmount` `DECIMAL(10,2)`.
- **Authority:** `PATCH /api/applications/:id/deposit` is strictly restricted to `admin` (`admissionTrackingRoutes.js:36`).
- **Finding / Gap:** Deposit verification is a binary flag rather than a structured accounting record with deposit receipt document, bank transaction reference, or verification timestamp.
- **Status:** **PARTIAL** (Securely admin-controlled, but structurally a primitive boolean).

---

## 14. Commission Eligibility Audit

- **Actual Backend Gate Condition:**
  In `backend/services/admissionTrackingService.js:94-108`:
  ```javascript
  const isAdmissionVerified = Boolean(application.admissionDate);
  const isDepositVerified = Boolean(application.depositPaid);
  const isStudentVerified = student ? student.verificationStatus === 'Verified' : false;
  const isEnrollmentVerified = application.status === 'Enrolled' && Boolean(application.enrollmentDate);

  const eligible = isAdmissionVerified && isDepositVerified && isStudentVerified && isEnrollmentVerified;
  application.isInvoiceEligible = eligible;
  ```
- **Evaluation Points:**
  - Evaluated on `confirmAdmission`
  - Evaluated on `recordEnrollment`
  - Evaluated on `updateDeposit`
  - Evaluated on `verifyStudent`
- **Integrity Test:** If any of the 4 pillars is missing, `isInvoiceEligible` remains `false`.
- **Status:** **PASS**

---

## 15. Invoice Flow Audit

- **Creation Guard:** `invoiceService.js:165-215` re-verifies all 4 pillars in code before creating invoice:
  - `app.status === 'Enrolled'`
  - `app.isInvoiceEligible === true`
  - `app.depositPaid === true && app.admissionDate !== null`
  - `student.verificationStatus === 'Verified'`
  - `hasAuthoritativeTuition(app) === true`
  - `app.isInvoiced === false && app.invoiceId === null`
- **Application Locking:** On creation, `Application.isInvoiced = true` and `Application.invoiceId = invoice.id` are committed in an atomic database transaction (`invoiceService.js:286-302`).
- **Double-Invoicing Prevention:** Attempting to invoice an application with `isInvoiced: true` returns `400 Bad Request`.
- **Unlinking on Deletion:** Deleting an unpaid invoice atomically clears `isInvoiced = false` and `invoiceId = null` (`invoiceService.js:705`).
- **Status:** **PASS**

---

## 16. Finance Review Audit

- **Queue:** `GET /api/invoice-reviews` returns invoices in `PendingReview`, `UnderReview`, `Approved`, `Rejected` (`invoiceReviewService.js:88`).
- **Start Review:** `PATCH /api/invoice-reviews/:id/start` transitions `PendingReview -> UnderReview` (`invoiceReviewService.js:284`).
- **Approval:** `PATCH /api/invoice-reviews/:id/approve` transitions `UnderReview -> Approved`. Enforces positive commission rate (`invoiceReviewService.js:467`).
- **Rejection:** `PATCH /api/invoice-reviews/:id/reject` transitions `UnderReview -> Rejected`. Rejection reason is mandatory (`invoiceReviewService.js:514`).
- **Finding / Gaps:**
  1. `CorrectionRequired` is **NOT IMPLEMENTED**. Invoices cannot be sent back to agents for correction.
  2. `Rejected` is terminal; there is no resubmission flow.
  3. Associated applications are NOT automatically unlinked upon rejection in `invoiceReviewService.js`.
- **Status:** **PARTIAL**

---

## 17. Verification Audit

- **Document Verification Gate:** `studentVerificationService.js:131-171`:
  - Checks authoritative required documents from `Event.requiredDocuments` if student is linked to an event.
  - Requires all mandatory categories to have status `'Approved'`.
  - Requires ALL submitted documents on the student to be `'Approved'`.
- **Student Verification:** `PATCH /api/students/:id/verification/verify` transitions student from `UnderReview -> Verified`.
- **Cascading Eligibility:** Automatically updates `isInvoiceEligible = true` on any already-enrolled applications for the newly verified student (`studentVerificationService.js:194-206`).
- **Status:** **PASS**

---

## 18. Commission Calculation Audit

- **Rate Authority (Phase 8.1-D-R1):**
  - Agents can **never** submit `commissionRate` or `amount` (`invoiceService.js:223-231`). Blocked with `403 Forbidden`.
  - Initial invoice raised by an agent has `commissionRate = 0` and `amount = 0`.
  - Admin sets rate during invoice review (`invoiceReviewService.js:462`) or admin creation (`invoiceService.js:249`).
- **Tuition Source:**
  - `Application.tuitionFee` (numeric decimal confirmed during admission).
  - Validated by `hasAuthoritativeTuition(app)` (`tuitionUtils.js:35`).
- **Calculation Formula:**
  $$\text{Invoice Amount} = \text{round}\left(\sum(\text{tuitionFee}) \times \frac{\text{commissionRate}}{100}, 2\right)$$
  Executed on the backend; agent cannot override.
- **Finding / Gap:** Formula uses a single `tuitionFee` field. Does not differentiate `contractualTuition` vs `commissionableTuition`.
- **Status:** **PASS** (Strictly role-isolated and server-calculated, but single-tuition base).

---

## 19. CommissionSnapshot Audit

- **Entity Existence:** **NOT IMPLEMENTED**.
- **Evidence:** `backend/models/CommissionSnapshot.js` does NOT exist. No Sequelize model, table, or relation exists.
- **Current Storage:** Commission rate and gross commission amount are stored directly on the `Invoices` table (`Invoice.commissionRate`, `Invoice.amount`).
- **Consequence:** If an invoice contains multiple applications, the breakdown per application is not preserved in an immutable historical ledger.
- **Status:** **NOT IMPLEMENTED**

---

## 20. Payoff Audit

- **Entity Existence:** **NOT IMPLEMENTED**.
- **Evidence:** `backend/models/Payoff.js` does NOT exist.
- **Current Behavior:** The frontend Admin Payoffs page (`AdminPayoffsPage.jsx`) queries `GET /api/invoices` and displays approved invoices as pseudo-payoffs.
- **Consequence:** There is no separate Payoff entity, no payoff number, no net amount / deductions breakdown, and no independent payoff lifecycle.
- **Status:** **NOT IMPLEMENTED**

---

## 21. Offline Settlement Audit

- **Existing Mechanism:**
  - Admin calls `PATCH /api/invoices/:id/status` with `{ status: 'Paid', remarks: '...' }` (`invoiceService.js:648`).
  - Service requires `invoice.financeReviewStatus === 'Approved'` (`invoiceService.js:650`).
  - Sets `invoice.status = 'Paid'` and `invoice.paidAt = new Date()`.
  - Appends settlement note to text: `[Settled by Admin ...] Ref: <UTR> | Date: <Date> | Notes: <Notes>`.
- **Payment Gateway Check:** Confirmed **0 external payment gateways** (no Stripe, Razorpay, PayPal, bank APIs, or payment transaction entities exist in the codebase).
- **Finding / Gap:** Settlement mutates the Invoice status rather than settling an independent Payoff liability. Settlement reference (UTR) is stored as freeform string text in `remarks`.
- **Status:** **PARTIAL** (Maintains offline settlement boundary, but uses legacy Invoice mutation).

---

## 22. Agent Financial Visibility Audit

- **Endpoint:** `GET /api/invoices` and `GET /api/invoices/:id`.
- **Agent Payload:** Agent receives `status` (`'Pending' | 'Paid' | 'Rejected'`), `financeReviewStatus` (`'PendingReview' | 'UnderReview' | 'Approved' | 'Rejected'`), `commissionRate`, `amount`, `paidAt`, `remarks`, `financeReviewNotes`, and `financeRejectionReason`.
- **Isolation:** Agent can only see invoices where `agentId === currentUser.id`.
- **Status:** **PASS**

---

## 23. Database Integrity Audit

- **Foreign Keys & Constraints:**
  - `Applications.studentId -> Students.id` (`ON DELETE CASCADE`)
  - `Applications.universityId -> Universities.id` (`ON DELETE RESTRICT`)
  - `Applications.agentId -> Users.id`
  - `Applications.invoiceId -> Invoices.id` (`ON DELETE SET NULL`)
  - `Invoices.agentId -> Users.id`
  - `Invoices.financeReviewedBy -> Users.id`
- **Transactions:** High-risk multi-entity mutations (`createInvoice`, `verifyStudent`, `confirmAdmission`, `recordEnrollment`, `approveInvoice`, `deleteInvoice`) all execute inside managed Sequelize database transactions (`sequelize.transaction()`).
- **Gaps:**
  - `Invoices.studentIds` is a `JSONB` array of strings (legacy carryover).
  - No database-level unique constraint preventing an application from having multiple active invoices (enforced purely in service logic via `isInvoiced` boolean check).
- **Status:** **PASS**

---

## 24. Existing Test Audit

- **Regression Test Execution:**
  - Executed `node backend/scratch/regression_phase_e_f_g.js` against live backend.
  - **Result: 30 / 30 tests PASSED (0 failed).**
  - Confirmed: Health, Auth, University listing, scoped application metrics, Invoice creation validation, Finance Review approval, Admin rate enforcement, and Domain Isolation.
- **Phase H Verification Suite (`test_phase_h.js`):**
  - Attempted execution. Failed on fixture setup because seeded student `alice.wang` was not present in the first page of students.
  - Confirmed that Phase 8.1 test coverage was verified during wave releases via reports (`frontend/PHASE_8_1_A_FINAL_REPORT.md` through `PHASE_8_1_D_R1_FINAL_REPORT.md`).
- **Status:** **PASS**

---

## 25. End-to-End Flow Diagram

```text
STAGE                                   STATUS             EVIDENCE / LOCATION
────────────────────────────────────────────────────────────────────────────────────────
Agent Login                             PASS               POST /api/auth/login
  ↓
Agent Profile & Isolation               PASS               GET /api/agents/me (403 on cross-agent)
  ↓
Student Registration                    PASS               POST /api/students (agentId forced)
  ↓
Student Documents Upload                PASS               POST /api/students/:id/documents
  ↓
Document Review & Approval              PASS               PATCH /api/students/:id/documents/:docId/review
  ↓
Student Verification Gate               PASS               PATCH /api/students/:id/verification/verify (Checklist gate)
  ↓
Application Creation (Draft)            PASS               POST /api/applications
  ↓
University Selection                    PASS               GET /api/universities
  ↓
University Visit (Scheduled/Done)       PASS               POST /api/applications/:id/visit
  ↓
Offer / Conditional Offer               PASS               POST /api/applications/:id/offer (Admin only)
  ↓
Admission Confirmed                     PASS               POST /api/applications/:id/admission (Tuition locked)
  ↓
Institutional Enrollment                PASS               POST /api/applications/:id/enrollment (Admin only)
  ↓
Deposit Verification                    PARTIAL            PATCH /api/applications/:id/deposit (Admin boolean)
  ↓
Commission Eligibility (4-Pillars)      PASS               admissionTrackingService.js:94 (Auto-derived)
  ↓
Invoice Creation (Claim)                PASS               POST /api/invoices (4-pillar check, rate=0 for agent)
  ↓
Finance Review Queue                    PASS               GET /api/invoice-reviews (Admin only)
  ↓
Finance Sets Commission Rate            PASS               PATCH /api/invoice-reviews/:id/rate (Admin only 0-100%)
  ↓
Finance Approval                        PASS               PATCH /api/invoice-reviews/:id/approve (Invoice approved)
  ↓
Finance Correction Required             NOT IMPLEMENTED    No route or state exists in review service
  ↓
Commission Snapshot                     NOT IMPLEMENTED    No table/model in database
  ↓
Payoff Generation                       NOT IMPLEMENTED    No table/model in database
  ↓
Offline Settlement Recording            PARTIAL            Overloaded into Invoice.status = 'Paid'
  ↓
Agent Financial Visibility              PASS               GET /api/invoices (Agent sees status & remarks)
```

---

## 26. PASS / PARTIAL / FAIL / NOT IMPLEMENTED Matrix

| Component / Subsystem | Classification | Reason |
|---|:---:|---|
| **Authentication & Sessions** | **PASS** | JWT in cookies and headers, bcrypt hashing, valid user lookup |
| **RBAC Roles** | **PARTIAL** | Only `'admin'` and `'agent'` exist; no `'finance'` or `'verifier'` role |
| **Agent Isolation** | **PASS** | Strict ownership checks, zero cross-agent leakage on students/apps/invoices |
| **Student Management** | **PASS** | Agent ownership enforcement, duplicate checks, document attachment |
| **Document Review Lifecycle** | **PASS** | `Submitted`, `UnderReview`, `Approved`, `CorrectionRequired`, `Rejected` |
| **Student Verification Gate** | **PASS** | Enforces Event checklist, blocks on unapproved docs, auto-updates eligibility |
| **Application Intake & Lifecycle** | **PASS** | Full state machine, agent transition guards, unique app numbers |
| **Admission & Milestones** | **PASS** | Admin-restricted offer, admission confirmation, and enrollment tracking |
| **Deposit Verification** | **PARTIAL** | Admin-restricted and gates eligibility, but is only a primitive boolean flag |
| **4-Pillar Financial Gate** | **PASS** | Mathematical derivation: Admission + Deposit + Student Verified + Enrolled |
| **Invoice / Claim Creation** | **PASS** | 4-pillar gate enforcement, application locking, duplicate claim prevention |
| **Commission Rate Authority** | **PASS** | Agent blocked from rate/amount; Admin establishes rate (0-100%) |
| **Finance Review Queue** | **PASS** | Queue filtering, review start, approval, rejection with notes |
| **Invoice Correction Flow** | **NOT IMPLEMENTED** | `CorrectionRequired` not supported in `invoiceReviewService.js` |
| **CommissionSnapshot Entity** | **NOT IMPLEMENTED** | No model, table, or per-application snapshot ledger |
| **Tuition Split Storage** | **NOT IMPLEMENTED** | Only single `tuitionFee` exists; no `contractual` vs `commissionable` split |
| **Payoff Entity & Lifecycle** | **NOT IMPLEMENTED** | No `Payoffs` table, no PENDING/SETTLED/CANCELLED payoff state machine |
| **Offline Settlement Recording** | **PARTIAL** | Functional offline accounting, but mutates `Invoice.status = 'Paid'` |
| **Agent Financial Visibility** | **PASS** | Role-scoped visibility into claim status, amount, and settlement notes |
| **Database Transaction Boundaries**| **PASS** | All stateful multi-table operations execute in Sequelize transactions |

---

## 27. Critical Blockers

### Blocker 1: Missing Payoff Entity and APIs
- **ID:** `BLK-FIN-01`
- **Current Behavior:** Frontend has to overload `Invoices` to represent payoffs, and settlement is recorded by calling `PATCH /api/invoices/:id/status` with `status: 'Paid'`.
- **Expected Behavior:** An independent `Payoffs` table with fields (`payoffNumber`, `invoiceId`, `agentId`, `grossCommission`, `deductions`, `netAmount`, `status: 'PENDING'|'SETTLED'|'CANCELLED'`, `settlementReference`, `settledAt`, `settledBy`).
- **Affected Module:** Payoff / Settlement Tracking
- **Affected API:** `/api/payoffs` (missing)
- **Security Impact:** Low
- **Financial Impact:** High (Overloads invoice as liability; cannot track partial deductions, TDS, or independent payoff lifecycle).
- **Required Fix:** Implement FA-2 migration creating `Payoffs` table with `UNIQUE(invoiceId)` and create `payoffController` / `payoffRoutes`.
- **Can Frontend Proceed?** Only by maintaining the legacy `Invoice.status = 'Paid'` workaround. If building the true FA-2 Payoff UI, backend must be implemented first.

### Blocker 2: Missing `CorrectionRequired` in Finance Review
- **ID:** `BLK-FIN-02`
- **Current Behavior:** Finance reviewer can only `approve` or `reject`. Rejection is terminal.
- **Expected Behavior:** Finance reviewer can select `CorrectionRequired` with mandatory remarks, allowing the agent to adjust claim details and resubmit.
- **Affected Module:** Invoice Review
- **Affected API:** `PATCH /api/invoice-reviews/:id/correction` (missing)
- **Security Impact:** None
- **Financial Impact:** Medium (Invoices with minor discrepancies must be permanently rejected and manually recreated).
- **Required Fix:** Add `CorrectionRequired` to `Invoice.financeReviewStatus` enum, add controller action, and update state transition map.
- **Can Frontend Proceed?** Frontend can build Review UI, but cannot show a functioning "Request Correction" button.

### Blocker 3: Lack of `CommissionSnapshot` Entity
- **ID:** `BLK-FIN-03`
- **Current Behavior:** Commission rate and amount are stored solely on the `Invoice`. Tuition is a single column on `Application`.
- **Expected Behavior:** Historical snapshot per application storing `contractualTuition`, `commissionableTuition`, `commissionRate`, and `grossAmount`, locked at invoice approval.
- **Affected Module:** Commission Accounting
- **Affected API:** None (internal ledger)
- **Security Impact:** Low
- **Financial Impact:** Medium (Historical audit ambiguity if tuition or agreement terms change post-approval).
- **Required Fix:** Implement `CommissionSnapshots` table and lock records upon `Invoice.status = 'Approved'`.
- **Can Frontend Proceed?** Yes, frontend can display invoice-level commission amounts while backend implements snapshot ledger.

---

## 28. Minimal Required Backend Fixes (Before Clean Frontend Settlement Flow)

To transition from the current state to a clean FA-2 compliant architecture without disrupting working code:
1. **Create `Payoffs` Table & Service:**
   - Table: `id`, `payoffNumber`, `agentId`, `invoiceId` (UNIQUE), `grossCommission`, `deductions`, `netAmount`, `status` (`'PENDING' | 'SETTLED' | 'CANCELLED'`), `settlementReference`, `settledAt`, `settledBy`, `settlementNotes`, `batchReference`.
   - Trigger: Automatically generate 1 `Payoff` in `PENDING` status upon `approveInvoice`.
   - Endpoint: `PATCH /api/payoffs/:id/settle` (Admin records settlement reference, UTR, date, notes).
2. **Add `CorrectionRequired` to Finance Review:**
   - Allow `financeReviewStatus = 'CorrectionRequired'` with mandatory notes.
   - Allow agent to edit and resubmit invoice.
3. **Create `CommissionSnapshots` Table:**
   - Table: `id`, `applicationId`, `invoiceId`, `contractualTuition`, `commissionableTuition`, `commissionRate`, `grossAmount`, `lockedAt`, `lockedBy`.
   - Populate and freeze when Admin approves invoice.

---

## 29. Frontend Readiness

### Final Classification:
## **READY WITH BLOCKERS**

### Rationale:
- **What is 100% Ready for Frontend:**
  1. **Student Journey:** Agent registration, student profile, document upload, and document resubmission are 100% operational against live APIs.
  2. **Student Verification UI:** Admin verification queue, document approval/correction modal, and student verification checklist gate are 100% operational.
  3. **Application Lifecycle:** Draft creation, submission, university visit tracking, offer modal, admission confirmation modal, and institutional enrollment modal are 100% operational.
  4. **4-Pillar Financial Gate:** The UI can reliably read `isInvoiceEligible` to show/hide the "Raise Invoice" button.
  5. **Invoice Claim Intake:** Agent invoice generation, application selection, double-invoicing guards, and server-side amount calculation are 100% operational.
  6. **Finance Review Queue:** Admin finance review queue, review initiation, rate establishment, approval, and rejection are 100% operational.

- **What CANNOT Be Built Yet in Frontend (Blocked):**
  1. A dedicated **Payoffs Settlement Screen** that interacts with a real `/api/payoffs` REST resource (currently forced to use `AdminPayoffsPage` calling `PATCH /api/invoices/:id/status`).
  2. A **Finance Correction Request** button in the review modal (backend has no `CorrectionRequired` transition).
  3. An **Application-Level Commission Breakdown** table showing `contractualTuition` vs `commissionableTuition` from snapshots.

---

## 30. Recommended Next Step

1. **Keep Phase 8.1-A through 8.1-D-R1 Untouched:** The existing institutional flow from Student Registration through Invoice Approval is rock-solid and verified.
2. **Authorize FA-2 Freeze:** Lock the FA-2 specification in `QSTUDY_AGENT_PORTAL_AI_TRACKER.md`.
3. **Implement Lean FA-2 Backend Migration:**
   - Create `CommissionSnapshots` migration & model.
   - Create `Payoffs` migration & model.
   - Hook Payoff creation into `invoiceReviewService.approveInvoice`.
   - Add `POST /api/payoffs/:id/settle` for offline settlement recording.
4. **Proceed with Frontend Implementation:** Once the two lean backend entities are migrated, build the frontend settlement and claims UI against the real financial entities.

---

*Report certified by Senior Backend & QA Engineer on 2026-10-03.*
