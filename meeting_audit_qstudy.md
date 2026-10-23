# 📋 QStudy Meeting Audit & Implementation Requirements

**Meeting Context:** Project Review & Requirement Alignment with QStudy Leadership  
**Attendees:** 
- **Client (QStudy Leadership / Speaker A & E)**
- **Technical Lead / PM (Ankush / Speaker B)**
- **Engineering / Backend Dev (Vijay / Speaker D)**  
**Target Completion:** Committed for Monday; Initial Matrix & Chart review today / tomorrow (before client's Expo Sun–Tue).

---

## 🎯 1. Executive Summary & Immediate Next Action

During the meeting, the client reviewed the live progress, clarified the real-world operational model, removed unnecessary/confusing dummy metrics, and provided direct instructions for the system workflow.

### ⚡ Immediate Deliverable Requested by Client Today:
> *"Why don't you do for me a chart? Admin, super admin, what are things inside? Agent, what are things inside? Account manager, what are the things inside? So then I can correct you today. Tomorrow I'm free, I can correct you... Do an Excel sheet / Access Permissions Matrix."*

A visual diagram and access matrix outlining the **5 core roles** and their exact system rights must be submitted immediately for client validation.

---

## 👥 2. The 5 Core Roles Architecture

The client explicitly mandated simplifying the internal structure into 5 distinct roles:

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
   - Registers profile, uploads official agency documents, and inputs complete bank information.
   - Signs contract and receives digital E-Certificate.
   - Submits student applications and uploads required student documents.
   - **View-only** access to student visa progress stages (cannot manually alter percentages).
   - Submits commission invoices once a student's visa reaches 100% and university fees are confirmed paid.
   - Accesses university catalogs, course details, brochures, and commission structures assigned to them.
   - Communicates directly with their assigned Account Manager or General Support.

2. **Account Manager (Sales Representative - Internal):**
   - Dedicated manager assigned to specific agents / geographical regions.
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
   - Tracks payout due dates (e.g., 14-day or 30-day payment terms).
   - Releases commission payments to agents' registered bank accounts and uploads payment slips.

5. **Super Admin (CEO / Leadership):**
   - Oversees all dashboards, active agents, student pipelines, and financial status.
   - Full authority over user management, account manager assignments, and system configurations.
   - Controls **University Visibility Rights** (deciding which agents see Malaysian vs. foreign institutions).
   - Accesses the system-wide **Audit Log** to inspect actions, user histories, and timestamps.

---

## 📊 3. Role & Feature Access Matrix (Requested Deliverable)

| Feature / Module | Agent | Account Manager | Admission Manager | Finance / Accounts | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Agent Profile Registration** | Fill & Submit | View Assigned | Recommend | View Bank Details | Approve & Activate |
| **Contract & E-Certificate** | Sign & Upload | View Assigned | Upload Certificate | View | Upload / Revoke |
| **Student Application & Docs** | Create & Upload | Review Assigned | Process & Approve | No Access | View All |
| **Visa Milestones (15% ➔ 100%)** | **View Only** | View Assigned | **Update Stages** | View Status | Full Edit |
| **Invoice Submission** | Submit (when eligible)| View Assigned | Verify Eligibility | Process Payout | Full Control |
| **University Payment In** | No Access | No Access | View Status | **Record Receipt** | Full Control |
| **Agent Payout & Slip Upload** | View Slip & Date | No Access | View Status | **Mark Paid & Slip**| Full Control |
| **University & Course Info** | View (Allowed only)| View | Manage Catalog | View Comm % | **Set Visibility Rules**|
| **Dedicated Direct Chat** | Chat with AM | Chat with Agents | No | No | Monitor |
| **General Support Chat** | Access | No Access | No Access | No Access | Supervise |
| **Support Tickets** | Raise Ticket | View Assigned | View Assigned | View Payment Issues| Full Resolution |
| **System Audit Log** | No Access | No Access | No Access | No Access | **Full Log Access** |

---

## 🛫 4. Student Visa Progression Lifecycle

The client corrected the workflow stages. The pipeline must advance sequentially without overlapping or double-counting:

```text
[ New Student Application ]
          ↓
[ Visa Progress: 15% ]
          ↓
[ Visa Progress: 35% ]
          ↓
[ Visa Progress: 70% ]
          ↓
[ Student Arrival ] (Flight details / arrival confirmation)
          ↓
[ Medical Examination ]
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
> 1. *Remove "Pending Visa" after fees paid.*
> 2. Agents can track progress visually on their dashboard, but **cannot edit** percentages.
> 3. Each student exists in only one stage at a time (e.g. moving from 35% to 70% decrements 35% counter by 1 and increments 70% by 1).

---

## 🆔 5. Agent User ID Generation Standard

The client agreed on a standardized formula to auto-generate unique Agent IDs:

$$\mathbf{[3\text{-Letter Agency Code}]} + \mathbf{[4\text{-Digit Serial Number}]} + \mathbf{[3\text{-Letter Country Code}]}$$

- **Agency Code:** First 3 letters / initials of the Agency Name (e.g., *Global Education Agency* $\rightarrow$ `GEA`).
- **Serial Counter:** Sequential padded number starting at `0001`, `0002`, etc.
- **Country Code:** 3-letter ISO code (e.g., India $\rightarrow$ `IND`, Mauritius $\rightarrow$ `MOU`, Maldives $\rightarrow$ `MLD`).
- **Example Result:** `GEA0001IND`

---

## 📝 6. Agent Onboarding & Form Specification

The registration must follow the physical/digital form provided by QStudy (*Partnership Sub-agent Application Form*) bifurcated into 3 clean stages:

### Step 1: Corporate & Contact Details
- Agency / Company Name
- Business Registration Number
- Registered Official Address & Country
- Person in Charge (PIC) / Contact Person Name & Designation
- Authorized Person to Sign Agreements
- Contact Phone & Official Email

### Step 2: Legal Declarations & Bank Particulars (Mandatory)
- **Declarations:** Family member conflict-of-interest check and accuracy declarations.
- **Bank Information:**
  - Bank Name & Branch Address
  - Beneficiary / Account Holder Name (Company or Individual)
  - Bank Account Number / IBAN
  - SWIFT / BIC Code & Routing / Zip Code

### Step 3: Document Uploads
- Business Registration Certificate
- Company Profile / Brochure
- Passport Copy of Authorized Signatory / Director

### Onboarding Flow:
1. Agent registers or completes invite link.
2. Account Manager assigned by region/country.
3. Verification by Head of Sales $\rightarrow$ Approval by CEO / Head of Admissions.
4. Agreement sent to Agent $\rightarrow$ Agent signs and uploads signed copy.
5. Digital Certificate / E-Certificate issued and uploaded by QStudy.
6. Agent account activated to begin submitting applications.

---

## 🏛️ 7. University & Program Database Migration

The client showcased their existing hosted portal (System QStudy) with comprehensive institutional data:
- **Scope:** 105 Universities, complete program catalogs, degree levels, faculties, tuition fee breakdowns, entry requirements, brochures, awarding bodies, and official URLs.
- **Instruction:** Do **not** rebuild or re-enter manually; **migrate and ingest the existing data directly** into the new Agent Portal database.
- **Granular Permissions:** Super Admin must have a toggle matrix to designate which universities/courses each agent or region is permitted to view (e.g. Malaysian institutions vs. Overseas/Foreign institutions).

---

## 💰 8. Invoicing & Finance Philosophy

The client gave strict guidance on finance simplicity:
- **Do NOT overcomplicate with dummy finance calculations** (e.g., avoid artificial "settled commission vs. pending commission totals" widgets).
- **Core Requirement:** Milestone-driven tracking of the invoice lifecycle:
  1. **Invoice Submission:** Date submitted and invoice document.
  2. **University Payment In:** Date QStudy received payment from the university.
  3. **Maturity / Due Date:** Days until payout is due (e.g., 14-day or 30-day terms).
  4. **Agent Payout:** Date payment released and bank confirmation slip uploaded.

---

## 💬 9. Communication, Tickets & Audit Logs

1. **Dual Chat System:**
   - **Option 1 (Direct AM Chat):** Dedicated direct messaging between the agent and their assigned Account Manager.
   - **Option 2 (General Helpdesk):** Live chat with general support.
2. **Support Ticket System:**
   - Formal ticketing for operational hurdles: login problems, commission queries, document issues, or payment status.
   - Status pipeline: `Open` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`.
   - Automated email notification upon ticket creation and replies.
3. **Audit Log:**
   - Restricted to Super Admin.
   - Records every system modification: action taken, entity affected, user responsible, and exact timestamp.

---

## ⏱️ 10. Project Milestones & Delivery Schedule

| Milestone | Target Date | Status |
| :--- | :--- | :--- |
| **Role Matrix & Architecture Workflow (This Document)** | **Thursday (Today)** | **Ready for Review** |
| **Client Review & Feedback** | **Friday** | Scheduled |
| **Client at Education Expo** | Sunday – Tuesday | Low Availability |
| **Full Platform Core Implementation & Demo** | **Monday** | Committed by Dev Team |
