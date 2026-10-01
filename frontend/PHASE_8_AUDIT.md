# Phase 8 — Student Verification & Documents — Audit Report

Generated: 2026-10-01 | Backend: Frozen (Phases A-H Complete)

---

## 8.1 Student Verification Model

**File:** `backend/models/Student.js` (lines 69-91)

| Field | Type | Default | Nullable |
|---|---|---|---|
| `verificationStatus` | `ENUM('Pending','UnderReview','Verified','Rejected')` | `'Pending'` | No |
| `verifiedAt` | `DATE` | `null` | Yes |
| `verifiedBy` | `UUID` | `null` | Yes |
| `verificationHistory` | `JSONB` (array) | `[]` | No |
| `verificationRejectionReason` | `TEXT` | `null` | Yes |

### verificationHistory Entry Shape
```json
{
  "action": "VERIFICATION_STARTED | VERIFICATION_APPROVED | VERIFICATION_REJECTED",
  "from": "Pending | UnderReview | Verified | Rejected",
  "to": "Pending | UnderReview | Verified | Rejected",
  "reason": "string | null",
  "changedBy": "UUID (admin id)",
  "changedAt": "ISO datetime string"
}
```

---

## 8.2 Document Model / Storage

**Location:** `Student.documents` — JSONB array stored on the Student record. No separate table.

### Document Object Shape
```json
{
  "id": "uuid-v4",
  "_id": "uuid-v4",
  "storagePath": "students/<studentId>/timestamp-filename.ext",
  "originalFilename": "passport.pdf",
  "contentType": "application/pdf",
  "size": 102400,
  "category": "Passport | Transcript | LanguageTest | Other",
  "status": "pending | approved | rejected",
  "uploadedAt": "ISO datetime string",
  "verifiedBy": "UUID (admin id)",
  "verifiedAt": "ISO datetime string",
  "remarks": "string (set on rejection)"
}
```

---

## 8.3 Verification Endpoints

| Capability | Endpoint | Method | Role | Exists |
|---|---|---|---|---|
| Verification queue | `GET /api/students/verification/queue` | GET | Admin only | YES |
| Student verification detail | `GET /api/students/:id/verification` | GET | Admin or own Agent | YES |
| Initiate (Pending?UnderReview) | `PATCH /api/students/:id/verification/initiate` | PATCH | Admin only | YES |
| Verify (UnderReview?Verified) | `PATCH /api/students/:id/verification/verify` | PATCH | Admin only | YES |
| Reject (UnderReview?Rejected) | `PATCH /api/students/:id/verification/reject` | PATCH | Admin only | YES |
| Verification history | `GET /api/students/:id/verification/history` | GET | Admin or own Agent | YES |

Queue query params: status, search, page, limit, envelope=true

---

## 8.4 Document Endpoints

| Capability | Endpoint | Method | Role | Exists |
|---|---|---|---|---|
| Upload | `POST /api/students/:id/documents` | POST multipart | Admin or own Agent | YES |
| View/Download | `GET /api/students/:id/documents/:docId` | GET | Admin or own Agent | YES |
| Verify document | `PATCH /api/students/:id/documents/:docId/verify` | PATCH | Admin only | YES |
| Request (notify agent) | `POST /api/students/:id/documents/request` | POST | Admin only | YES |
| Replace document | — | — | — | NOT EXISTS |
| Delete document | — | — | — | NOT EXISTS |

---

## 8.5 Roles

| Action | Admin | Agent |
|---|---|---|
| View verification queue | YES | NO (403) |
| View own student verification detail | YES | YES |
| Initiate / Verify / Reject verification | YES | NO (403) |
| View verification history | YES | YES (own only) |
| Upload documents | YES | YES (own only) |
| View/download documents | YES | YES (own only) |
| Verify/reject documents | YES | NO (403) |

---

## 8.6 State Machine

```
Pending --initiate--? UnderReview --verify--? Verified (terminal)
   ?                        ¦
   ¦                        +--reject--? Rejected
   +--------initiate--------------------------+
```

Allowed transitions (backend enforced):
- Pending ? UnderReview (initiate)
- UnderReview ? Verified (verify)
- UnderReview ? Rejected (reject, reason required)
- Rejected ? UnderReview (initiate, re-open)

---

## 8.7 Frontend Integration Points

### Already Complete (No Changes Required)
- `api.js` — `studentVerificationAPI` (getQueue, getByStudentId, getHistory, initiate, verify, reject)
- `api.js` — `studentAPI` document methods
- `constants/status.js` — `STUDENT_VERIFICATION_STATUS*` constants
- `DataContext.js` — fetchVerificationQueue, initiateStudentVerification, verifyStudent, rejectStudent
- `StudentDetailsPage.jsx` — Full verification card, document panel, history, rejection modal
- `StudentRejectionModal.jsx` — Reason-required modal

### Missing (Must Be Created)
1. `AdminStudentVerificationPage.jsx` — Dedicated admin queue page
2. Route in `App.js`: `/admin/verification`
3. Sidebar nav link: "Verification" (admin only)

---

## 8.8 Backend Gaps

None. All required endpoints exist and are functioning.

Deferred (backend does not support):
- Document deletion — no endpoint exists
- Document replacement — no endpoint exists

---

## 8.9 Phase 8 Implementation Scope

Phase 8 is ~85% implemented from prior phases. Only missing:
1. Dedicated Verification Queue page for admin
2. Route registration
3. Sidebar nav link
