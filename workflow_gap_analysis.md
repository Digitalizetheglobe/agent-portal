# QStudy Agent Portal — Client Flow Gap Analysis

Compared against [qstudy_client_workflow.md](qstudy_client_workflow.md) (new flow: 5 roles, visa-progress pipeline, contract and E-Certificate, USD/RM payment). Based on a code review of `backend/`, including the uncommitted onboarding work. The frontend build passes. The agent onboarding flow (declaration → submit → review chain → contract → signed copy → E-Certificate → active) has been clicked through end to end in the running app. The rest of the backend was syntax-checked only.

**Status: everything in the client flow is built, including a first version of live chat and a WhatsApp link (#9).** Open items are client confirmations in Sec. 4.

**Last updated after:** Sec. 6 university content (fees, brochures, news, scholarships); removal of the old admission tracking and student status funnel; events and visits cleanup; #8 search; #7 audit log; #6 email and notifications; #5 invoice flow and payment block; #3 visa pipeline; priority #1 (approval chain, role mapping) and #2 (contract, E-Certificate, activation), plus fixes found while testing: agent document approvals not saving, no way for an agent to sign the declaration or upload the signed contract. Then: Account Manager scoping and role-based buttons (finishes #1). Then: #4 commission per university, #3 visa pipeline. Then: #5 invoice flow with the payment block. Then: #6 email delivery and notifications. Last: #9 live chat and WhatsApp link (built on our defaults while the client confirms scope).

**One-time steps after pulling this work:** run `node backend/scripts/migrate_approval_chain.js`, then start the server and check the log for the "Activation backfill" line. **Then set the commission % on every university** (Universities → edit → Agent Commission): until a university has a rate, invoices for its students cannot be raised or approved. Existing agents' own rates are no longer used.

Legend: ✅ done · 🟡 partial · ❌ missing

---

## 1. Completed

| Area | Status | Notes |
|---|---|---|
| Staff roles (Roles) | ✅ | `User.staffRole` has `account_manager`, `head_recruitment`, `head_admission`, `accounts`. `null` = super admin. Agents have `accountManagerId`. Route guards `restrictToStaffRole`, `restrictToSuperAdminOr`, `allowStaff` match the client's role mapping, and Account Managers are scoped to their own agents everywhere. |
| Agent invite + registration (Sec. 1, steps 1–3) | ✅ | Account Manager or Head of Recruitment creates a one-time, hashed, expiring invite link (`onboardingRoutes.js`). The agent registers at `/register/:token` with the application form. Validation is in `utils/agentApplication.js`. The invite assigns the agent to an Account Manager. |
| Application documents + declaration (Sec. 1) | ✅ | Agent uploads verification documents. Required documents depend on agent type. The declaration name and ID are captured. |
| Application review with correction loop (Sec. 1) | ✅ | `onboardingStatus`: draft → submitted → under_review → recommended → verified → approved, plus correction_required and rejected, with history (`agentReviewController.js`). Account Manager recommends (own agents), Head of Recruitment verifies, Head of Admission approves. Verify and approve are blocked until required documents are approved. The next role and the agent are notified in-app. |
| Agent contract, E-Certificate, activation (Sec. 1) | ✅ | After approval: issue contract → upload signed copy → issue E-Certificate → agent activated. Inactive agents cannot create students or applications. Renewals supported; expiry stored, not enforced (`agentContractController.js`). |
| Student registration by agent (Sec. 2) | ✅ | Agent picks university + course from the catalog. `createApplication` enforces agent ownership. |
| Student document verification | ✅ | Pending / UnderReview / Verified / Rejected. Now restricted to Head of Admission. |
| Application review + visa pipeline (Sec. 3) | ✅ | Review statuses Draft / Submitted / Under Review / Rejected / Withdrawn, then Visa 15% → 35% → 70% → Arrival → Registration → Visa 100%, with fee proof. Replaces the old admission tracking and deposit tracking. |
| Invoice eligibility + agent invoice (Sec. 5) | ✅ | An application is invoice-eligible at Visa 100% with fees accepted. The agent invoices eligible applications only (one university and one currency per invoice). |
| Invoice review, commission, payoff | ✅ | PendingReview → UnderReview → CorrectionRequired / Resubmitted → Approved / Rejected, with history. Commission is a rate per university, with a `CommissionSnapshot`. Payoff is blocked until the university payment is recorded, then PENDING → SETTLED / CANCELLED with a payment slip. Head of Admission approves invoices; Accounts settles and cancels payoffs. |
| University & course management (Sec. 6) | ✅ | Head of Admission and super admin manage universities, fees, brochures, news and scholarships; agents read only. |
| In-app notifications | ✅ | Every notification is also emailed (see Sec. 4 / 7). Covers review, contract, visa stage, fee proof, invoice, payment, university content and ticket events. |
| Support tickets | ✅ | Open → In Progress → Resolved → Closed. |
| Auth | ✅ | Login, refresh, logout, password reset, profile update. |

---

## 2. Gaps vs. the new client flow

### Roles and approval chain ✅
- ✅ **Agent approval chain done.** submitted → under_review → **recommended** (Account Manager, own agents only) → **verified** (Head of Recruitment, documents must be approved) → **approved** (Head of Admission). Request changes: any of the three until approved. Reject: Head of Recruitment or Head of Admission. Each step notifies the next role. Super admin can do any step. See `agentReviewController.js`; UI in `ReviewActionButtons.jsx` / `utils/onboarding.js`. **Run `backend/scripts/migrate_approval_chain.js` once** to add the enum values and columns.
- ✅ **Invoice approval moved to Head of Admission** (`invoiceReviewRoutes`, `PATCH /invoices/:id/status`). Accounts keeps payoff settle / cancel only.
- ✅ **University and course management** now allows Head of Admission (plus super admin).
- ✅ **Team page for the super admin** (*Team* in the sidebar, `/admin/team`, `/api/staff`; `TeamPage.jsx`, `staffController.js`). Shows every staff member grouped by role (Super Admin, Head of Admission, Head of Recruitment, Accounts, Account Manager) with email, phone, status and, for Account Managers, how many agents they look after. The super admin can add staff, edit name / phone / role, deactivate or reactivate, and set a new password. Safeguards: you cannot change your own role or deactivate yourself; at least one active super admin must remain; an Account Manager who is deactivated or changes role must hand their agents to another Account Manager (or leave them unassigned). Other staff roles cannot open it.
- ✅ **Account Manager scoping for agents** (`getAgents`, `getAgent`, `updateAgent`, invites, review actions).
- ✅ **Account Manager scoping done** for students, applications, invoices, invoice review, payoffs, admission tracking, student verification, student documents, university application counts and the dashboard stats. Lists are limited to the manager's own agents; opening or changing another manager's record returns 403. One helper, `backend/utils/agentScope.js`, is used everywhere. Not scoped on purpose: support tickets and events (not in the client's requirement). **Not tested with real Account Manager accounts yet.**
- ✅ **UI buttons hidden by staff role** (`hasStaffRole` in `utils/staffRoles.js`): invoice Review (Head of Admission), payoff Settle / Cancel (Accounts), university and course add / edit / activate / delete (Head of Admission). Other staff can still view. The student and admission action buttons are still shown to any admin; the backend rejects them with 403.
- **Head of Admission owns student admission steps in code.** The client flow does not say this. Confirm.
- **Agent cannot edit.** The client says agents only view and upload documents. Confirm that the agent's edit routes (profile, student update) match this.

### Sec. 1 — Agent registration & approval ✅ (small items left)
- ✅ **Contract done.** After approval, the **Head of Admission** (or super admin) issues the contract (uploaded file, optional expiry); the agent uploads the signed copy (the Head of Admission can also upload or replace it). Renewals reuse the same steps and keep the agent active. All files are kept as versions. `agentContractController.js`, `AgentContractPanel.jsx` (staff), `AgentActivationStatus.jsx` (agent).
- ✅ **Agent can upload their own signed contract** (`POST /api/agents/me/contract/signed`, upload box on the agent dashboard). The client flow says QStudy uploads the signed copy; staff can still upload or replace it, and are notified when the agent uploads. Decision for the client: should staff confirm the agent's upload before it counts as signed? Today it counts immediately, and staff review the file before issuing the E-Certificate.
- ✅ **E-Certificate done.** The Head of Admission uploads it (file required). It needs a signed contract. A number `QS-AGT-<year>-<6 chars>` is generated.
- ✅ **"Activated" state done.** Issuing the E-Certificate sets `isActivated`. `POST /students` and `POST /applications` return 403 for agents who are not activated (`requireActivatedAgent`). Agents approved before this change are activated by a one-time backfill at server start (approved with no decision timestamp).
- ✅ **Agent notified** when the contract is ready and when the account is activated. Staff are notified at recommended / verified (see approval chain).
- 🟡 **Contract expiry is stored but not enforced.** An expired contract does not block the agent yet. Waiting on open question 9.
- ✅ **"Register Student" and "New Application" are disabled for inactive agents**, with a hover note explaining why. The backend also blocks them.
- Who issues: confirmed by the client. Head of Admission (and super admin) only. **View-only access** to an agent's contract, signed copy and E-Certificate: Head of Recruitment, and the Account Manager of that agent.
- ✅ **Declaration for agents without an invite.** The declaration was only captured on the invite registration page, so agents created by an admin could never submit ("The declaration has not been accepted"). They can now sign it once from their compliance card (`POST /api/agents/me/declaration`); submit stays disabled until signed.
- Registration form: ✅ done. The client's form is implemented in `utils/agentApplication.js` (bank details mandatory; company vs individual fields; relative-of-employee question; documents by agent type). Small items left: confirm that contact person / signatory are company-only, and decide whether the declaration needs a signature and date (server timestamp).

### Sec. 3 — Student progress pipeline ✅ (details open)
- ✅ **Pipeline reordered per the meeting audit.** Stages are now Application → Visa 15% → Visa 35% → Visa 70% → Arrival → **Medical Examination** → Registration → **Fees Paid** → **Visa 100%**. The agent uploads the fee proof at Registration; the Head of Admission accepts it, which allows the move to Fees Paid. Visa 100% (final endorsement) unlocks the commission invoice. "Pending Fees" no longer exists. Arrival now captures flight number, airport, optional time and an uploaded flight ticket (`POST /applications/:id/arrival-ticket`). At startup, applications at the old Visa 100% without accepted fees move back to Registration ("Pipeline reorder" log line). The paragraphs below describe the earlier order where they differ.
- ✅ **Pipeline built and merged with the old track.** Each application has a `pipelineStage`: Application → Visa 15% → Visa 35% → Visa 70% → Arrival → Registration → Visa 100%, then fees. The application details page now shows **one** "Student progress" card: the QStudy application review (Submit / Start Review / Reject / Withdraw) on top, then the visa stepper. The student can only move to Visa 15% after the review has started. The old six-step "Admission Milestone Journey" and its forms (campus visit, offer, admission letter, enrollment, tuition deposit) were **removed from the screen**; their backend endpoints, columns and stored data are untouched and can be deleted later. Service: `visaPipelineService.js`; UI: `VisaPipelinePanel.jsx`.
- ✅ **Who moves it:** for now the **Head of Admission** (and super admin) only. Agents watch it. Rules (our defaults, not yet confirmed by the client): forward one stage at a time, no skipping; back one stage at a time with a reason; frozen once invoiced; draft / rejected / withdrawn applications cannot move.
- ✅ **Arrival:** the Head of Admission enters who is arriving and the date when moving to Arrival.
- ✅ **Fees and "Pending Fees":** at Visa 100% the agent uploads proof of payment (PDF / JPG / PNG, 10MB); the Head of Admission accepts or rejects it (rejection needs a reason; the agent can upload again). Until accepted the record shows **Pending Fees**.
- ✅ **Invoice gate:** an application is invoice-eligible only at **Visa 100% with fees accepted**. This replaces the old four-part check (admission date, verified deposit, verified student, Enrolled). A student whose verification was rejected is still never eligible. Existing applications that were already eligible or invoiced are carried over as Visa 100% / fees accepted at server start (log line "Visa pipeline backfill").
- ✅ **Single-stage counting:** every live application counts in exactly one bucket (the Visa 100% stage splits into Pending Fees and Fees Paid), so counts always add up. Shown on the admin and agent dashboards and as a badge in both applications lists. The stats API also returns `pipelineBreakdown`.
- ✅ **Notifications:** the agent is notified on every stage change and on fee proof accepted / rejected; the Head of Admission is notified when proof is uploaded.
- 🟡 **Open:** should agents also be able to update some stages, can stages be skipped, and what other arrival details are needed? The old visit / offer / admission / enrollment / deposit backend (routes, columns, statuses) is still in the code but no longer reachable from the application page (see "Not in client flow"). Remove it once the client confirms question 7.
- ✅ **Student document verification** is independent of invoicing. When its optional "verify only after progress" setting is on (`VERIFICATION_REQUIRES_ENROLLMENT=true`, off by default) a student counts as ready once an application reaches Registration or Visa 100%.

### Sec. 5 — Commission & invoice ✅
- ✅ **Invoice stages as the client describes them.** Submitted (raised, being reviewed) → **Processing** (approved by the Head of Admission, waiting for the university to pay QStudy and for Accounts to pay the agent) → **Paid & Recorded**; rejected invoices are shown separately. Every invoice is in exactly one stage (`utils/invoiceStage.js`); a summary of the counts is on the admin and agent invoice pages, and the payoff list shows where each payment is (awaiting university payment / university paid / exception authorized).
- ✅ **"University paid QStudy" record** on the payoff: amount received, date, reference, notes. **Accounts or the Head of Admission** (or super admin) record it (`PATCH /payoffs/:id/university-payment`). It is kept in the payoff history.
- ✅ **Payment block.** Accounts cannot settle a payoff until that record exists. **Exception:** the Head of Admission or super admin can authorize paying earlier (`PATCH /payoffs/:id/bypass-block`); a **note is required** and is kept with their name on the payoff and shown on the screen. Accounts then settles as usual.
- ✅ **Currency rule.** The payoff takes the currency of the applications (USD or RM); the university payment must be recorded in that currency, otherwise it is refused with an explanation, and the agent is paid in the same currency.
- ✅ **One university and one currency per invoice** (the client said commission is per university; each university pays QStudy separately). The invoice form blocks mixing; the server refuses it too. *Assumed from the client's answer; confirm.*
- ✅ **Payment slip.** Accounts must upload a slip (PDF / JPG / PNG, 10MB) when marking a payment cleared. It is kept with the payoff; the agent and staff can open it.
- ✅ **Payment cleared notification** to the agent; staff are notified when the university payment is recorded or an exception is authorized.
- ✅ **No back door:** an invoice can no longer be marked Paid through the old invoice status endpoint; it becomes Paid only when Accounts settles the payoff.
- 🟡 **Existing payoffs** created before this change are treated like new ones: they are blocked until the university payment is recorded or the Head of Admission authorizes an exception.
- 🟡 The old payoff settlement fields (reference / UTR, date, batch) are unchanged. There is no currency conversion; the amount is the commission in the application's currency.

### Sec. 6 — University info & commission structure ✅
- ✅ **Commission** is on the university (percentage) and shown to agents and staff in the university list and details.
- ✅ **Fee structure** (name, amount, currency, note) edited in the university form.
- ✅ **Courses with tuition (what the student pays) and commission per course** (tuition x the university rate).
- ✅ **Brochures** (PDF/JPG/PNG, view/download; upload/remove by Head of Admission). Agents are notified.
- ✅ **News and scholarship updates** (scholarships carry amount and deadline); agents are notified on publish (can be switched off). Agents are read only.
- ✅ **Notify on publish:** agents are told (portal and email) when fees change, a brochure is added, or news / a scholarship is published. The page is `UniversityContent.jsx`; the API is `/universities/:id/courses`, `/brochures` and `/updates`.
- ✅ **Fixed on the way:** the course filter had an SQL injection risk and a JSON comparison error; both are fixed.

### Sec. 4 / 7 — Notifications and communication 🟡
- ✅ **Real email delivery.** `utils/email.js` sends through **Resend** (`RESEND_API_KEY`) or any **SMTP** server (`SMTP_HOST` and related settings), with the sender in `SENDER_EMAIL`. With neither set it only logs (development), and the server prints a clear warning at startup saying which mode it is in. Settings are documented in `backend/.env.example`. **Nothing is sent until the client picks a provider and a sender address.**
- ✅ **Every notification is also emailed.** All in-app notifications go through one function, which now also emails the recipient with a link to the right page. Agents always get the email; staff only if `EMAIL_STAFF_NOTIFICATIONS=true`. Email problems are logged and never break the action. Inactive users and users without an email address are skipped.
- ✅ **Events that notify the agent:** application verified, approved, returned for correction, rejected; contract ready and account activated; student application under review or rejected; every visa stage change; fee proof accepted or rejected; **invoice approved, returned for correction, rejected**; university payment / payment cleared; **university added, updated or made inactive / active**; **news and announcements** (when "notify agents" is ticked); **support ticket replies and status changes**; student document decisions.
- ✅ **Events that notify staff** (in-app): next approver on each agent review step, signed contract received, new invoice to review, invoice resubmitted, fee proof uploaded, university payment recorded, payment exception authorized.
- ✅ **Announcements / news publishing** already existed (News & Updates); it now also emails agents.
- ✅ Password reset email failures no longer change the response (they used to cause an error only for registered addresses), and the reset link is no longer written to the server log when real email is on.
- ✅ **Live chat** (first version, our defaults). *Live Chat* in the sidebar for agents and staff: one conversation per agent, messages shown within about 5 seconds (the screen asks the server every 5 seconds), unread counts for staff, and a notification (also emailed) for the first unread message so a busy chat does not flood inboxes. Staff can start a chat with any agent they may work with; Account Managers only see their own agents; any staff member can reply and the agent sees their name. Messages up to 2000 characters, text only. `chatController.js`, `ChatMessage` model, `pages/ChatPage.jsx`. Chat messages are not written to the audit log.
- ✅ **WhatsApp link.** Set `WHATSAPP_NUMBER` (digits with country code, optional `WHATSAPP_MESSAGE`) in `backend/.env` and a "Chat on WhatsApp" button (click-to-chat link) appears in the chat for agents and staff. Agents open that QStudy number. **Staff open the selected agent's own number** (from the phone in the agent's profile, which needs the country code); the button is hidden when it is missing.
- 🟡 **Not built:** WhatsApp Business API (sending notifications to WhatsApp), file attachments in chat, typing indicators, chat history search, and out-of-hours auto replies. Waiting on the client (question 5).
- 🟡 Agents cannot choose which emails they receive (no opt-out yet).
- 🟡 Emails are plain branded text with a link; no logo or per-event design.
- ✅ **Security:** `backend/.env` and `frontend/.env` are now **untracked and git-ignored** (templates: `backend/.env.example`, `frontend/.env.example`). The old values are still in git history, so **rotate the database password, JWT secret and any email key**, and remove `REACT_APP_JWT_TOKEN` from `frontend/.env` (anything starting with `REACT_APP_` is shipped to every browser).

### Search ✅
- ✅ **Global search** in the top bar (also Ctrl/Cmd+K): one box finds **universities, courses, students, applications, invoices, payoffs and (staff) agents**. Results are grouped (up to 5 each), keyboard-navigable, and open the right page. `GET /api/search` (`searchController.js`).
- ✅ **It only finds what the person may already open:** an agent finds their own students, applications, invoices and payoffs and only active universities and courses; an Account Manager finds only the records of their own agents; other staff find everything. Agents never see the agents list.
- ✅ **University information search:** the university lists (admin and agent) and the global search now match name, code, country, city, **contact person and email, website, description and commission** (typing a number such as 10 also finds universities with a 10% commission).
- ✅ Search text is matched literally (`%` and `_` are escaped); queries under 2 characters are ignored; older slow answers never replace newer ones.
- ✅ Fees, brochures, news and scholarships are searchable.
- 🟡 Search is a simple "contains" match (no typo tolerance or ranking); the existing list pages keep their own filters.

### Audit log ✅
- ✅ **Central audit log built.** Every record **created, changed or deleted** anywhere in the portal is written to `AuditLogs` with the date and time, **who** did it (name and role, or System), what the record is, a readable summary, and for changes the **old → new value of each field**, plus the request (method and path) and IP. Capture is automatic through global Sequelize hooks (`utils/audit.js`), so it covers all records without editing each controller. In a transaction the entry is written only after it commits.
- ✅ **Viewer:** *Audit Log* in the sidebar (`/admin/audit-log`), for the **Head of Admission and super admin** only (the API enforces it). Filters: search, record type, action, from / to date; expandable rows show every field change; 25 per page.
- ✅ **What is kept out:** passwords and tokens are never stored; bank details and ID numbers are logged as "changed" without the values; JSON documents (file lists, histories) are marked "changed" instead of copied. Notifications and password-reset tokens are not logged (noise / secrets).
- 🟡 **Not captured:** bulk SQL updates that bypass instance hooks (one-time startup backfills, "mark all notifications read"), and public actions with no signed-in user (an agent registering through an invite link) appear as **System**.
- 🟡 Entries are never edited or deleted by the app, but there is no retention policy or export yet.
- 🟡 The log starts when this version is deployed; earlier changes are only in the per-record histories (`Application.history`, `Invoice.financeReviewHistory`, `User.onboardingHistory`, ...), which still exist.

### Not in client flow — cleanup
- ✅ **Events and seat allocation removed.** The Event model, controller, routes and all event pages (admin and agent) are gone, along with the event fields on students; no code references them any more.
- ✅ **University campus visits removed.** The schedule / complete visit endpoints and service methods, the visit fields on applications (`visitDate`, `visitLocation`, `visitNotes`, `visitCompleted`), the visit modal, the `VisitScheduled` / `VisitCompleted` workflow steps and the related labels and counters are gone. Application history entries that recorded a visit still display with their old label. **Applications left in a visit status are moved to Under Review at server start** ("Visit cleanup" log line); the two status names stay in the database enum only because Postgres cannot drop enum values. **The visit columns are dropped from the database at the next start**, so any visit data is deleted.
- ✅ **Offer, admission letter, enrollment and tuition deposit tracking removed.** The routes, service methods, application columns (`offer*`, `admission*`, `universityStudentId`, `enrollment*`, `deposit*`), the four dialogs and the deposit backfill are gone. An application now only has the review statuses Draft / Submitted / Under Review / Rejected / Withdrawn; everything after the review is the visa pipeline. **Applications in an old status (visit, offer, admission, enrolled) are moved to Under Review at startup** ("Status cleanup" log line); their visa stage is not changed, so the Head of Admission should check it. The application counters on the lists and dashboards now show "In Visa Process" and "Fees Paid". The columns above are dropped from the database at the next start.
- ✅ **Student status funnel removed** (Registered → Contacted → Confirmed → Attended → Converted). A student no longer has a status of their own; the status field, `PATCH /students/:id/status` and the "Update status" controls are gone. A student's progress is **derived from their applications**: the furthest visa stage among the live ones, or "No application" (`utils/visaPipeline.js`, `utils/studentProgress.js`). Student lists, details, the agent drawer, dashboards, agent reports and the agents list use it; "Converted" now means **fees paid** (Visa 100% and fees accepted). The student status column is dropped from the database at the next start.
- ✅ **Student-based invoicing removed.** A read-only smoke test of every list and detail query against the local database passes (agents correctly cannot open the finance review queue). Invoices are raised only for applications (`applicationIds`); the old flow that invoiced "Converted" students needed the removed status.
- ✅ **Two old invoice gates removed** that contradicted the client's rule and would have blocked invoices after the pipeline change: a verified deposit plus admission date, and a "Verified" student. Invoicing now needs Visa 100% and accepted fees, and still refuses students whose verification was rejected.
- Student **document verification** is unchanged (it is a separate feature); its optional "ready" check follows the visa pipeline.

---

## 3. Priority list

| # | Task | Why | Depends on |
|---|---|---|---|
| 0 | **Client answers: mostly received** (see Sec. 4). Open: whether agents ever update stages, skip / reverse rules, WhatsApp, email, events, contract renewal | Small details only | — |
| 1 | **Done.** Approval chain, invoice approval, university management, Account Manager scoping and role-based buttons. (Open: Head of Admission and student/admission buttons still shown to every admin; confirm who owns admission steps.) | Core of the new flow | #0 |
| 2 | **Done** (expiry enforcement waits on client answer 9) | Finishes Sec. 1 | #1 |
| 3 | **Done** (Head of Admission owns the stages for now). Pipeline, arrival, fee proof upload and review, Pending Fees, single-stage counts, invoice gate = Visa 100% + fees accepted | Sec. 3 is the main agent-facing feature | — |
| 4 | **Done** (commission per university; fees, brochures, news, scholarships, agents notified) | Needed for Sec. 6 | — |
| 5 | **Done.** Submitted → Processing → Paid with counts; university-paid record; payment block with Head of Admission exception (note required); payment slip; currency match; one university per invoice | Sec. 5 | #3, #4 |
| 6 | **Done** (needs the client's email provider and sender address to go live). Real delivery, email copy of every notification, missing events added, announcements already existed | Sec. 4 / 7 | — |
| 7 | **Done.** Central audit log (automatic, every record) with a viewer for the Head of Admission / super admin | Sec. 7 | — |
| 8 | **Done.** Global search and broader university search (fees, brochures, news, scholarships) | Sec. 7 | #4 |
| 9 | **Done (first version).** Live chat in the portal and a WhatsApp click-to-chat link. WhatsApp Business API only if the client wants it | Sec. 7 | #0 |
| 10 | **Done.** Events, seat allocation, campus visits, offer / admission / enrollment / deposit tracking and the old student status funnel are removed | Cleanup | #0 |

---

## 4. Client decisions and open questions

### Answered by the client
| Topic | Decision | Status in code |
|---|---|---|
| When is the agent paid | After **Visa 100% and fees paid**. The visa milestones (15/35/70%) do not change commission. | ✅ Done (#3 invoice gate, #5 payment) |
| Payment vs university | The agent is paid **only after the university has paid QStudy**. Payment is **blocked** until QStudy records that. Accounts or the Head of Admission record the university payment. Only the **Head of Admission or super admin** can bypass the block, **with a note**. | ✅ Done (#5) |
| Commission | Set by the admin **per university** (a rate for admission, e.g. University 1 = A%, University 2 = B%). **Remove the commission rate from the agent.** | ✅ Done (#4): rate on the university; agent rate removed |
| Currency | Correct as understood: university pays USD → agent paid USD; RM → RM. | ✅ Done (#5) |
| CEO | The **Head of Admission is the CEO**. No separate CEO step. He gives the final approval on agent applications and can **edit agent applications**. | ✅ Final approval done; Head of Admission can now edit agents |
| Agent documents | Head of Admission can approve agent documents too (as well as Head of Recruitment). | ✅ Done |
| Proof of fee payment | Agent uploads proof; **Head of Admission** checks the payment was received and marks it accepted or rejected. | ✅ Done (#3) |
| Contract and E-Certificate | **Head of Admission issues the contract**, the **agent uploads the signed copy**, and the **Head of Admission uploads the E-Certificate**. | ✅ Done (Account Manager and Head of Recruitment no longer issue them; certificate file is now required) |

### Still open & Audit Updates
1. ~~**Visa stages:**~~ Clarified in `meeting_audit_qstudy.md`: Sequence updated to include **Medical Examination** post-arrival and **Fees Paid** before final endorsement (**Visa 100%**). Arrival captures flight details & tickets.
2. ~~Commission per university only or also per course?~~ Per university. The course list shows the commission per course (tuition x the university rate).
3. **Is the commission a percentage only, or can it also be a fixed amount per university?** Built as a percentage of tuition only.
4. **Contract renewal:** how often, and does an expired contract block the agent?
5. ~~**WhatsApp and live chat:**~~ Clarified: Client requested a **Dual Chat System** (Option 1: 1-on-1 AM Direct Chat; Option 2: General Helpdesk).
6. **Email:** built so every notification is emailed to agents. Which provider (Resend or the client's own SMTP) and from which address (for example no-reply@their domain)?
7. ~~Events, university visits, offer / admission / enrollment / deposit tracking and the old student status funnel~~ — all removed.
8. ~~**Registration form:**~~ Clarified: Follows the physical form ([Q Study Agent Application Form 2024 (1).pdf](file:///c:/Users/mestr/Documents/All%20DTG%20Projects/agent-portal/Q%20Study%20Agent%20Application%20Form%202024%20(1).pdf)), bifurcated into 3 steps: Corporate & Contact [Company name first] $\rightarrow$ Declarations & Bank Particulars $\rightarrow$ Document Uploads [**any 1 document sufficient; drop blank form upload**].
9. ~~**E-Certificate / Agent ID:**~~ Clarified: Agent User ID uses formula `[3-Letter Agency Code] + [4-Digit Serial Number] + [3-Letter Country Code]` (e.g. `GEA0001IND`). Note: Vijay gave examples `MOU`/`MLD`; standard ISO uses `MUS`/`MDV`.
10. **Who may see the bypass of the payment block:** Kept in audit history, authorized by Head of Admission / Super Admin only.

---

## 5. Post-Meeting Audit Realignment (Gaps vs. Latest Meeting Audit)

Directives from the latest leadership alignment review (`meeting_audit_qstudy.md`) and the 22 Oct meeting transcript with Vijay (client):

### ➕ 5.1 What We Have to ADD
| Item | Requirement / Gap | Action Required |
|---|---|---|
| **Medical Examination Stage** | ✅ Done. Added between Arrival and Registration (`visaPipeline.js`, `VisaPipelinePanel.jsx`, database enum). | — |
| **Agent User ID Auto-Generator** | ✅ Done. Auto-generates standardized Agent ID ([Agency 3L] + [4-Digit Serial] + [Country 3L], e.g. `GEA0001IND`) on Head of Admission approval inside a transaction with `pg_advisory_xact_lock`. Registration leaves code null until approval. Backfill script provided at `backend/scripts/backfill_agent_ids.js` (supports `--dry-run`, lists agents missing a country). | Support client aliases (`MOU`, `MLD`). |
| **Dual Chat Channels** | ✅ Done. Two channels per agent: **My Account Manager** (direct, the agent and their own Account Manager; super admin can read but not reply) and **General Support** (helpdesk; answered by the Head of Admission and the super admin, a client-approved departure from the matrix). Other staff roles have no chat access, as in the access matrix. Agents without an Account Manager can only use General Support. Unread counts and notifications are per channel. Older messages stay in the direct channel, or move to General Support for agents with no Account Manager (one time, at the next server start). | Tell the client the helpdesk is staffed by Head of Admission + super admin. |
| **University Visibility Rights** | All active universities are visible to all approved agents. | Super Admin toggle matrix to assign which universities/regions an agent can view (Malaysian vs. Foreign). |
| **Payment Term Due Dates** | Maturity countdown missing on approved invoices. | Add payout due dates (e.g., 14-day or 30-day payment terms from University Payment In). |
| **Flight Arrival Tracking** | ✅ Done. Flight number, airport, date, optional time and ticket upload. | — |
| **105 Universities Ingestion** | Manual university creation only. | Data ingestion script to migrate 105 institutions and program catalogs from System QStudy. |
| **Dashboard Widgets Realignment** | Currently shows "Agents by Region". | Change to **"Agents by Country"** and add **"Agents by Account Manager"**; restrict dashboard to Super Admin only. |
| **Students Inside Agents View** | Standalone student management exists. | Under Agent detail view in Admin, embed 3 sub-views: **Students**, **Invoices**, and **Visa Tracking**. |
| **Ticket Email Notification Details** | Notification emails currently only notify of updates. | Ensure ticket notification emails explicitly include the issue description. |

### 🔄 5.2 What We Need to UPDATE
| Item | Current Implementation | Required Realignment |
|---|---|---|
| **Visa Progression Sequence** | ✅ Done. `Fees Paid` now comes before `Visa 100%`; the "Pending Fees" state is removed. | — |
| **5 Core Roles Hierarchy** | Includes `head_recruitment` and mixed admin permissions. | Consolidate into 5 explicit tiers: **Agent**, **Account Manager**, **Admission Manager**, **Finance/Accounts**, **Super Admin**. |
| **Agent Registration Form & Documents** | Split form; requires all documents. | Restructure into 3 clean steps (Company name first; Bank & Declarations; Documents). **Uploading ANY ONE document is sufficient** (Company Profile, Business Registration, or Passport). |
| **Menu Renaming** | Main navigation shows "Admissions". | Rename "Admissions" tab to **"Info"** (catalog for universities, courses, fees, brochures, commission, updates). |
| **Audit Log Permissions** | Accessible by Head of Admission & Super Admin. | Restrict strictly to **Super Admin** only. |
| **Single-Stage Pipeline Counts** | Ensure no dual-bucket display. | Keep strict single-state tracking across all 9 milestones. |

### ❌ 5.3 What We Have to REMOVE
| Item | Reason for Removal | Status |
|---|---|---|
| **Dummy Financial Metrics & Widgets** | Client instruction: *"Do NOT overcomplicate with dummy finance calculations (e.g., avoid artificial 'settled commission vs. pending commission totals' widgets)."* | Remove speculative projection widgets and artificial totals; keep milestone-driven (Submitted $\rightarrow$ University Paid $\rightarrow$ Due $\rightarrow$ Settled). |
| **"Pending Visa" After Fees Paid** | Confusing status; once fees are verified, application moves directly to final endorsement. | ✅ Done ("Pending Fees" bucket removed with the pipeline reorder). |
| **Agent Profile Commission Rate** | Commission is set per university, never per agent. | Purge all legacy agent-level commission inputs. |
| **Mandatory Upload of All Documents** | Client confirmed ANY ONE document is enough. | Relax document requirement to at least one valid agency document. |
| **Agent Application Form Upload** | Data is entered directly into the 3-step digital form. | Remove redundant blank/filled application form upload field. |
| **Legacy Event & Expo Relics** | Leftovers from early `whattoimplement.md` spec. | Confirm full decommissioning of event, expo, and campus visit schemas. |
| **Agent Visa Progress Editing** | External agents cannot alter percentage milestones. | Verify agents are strictly **View-Only** on the pipeline. |

---

### 📊 5.4 Role & Feature Access Matrix (Sign-Off Deliverable)

| Feature / Module | Agent | Account Manager | Admission Manager | Finance / Accounts | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Agent Profile Registration** | Fill & Submit | View Assigned | Recommend | View Bank Details | Approve & Activate |
| **Contract & E-Certificate** | Sign & Upload | View Assigned | Upload Certificate | View | Upload / Revoke |
| **Student Application & Docs** | Create & Upload | Review Assigned | Process & Approve | No Access | View All |
| **Visa Milestones (15% ➔ 100%)** | **View Only** | View Assigned | **Update Stages** | View Status | Full Edit |
| **Invoice Submission** | Submit (when eligible)| View Assigned | Verify Eligibility | Process Payout | Full Control |
| **University Payment In** | No Access | No Access | View Status | **Record Receipt** | Full Control |
| **Agent Payout & Slip Upload** | View Slip & Date | No Access | View Status | **Mark Paid & Slip**| Full Control |
| **University & Course Info ("Info")** | View (Allowed only)| View | Manage Catalog | View Comm % | **Set Visibility Rules**|
| **Dedicated Direct Chat** | Chat with AM | Chat with Agents | No | No | Monitor |
| **General Support Chat** | Access | No Access | No Access | No Access | Supervise |
| **Support Tickets** | Raise Ticket | View Assigned | View Assigned | View Payment Issues| Full Resolution |
| **System Audit Log** | No Access | No Access | No Access | No Access | **Full Log Access** |
