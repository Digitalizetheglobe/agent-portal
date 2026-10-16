# QStudy Agent Portal: Client Workflow

## Roles

```text
Agent  →  Account Manager  →  Head of Recruitment  →  Head of Admission  →  Accounts
```

- **Agent:** outside recruiter. Views information and uploads documents only, cannot edit.
- **Account Manager:** salesperson who looks after a set of agents. Sees only their own agents.
- **Head of Recruitment:** called Head of Sales on the call. Verifies agent applications and can view agents' contracts. Super admin.
- **Head of Admission:** called admin on the call, and also the CEO (there is no separate CEO step). Gives the final approval on agent applications and can edit them, approves agent and student documents, issues the contract and the E-Certificate, moves students through the visa stages, approves invoices, records university payments, and maintains university information. Super admin.
- **Accounts:** Finance, the highest authority. Pays agents and records payments. Super admin.

---

## 1. Agent Registration & Approval

```text
Agent creates a profile
  ↓
Agent fills out the agent application form
  ↓
Agent uploads documents and confirms the declaration that the information is true
  ↓
Account Manager recommends the application
  ↓
Head of Recruitment verifies the application
  ↓
Head of Admission approves the application
  ↓
Agent is notified at each step (verified, approved)
  ↓
Head of Admission issues the Agent Contract through the portal
  ↓
Agent signs and uploads the signed copy
  ↓
Head of Admission uploads the Agent E-Certificate
  ↓
Agent Account Activated (can now submit students)
```

Agent registration is one time only. The contract is renewable. Account Managers (for their own agents) and the Head of Recruitment can view the contract, signed copy and E-Certificate.

---

## 2. Student Application

```text
Approved Agent logs into the portal
  ↓
Agent submits a new student application
  ↓
Agent uploads student documents through the portal (no more email)
  ↓
Application goes to the QStudy team
  ↓
Student enters the pipeline at the "Application" stage
```

For now the Head of Admission moves students through the stages; agents watch.

---

## 3. Student Progress Pipeline

```text
Application (before visa approval)
  ↓
Visa Progress 15%
  ↓
Visa Progress 35%
  ↓
Visa Progress 70%
  ↓
Arrival (agent enters who is arriving and the date)
  ↓
Registration
  ↓
Visa 100%
  ↓
Fees paid? (agent uploads proof of payment)
  ↓
If fees are not paid: record shows "Pending Fees" and the invoice stays blocked
  ↓
Head of Admission checks the payment was received and accepts or rejects the proof
  ↓
If fees are paid: student is eligible for a commission invoice
```

Each student counts in only one stage at a time. When a student moves to the next stage, the previous stage's count goes down by one and the next stage's count goes up by one. The dashboard must never double-count.

---

## 4. Agent Notifications

```text
QStudy updates a student's stage or payment status
  ↓
Agent receives a notification by email (WhatsApp to be confirmed)
  ↓
Agent sees the updated status on their dashboard
```

Agents are also notified when their agent application is verified or approved, when their contract and e-certificate are ready, when a payment is cleared, and when university information is updated.

---

## 5. Agent Commission & Invoice

```text
Student reaches Visa 100% and fees are paid
  ↓
Agent submits the commission invoice through the portal
  ↓
Invoice Submitted
  ↓
Head of Admission verifies and approves the invoice
  ↓
Invoice moves to Processing (waiting for the university to pay QStudy)
  ↓
University pays QStudy; Accounts or the Head of Admission record it in the portal
  ↓
Accounts pays the agent through the bank (blocked until the university payment is recorded)
(in USD if the university paid in USD, in RM if the university paid in RM)
  ↓
Accounts marks the payment as cleared and uploads the payment slip
  ↓
Agent receives a payment notification
  ↓
Invoice Paid & Recorded
```

The portal only keeps the records. No money moves through the portal.

The visa milestones (15%, 35%, 70%) do not change the commission. The agent is paid after Visa 100% and fees paid, and only after the university has paid QStudy. Only the Head of Admission can authorize paying earlier, and must leave a note.

Commission is set by the admin per university (for example University 1 = 10%, University 2 = 8%). There is no commission rate on the agent. An invoice covers one university and one currency.

Example of the counting rule: 10 invoices submitted, 5 move to processing. Submitted now shows 5 and Processing shows 5. When those 5 are paid, Processing drops to 0.

---

## 6. University Information & Commission Structure

```text
Head of Admission adds or updates university details
  ↓
Head of Admission updates fee structures and commission structures
  ↓
Head of Admission uploads brochures, news and scholarship updates
  ↓
Update is published to the portal
  ↓
Agents receive a notification (email, WhatsApp to be confirmed)
  ↓
Agents view university details, fees, commission per course, and how much each student has to pay
```

Agents can view this information but cannot change it.

---

## 7. Communication & Search

```text
QStudy publishes an announcement or update
  ↓
Agents receive email notifications (WhatsApp to be confirmed)
  ↓
Agent can contact QStudy through the portal's live chat or a WhatsApp link (built; scope to be confirmed)
```

### Search

```text
Agent searches university information (commission, fees, brochures)
  ↓
Matching results are displayed
  ↓
Agent opens the relevant information
```

### Audit Log

```text
Any record is updated or changed
  ↓
Portal records the date and time of the change in the log
```

---

## 8. Complete End-to-End Business Flow

1. Agent Creates Profile & Submits Application
2. Account Manager Recommends
3. Head of Recruitment Verifies
4. Head of Admission Approves
5. Agent Contract Issued & Signed
6. E-Certificate Issued, Agent Activated
7. Agent Submits Student Application & Documents
8. Visa Progress 15% / 35% / 70%
9. Student Arrival
10. Registration
11. Visa 100% & Fees Paid
12. Agent Submits Commission Invoice
13. Head of Admission Approves Invoice
14. University Pays QStudy
15. Accounts Pays Agent & Uploads Slip
16. Agent Receives Payment Notification

### Notes for Client Confirmation

Answered by the client: the visa milestones do not affect commission; the CEO is the Head of Admission; the registration form was supplied and is built.

Still to confirm:

- Whether the live chat and WhatsApp link we built are enough, or WhatsApp Business notifications are wanted too.
- Whether commission can also be a fixed amount per university (built as a percentage of tuition).
- Contract renewal: how often, and whether an expired contract blocks the agent.
- The visa stage rules we chose (one stage at a time, back one with a reason) and whether agents ever update stages.
- The email provider and sender address for going live.