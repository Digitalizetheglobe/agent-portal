# 📋 QStudy Meeting Audit & Implementation Requirements

**Recording:** WhatsApp Audio, 22 Oct 2026, 1:55 PM (about 30 minutes)  
**Topic:** Walkthrough of the agent portal (admin dashboard, agent onboarding, students, finance, chat, support, audit log), plus migrating the existing university/program portal  
**Attendees & Roles:** 
- **Client (QStudy Leadership):** **Vijay** (gives the requirements, reviews the portal)
- **Developer / Presenter:** **Ankush** (walks through the portal)
- **Developer / Engineering:** **Anup** (backend, models, Render)  
**Target Completion:** Committed for Monday; Initial Matrix & Chart review Thursday/Friday (before Vijay's Expo Sun–Tue).

---

## 🎯 1. Executive Summary & Immediate Next Action

During the meeting, Vijay (client) reviewed the live progress, clarified the real-world operational model, removed unnecessary/confusing dummy metrics, and provided direct instructions for the system workflow.

### ⚡ Immediate Deliverables Requested by Client:
1. **Role Flowchart & Access Permissions Matrix:**
   > *"Why don't you do for me a chart? Admin, super admin, what are things inside? Agent, what are things inside? Account manager, what are the things inside? So then I can correct you today. Tomorrow I'm free, I can correct you... Do an Excel sheet / Access Permissions Matrix."*
2. **Deadline:** Monday completion. Vijay is at an education expo Sunday through Tuesday.

---

## 🖥️ 2. Super Admin Dashboard & At A Glance

Vijay clarified that the main dashboard is for **Super Admin only**.

### Dashboard Metrics & Widgets:
- **Operations Overview:** New students, new applications, invoices raised, settled today, new agents.
- **At A Glance Realignment:**
  - Change **"Agents by Region"** $\rightarrow$ **"Agents by Country"**.
  - Add **"Agents by Account Manager"** (every agent has one dedicated internal account manager).
- **Visa Progression Pipeline Bar:** Sequential progression (15% $\rightarrow$ 35% $\rightarrow$ 70% $\rightarrow$ Arrival $\rightarrow$ Medical $\rightarrow$ Registration $\rightarrow$ Fees Paid $\rightarrow$ Visa 100%). Remove "Pending fees".
- **Invoice Overview Pipeline:** Invoice Submission $\rightarrow$ University Payment In $\rightarrow$ Payment Released to Agent.

---

## 👥 3. The 5 Core Roles Architecture

Vijay explicitly mandated simplifying the internal structure into 5 distinct roles:

```text
1. Agent (External) 
     ↓
2. Account Manager (Internal Sales / Single Point of Contact)
     ↓
3. Admission Manager (Internal Operations / Processing)
     ↓
4. Finance / Accounts Department (Commission & Payouts)
     ↓
[Super Admin / CEO: Observes & controls the entire lifecycle]
```

### Role Breakdown:
1. **Agent (External Partner):**
   - 60+ agents managing student applicants worldwide.
   - Registers profile (Company name first), uploads agency documents (**any one document sufficient**), and inputs complete bank information.
   - Signs contract (online or upload) and receives digital E-Certificate.
   - Submits student applications and uploads required student documents.
   - **View-only** access to student visa progress stages (cannot manually alter percentages).
   - Submits commission invoices once a student's visa reaches 100% and university fees are confirmed paid.
   - Accesses the **"Info"** catalog (universities, courses, brochures, commission rates) allowed for them.
   - Communicates via dedicated chat with their assigned Account Manager or General Support.

2. **Account Manager (Sales Representative - Internal):**
   - Dedicated internal manager assigned to specific agents / countries.
   - First responder to agent applications and new student submissions.
   - Provides personalized support via 1-on-1 direct chat.
   - Reviews incoming student files before forwarding to Admissions.

3. **Admission Manager (Head of Admissions - Internal):**
   - Verifies and processes student applications.
   - **Sole authority** to update the Student Visa Progress Pipeline (`15%` $\rightarrow$ `100%`).
   - Verifies payment proofs, marks registration, and flags eligible students for agent invoicing.
   - Manages and maintains university information, brochures, entry requirements, and intake dates.

4. **Finance / Accounts Department (Internal):**
   - Automatically receives notifications when an agent submits a commission invoice.
   - Monitors university payment status (*"University Payment In"*).
   - Tracks payout due dates (e.g., 14-day or 30-day payment terms from university payment in).
   - Releases commission payments to agents' registered bank accounts and uploads payment slips.

5. **Super Admin (CEO / Leadership):**
   - Oversees all dashboards, active agents, student pipelines, and financial status.
   - Full authority over user management, account manager assignments, and system configurations.
   - Controls **University Visibility Rights** (deciding which agents see Malaysian vs. foreign institutions).
   - Accesses the system-wide **Audit Log** to inspect actions, user histories, and timestamps.

---

## 📊 4. Role & Feature Access Matrix (Sign-Off Matrix)

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

---

## 🛫 5. Student Visa Progression Lifecycle

Vijay confirmed the exact sequential visa stages without overlapping or double-counting:

```text
[ New Student Application ]
          ↓
[ Visa Progress: 15% ]
          ↓
[ Visa Progress: 35% ]
          ↓
[ Visa Progress: 70% ]
          ↓
[ Student Arrival ] (Flight number, airport, date/time, ticket upload)
          ↓
[ Medical Examination ] (Mandatory post-arrival medical check)
          ↓
[ University Registration ]
          ↓
[ Fees Paid ] (Proof of tuition fee payment accepted)
          ↓
[ Visa 100% (Final Endorsement) ]
          ↓
================== COMMISSION UNLOCKED ==================
          ↓
[ Invoice Submitted by Agent ]
          ↓
[ University Payment In (Received by QStudy) ]
          ↓
[ Payment Released to Agent (Slip Uploaded) ]
```

> **Client Rules on Visa Tracking:**
> 1. *Remove "Pending Visa" / "Pending Fees" after fees paid.* Once fees are accepted, move to Visa 100%.
> 2. Agents can track progress visually on their dashboard, but **cannot edit** percentages.
> 3. Each student exists in only one stage at a time (e.g. moving from 35% to 70% decrements 35% counter by 1 and increments 70% by 1).

---

## 🗂️ 6. Navigation Hierarchy: "Students Inside Agents" & "Info" Section

Vijay gave two specific UI/UX structural instructions:

1. **"Students are inside the agents":**
   - In Admin Student Management, do not keep a disconnected standalone screen.
   - When clicking on an Agent, under the agent view you see 3 embedded modules:
     1. **Students** (all students submitted by this agent)
     2. **Invoices** (all invoices submitted by this agent)
     3. **Visa Tracking** (visa journey of this agent's students)
2. **Rename "Admissions" $\rightarrow$ "Info":**
   - The former "Admissions" catalog is renamed **"Info"**:
     - University information & profiles
     - Courses & degree levels
     - Intake dates & fee structures
     - Brochures & official URLs
     - Commission structures
     - Latest admin updates & news

---

## 🆔 7. Agent User ID Generation Standard

Agreed auto-generation formula for unique Agent IDs:

$$\mathbf{[3\text{-Letter Agency Code}]} + \mathbf{[4\text{-Digit Serial Number}]} + \mathbf{[3\text{-Letter Country Code}]}$$

- **Agency Code:** First 3 letters of the Agency Name (e.g., *Global Education Agency* $\rightarrow$ `GEA`).
- **Serial Counter:** Sequential 4-digit padded number starting at `0001`, `0002`, etc.
- **Country Code:** 3-letter country code (e.g., India $\rightarrow$ `IND`, Mauritius $\rightarrow$ `MOU`/`MUS`, Maldives $\rightarrow$ `MLD`/`MDV`).
- **Example Result:** `GEA0001IND`.
- *Note:* Vijay gave `MOU` and `MLD` as examples. The ISO 3166-1 alpha-3 standards are `MUS` (Mauritius) and `MDV` (Maldives). System should support both standard ISO codes and client aliases.

---

## 📝 8. Agent Onboarding & 3-Step Form Specification

The registration directly models the official client form: [Q Study Agent Application Form 2024 (1).pdf](file:///c:/Users/mestr/Documents/All%20DTG%20Projects/agent-portal/Q%20Study%20Agent%20Application%20Form%202024%20(1).pdf) (*Partnership / Sub-agent Application Form*), bifurcated into 3 clean steps:

### Step 1: Corporate & Contact Details (Company Name First)
- **Company / Agency Name First**
- Business Registration Number
- Registered Official Address & Country
- Person in Charge (PIC) / Contact Person Name & Designation
- Person Authorized to Sign the Agreement
- Contact Phone & Official Email

### Step 2: Legal Declarations & Bank Particulars (Mandatory)
- **Declarations:** Family member conflict-of-interest check and declaration of truth.
- **Bank Information:**
  - Bank Name & Branch Address
  - Beneficiary / Account Holder Name (Company or Individual)
  - Bank Account Number / IBAN
  - SWIFT / BIC Code & Routing / Zip Code

### Step 3: Document Uploads (**Any ONE Sufficient**)
- **Client Mandate ([12:23]):** **Uploading ANY ONE of the following documents is sufficient** (not all mandatory):
  - Company Profile / Brochure
  - Business Registration Certificate
  - Passport Copy of Authorized Signatory / Director
- **Drop Agent Application Form Upload:** The agent already fills in all details online; no need to re-upload the blank/printed application form.

### Approval Chain:
```text
Agent Submits via Invite Link 
  → Assigned Account Manager 
  → Head of Sales / Recruitment (verifies) 
  → CEO + Accounts Department (approve)
  → Contract Issued & Signed (online/upload)
  → Digital E-Certificate Issued
  → Agent Activated (can submit students)
```

---

## 🏛️ 9. University & Program Database Migration ("System QStudy")

Vijay showcased the existing hosted portal (**System Q Study**):
- **Scope:** 105 Universities, complete program catalogs, faculties, degree levels, tuition fee breakdowns, entry requirements, awarding bodies, downloadable brochures, and official website URLs.
- **Instruction:** Do **not** rebuild manually; **migrate and ingest the existing data directly** into the new Agent Portal database.
- **Granular Permissions:** Super Admin has a toggle matrix to designate which universities/courses each agent can view (e.g. Malaysian universities vs. Foreign universities).

---

## 💰 10. Invoicing & Finance Philosophy

Vijay gave strict instructions on keeping finance clean and practical:
- **Do NOT show dummy finance metrics** (avoid speculative "pending commission vs. settled commission" totals; QStudy uses its own external accounting system).
- **Core Requirement:** Milestone-driven invoice tracking:
  1. **Invoice Submitted:** Date submitted, invoice PDF, and eligible applications.
  2. **University Payment In:** Date QStudy received payment from the university.
  3. **Maturity / Due Period:** Countdown of payout terms (e.g., 14-day or 30-day term from University Payment In).
  4. **Payment Released to Agent:** Date payment released and bank confirmation slip uploaded.

---

## 💬 11. Communication, Tickets & Audit Logs

1. **Dual Chat System:**
   - **Option 1 (Direct AM Chat):** Dedicated 1-on-1 direct messaging between the agent and their assigned Account Manager.
   - **Option 2 (General Helpdesk):** Live chat with general support.
2. **Support Ticket System:**
   - Operational categories: Login, Payment, Commission structure, Documents.
   - Status pipeline: `Open` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`.
   - **Client Mandate on Ticket Emails:** **Every notification email must explicitly state the issue description.**
3. **Audit Log:**
   - Restricted strictly to **Super Admin**.
   - Records every system modification: action taken, entity affected, user responsible, and exact timestamp.

---

## ⏱️ 12. Project Milestones & Delivery Schedule

| Milestone | Target Date | Status |
| :--- | :--- | :--- |
| **Role Flowchart & Access Matrix (Excel/Doc)** | **Thursday** | Delivered for Client Validation |
| **Client Review & Feedback** | **Friday** | Scheduled |
| **Client at Education Expo** | Sunday – Tuesday | Low Availability |
| **Full Platform Core Implementation & Demo** | **Monday** | Committed by Dev Team |

