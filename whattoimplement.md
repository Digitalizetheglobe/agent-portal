# 🌍 QStudy Agent Portal — Detailed Product Documentation

A comprehensive digital platform designed to empower external education agents, expand student reach, and efficiently fill seats across QStudy seminars, expos, and admission events worldwide.

---

# 📌 1. Introduction

## 1.1 Purpose of This Document

This document provides a **complete breakdown of the QStudy Agent Portal**, including:

* Business goals
* System architecture (conceptual)
* Feature-level explanations
* Agent and Admin workflows
* Functional modules
* Implementation roadmap

It serves as a **single source of truth** for:

* Product managers
* Developers
* Designers
* Stakeholders

---

## 1.2 What Is the QStudy Agent Portal?

The **QStudy Agent Portal** is a centralized digital platform that connects:

👉 **QStudy (Organization)**
👉 **External Education Agents**
👉 **Prospective Students**

It allows agents to:

* Discover upcoming events (seminars, expos)
* Register students
* Upload documents
* Track progress in real-time
* Raise invoices
* Communicate with support

All operations are handled within a **single unified system**, eliminating manual workflows like spreadsheets, emails, and scattered tools.

---

## 1.3 Problem Statement

Currently, QStudy faces:

* ❌ Unfilled seats in events
* ❌ Limited reach using only internal marketing
* ❌ Fragmented student tracking systems
* ❌ Manual invoice and communication processes

---

## 1.4 Solution

The Agent Portal solves these by:

* Leveraging **external agent networks**
* Providing **real-time visibility**
* Automating workflows
* Centralizing all operations

---

# 🎯 2. Core Objectives

## 2.1 Business Goals

* Maximize event attendance
* Expand global reach
* Increase student conversions
* Improve operational efficiency

---

## 2.2 Platform Goals

* Provide a seamless agent experience
* Ensure data accuracy & validation
* Enable real-time tracking
* Deliver actionable analytics

---

# 🔄 3. End-to-End Workflow

## 3.1 High-Level Flow

1. QStudy creates events
2. Agents view events
3. Agents collect student leads
4. Agents register students
5. QStudy processes & updates status
6. Students attend events
7. Conversion to applications
8. Agents raise invoices

---

## 3.2 Key Workflow Characteristics

* Fully transparent
* Real-time updates
* Data-driven
* Traceable at every stage

---

# 🧩 4. System Modules (Detailed)

---

## 🔐 4.1 Module 1: Agent Authentication & Profile

### Purpose

To securely manage agent access and maintain verified agent data.

### Features

#### 1. Secure Login

* Email + password authentication
* Session management
* Token-based authentication (recommended: JWT)

#### 2. Profile Management

Agents can manage:

* Name
* Agency details
* Contact information
* Address

#### 3. Verification System

* Document submission
* Admin approval required
* Status:

  * Pending
  * Verified
  * Rejected

---

## 📅 4.2 Module 2: Event Listings

### Purpose

Provide agents with real-time access to all QStudy events.

### Features

* Event title & description
* Date & time
* Location (Physical / Virtual)
* Participating universities
* Seat availability (dynamic)

### Behavior

* Events update in real-time
* Agents see only **active events**
* Filtering & search recommended

---

## 📝 4.3 Module 3: Student Registration

### Purpose

Capture student data in a structured and validated format.

### Data Fields

* Full Name (as per ID)
* Email & Phone
* Preferred Country
* Course Interest
* Education Qualification
* Current City

### Key Features

* Input validation
* Duplicate prevention
* Event linking
* Agent attribution

---

## 📊 4.4 Module 4: Student Status Tracking

### Purpose

Track the student journey from registration to conversion.

### Status Pipeline

| Stage      | Description                  |
| ---------- | ---------------------------- |
| Registered | Student added                |
| Contacted  | QStudy reached out           |
| Confirmed  | Student confirmed attendance |
| Attended   | Participated in event        |
| Converted  | Applied to university        |

### Benefits

* Transparency
* Accountability
* Better follow-ups

---

## 🎟️ 4.5 Module 5: Seat Allocation

### Purpose

Prevent overbooking and optimize event capacity.

### Features

* Real-time seat count
* Automatic reduction on registration
* Capacity limits per event

---

## 🔔 4.6 Module 6: Notifications System

### Purpose

Keep agents informed and engaged.

### Types of Notifications

* New event announcements
* Seat availability alerts
* Student status updates

### Channels

* Email
* SMS
* In-app notifications

---

## 📂 4.7 Module 7: Document Management

### Purpose

Centralized document collection for faster processing.

### Supported Documents

* Passport
* Academic transcripts
* IELTS/TOEFL scores
* Additional documents

### Features

* Secure upload
* File validation
* Admin verification

---

## 💰 4.8 Module 8: Invoice Management

### Purpose

Streamline commission and payment processes.

### Workflow

1. Agent creates invoice
2. Admin verifies data
3. Approval/rejection
4. Payment processing

### Features

* Event-based invoicing
* Student count tracking
* Status tracking

---

## 🛠️ 4.9 Module 9: Support Ticket System

### Purpose

Provide structured issue resolution.

### Ticket Categories

* Technical
* Student-related
* Payment
* Other

### Lifecycle

Open → In Progress → Resolved → Closed

---

## ⚙️ 4.10 Module 10: Settings

### Features

* Profile updates
* Password change
* Notification preferences
* Payment configuration

---

## 📈 4.11 Module 11: Agent Performance Dashboard

### Metrics

* Total registrations
* Confirmed attendees
* Event participation
* Conversions

### Benefits

* Performance tracking
* Motivation for agents
* Data-driven improvements

---

# 🛡️ 5. Admin Panel (Detailed)

---

## 📊 5.1 Dashboard

### Overview Metrics

* Total agents
* Active vs inactive agents
* Student registrations
* Event occupancy
* Pending invoices

---

## 👥 5.2 Agent Management

### Capabilities

* Add / verify agents
* Activate / deactivate
* Assign events
* Monitor performance

---

## 🎤 5.3 Event Management

* Create events
* Edit event details
* Set seat capacity
* Assign agents
* Send notifications

---

## 🎓 5.4 Student Management

* View all students
* Update status
* Verify documents
* Track attendance

---

## 🔍 5.5 Agent Monitoring

* Activity logs
* Registration trends
* Conversion rates

---

## 💳 5.6 Invoice Management

* Review invoices
* Approve/reject
* Update payment status
* Maintain records

---

## 🎫 5.7 Ticket Management

* View all tickets
* Assign tickets
* Respond and resolve

---

## 📊 5.8 Reports & Analytics

### Reports Include:

* Agent performance
* Event success rate
* Student trends
* Revenue tracking

---

# 🚀 6. Key Benefits

## 6.1 For QStudy

* Increased reach
* Better seat utilization
* Full visibility
* Scalable operations

---

## 6.2 For Agents

* Easy student management
* Real-time updates
* Transparent earnings
* Better communication

---

# 🏗️ 7. Suggested Technical Architecture (High-Level)

## Frontend

* React / Next.js

## Backend

* Node.js / Express

## Database

* PostgreSQL

## Storage

* Cloudinary / S3

## Notifications

* Email (SMTP)
* SMS API

## Authentication

* JWT-based auth

---

# 🏁 8. Development Roadmap

## Phase 1: Design & Planning

* Requirements finalization
* UI/UX design
* Architecture planning

---

## Phase 2: Development

* Core modules development
* API creation
* Frontend integration

---

## Phase 3: Testing & Launch

* UAT testing
* Bug fixes
* Deployment

---

# ✅ 9. Conclusion

The **QStudy Agent Portal** is a scalable, data-driven platform that transforms how QStudy collaborates with agents.

It enables:

* Efficient event management
* Seamless student tracking
* Transparent agent operations
* Real-time decision-making

This system lays the foundation for **long-term growth, automation, and global expansion**.

---

# 🔍 10. Audit Gaps & Implementation Action Plan (QStudy Meeting Alignment)

Based on the strategic review with QStudy Leadership documented in `meeting_audit_qstudy.md`, the platform workflow requires immediate realignment with real-world Malaysian international education operations (EMGS), role restructuring, and removal of misleading dummy metrics.

---

## ➕ 10.1 What We Have to ADD (New Requirements)

1. **New Visa Pipeline Stage: `Medical Examination`** *(done)*
   - **Current State:** Pipeline jumped directly from `Arrival` $\rightarrow$ `University Registration`.
   - **Requirement:** Under Malaysian EMGS regulations, all arriving international students must complete a mandatory post-arrival medical examination within 7 days of landing.
   - **Action:** Insert `Medical Examination` between `Student Arrival` and `University Registration`.

2. **Standardized Agent User ID Auto-Generator**
   - **Current State:** System used arbitrary UUIDs or certificate format strings (`QS-AGT-2026-XXXX`).
   - **Requirement:** Client mandated a strict, predictable auto-generation formula for unique Agent IDs:
     $$\mathbf{[3\text{-Letter Agency Code}]} + \mathbf{[4\text{-Digit Serial Number}]} + \mathbf{[3\text{-Letter Country Code}]}$$
     *(e.g., Global Education Agency in India $\rightarrow$ `GEA0001IND`).*
   - **Action:** Implement an auto-generation utility upon agent onboarding approval based on agency initials, sequential serial count, and ISO 3166-1 alpha-3 country code.

3. **Dual Chat System (Dedicated AM Direct Chat vs. General Helpdesk)**
   - **Current State:** Single pooled chat room per agent where any internal staff member can reply.
   - **Requirement:** Provide two distinct communication pathways:
     - **Option 1 (Direct AM Chat):** Dedicated 1-on-1 direct channel between the agent and their assigned Account Manager.
     - **Option 2 (General Helpdesk):** Live operational chat with QStudy central support.

4. **University Visibility Rights Matrix (Super Admin Control)**
   - **Current State:** All active universities and courses are globally visible to every approved agent.
   - **Requirement:** Super Admin must have a toggle matrix designating which universities and programs each agent or geographical region is permitted to view (e.g., granting access to Malaysian universities vs. Overseas/Foreign partner institutions).

5. **Invoice Due Dates & Payment Term Maturity Tracking**
   - **Current State:** Records only when an invoice is submitted and when university payment arrives.
   - **Requirement:** Add maturity tracking for payout terms (e.g., 14-day or 30-day term from the date QStudy receives payment from the university) displaying "Days Until Due".

6. **Arrival Flight Details & Travel Documentation** *(done)*
   - **Current State:** Captures only minimal arrival date text.
   - **Requirement:** Capture full flight arrival logistics (flight number, date, arrival time, airport) and uploaded arrival confirmation / ticket proof.

7. **105 Universities Migration Script / Tool**
   - **Requirement:** Ingest and migrate the existing 105 university profiles, faculties, degree levels, and program catalogs directly from System QStudy into the Agent Portal database.

---

## 🔄 10.2 What We Need to UPDATE (Logic & Workflow Realignment)

1. **Student Visa Progression Sequence & Commission Unlock Gate** *(done)*
   - **Current State:** `Visa 100%` occurred before tuition fees proof was uploaded, leading to an ambiguous "Pending Fees" state.
   - **Requirement:** EMGS issues final passport endorsement stickers (**Visa 100%**) only *after* tuition fees are settled and university registration is verified.
   - **Corrected Pipeline:**
     $$\text{Application} \rightarrow \text{Visa 15\%} \rightarrow \text{Visa 35\%} \rightarrow \text{Visa 70\%} \rightarrow \text{Student Arrival} \rightarrow \mathbf{Medical\ Exam} \rightarrow \text{Univ\ Reg} \rightarrow \mathbf{Fees\ Paid} \rightarrow \mathbf{Visa\ 100\%} \rightarrow \mathbf{Commission\ Unlocked}$$

2. **Core 5-Role Hierarchy & Access Re-mapping**
   - **Current State:** Mixed staff roles (`account_manager`, `head_recruitment`, `head_admission`, `accounts`, `super_admin`).
   - **Requirement:** Re-align strictly with the 5 core tiers confirmed by QStudy:
     1. **Agent (External):** Registers, submits students, uploads documents, **view-only** visa progress, submits invoices once unlocked.
     2. **Account Manager (Internal Sales):** Assigned SPOC for agents/regions, first reviewer of student files, 1-on-1 direct chat.
     3. **Admission Manager (Internal Operations):** Verifies applications, **sole authority** to update visa pipeline ($15\% \rightarrow 100\%$), approves fee proof, manages university catalogs.
     4. **Finance / Accounts Department (Internal):** Records university payment receipt, tracks payment due dates, releases commission to agent bank accounts with payment slip.
     5. **Super Admin (CEO / Leadership):** Full dashboard oversight, user management & assignments, **University Visibility Rights**, and **System Audit Log**.

3. **3-Stage Agent Registration & Onboarding Form**
   - **Update:** Restructure the onboarding stepper to mirror the official *Partnership Sub-agent Application Form*:
     - **Step 1: Corporate & Contact Details:** Agency name, business registration number, registered official address, country, PIC name & designation, authorized signatory, phone, and official email.
     - **Step 2: Legal Declarations & Bank Particulars:** Family conflict-of-interest check, accuracy declarations, Bank Name, branch address, beneficiary name, Account Number / IBAN, SWIFT / BIC, and routing code.
     - **Step 3: Document Uploads:** Business Registration Certificate, Company Profile / Brochure, Passport copy of Authorized Signatory.

4. **Audit Log Access Restriction**
   - **Update:** Restrict audit log browsing exclusively to **Super Admin** (removing access from operational managers).

5. **Strict Single-Stage Counter Integrity**
   - **Update:** Dashboard counters must strictly increment/decrement so an application exists in only one stage at any time without double-counting.

---

## ❌ 10.3 What We Have to REMOVE (Obsolete Concepts & Client Redlines)

1. **Remove Dummy Financial Metrics & Speculative Forecasts**
   - **Client Mandate:** *"Do NOT overcomplicate with dummy finance calculations (e.g., avoid artificial 'settled commission vs. pending commission totals' widgets)."*
   - **Action:** Remove speculative projection widgets, estimated future earnings, and artificial totals. Keep finance milestone-driven: Invoices Submitted $\rightarrow$ University Payment In $\rightarrow$ Due Date $\rightarrow$ Released/Settled (with payment slip).

2. **Remove "Pending Visa" State After Fees Paid**
   - **Client Mandate:** Explicit instruction to remove "Pending Visa" after fees are verified. Once fees are accepted, the application advances directly toward final Visa 100% endorsement.

3. **Remove Agent-Level Commission Rates**
   - Commission is defined on the university/program level, never on an individual agent's profile. Purge any legacy agent-level commission fields.

4. **Decommission Legacy Event / Seminar / Expo Code**
   - Purge any remaining database schemas, routes, or UI components related to the earlier event seat-booking and campus visit concepts.

5. **Remove Agent Edit Permissions on Visa Pipeline**
   - Agents have **zero edit rights** over visa percentages. Ensure frontend percentage sliders/pickers are entirely disabled/view-only for external agents.

---

## 📊 10.4 Confirmed Role & Feature Access Matrix

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
