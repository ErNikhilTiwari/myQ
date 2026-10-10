# API Specification

This document details the complete API surface for the multi-clinic queue management platform.

## 1. Standard Formats

### 1.1 Standard Response Envelope
All API responses follow a consistent envelope format:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "requestId": "req-12345",
    "timestamp": "2026-10-10T18:30:00Z"
  }
}
```

### 1.2 Standard Error Format
When `success` is `false`, `data` is `null` and `error` contains details:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "The requested time slot is no longer available.",
    "details": [
      { "field": "timeSlot", "issue": "ALREADY_BOOKED" }
    ]
  },
  "meta": {
    "requestId": "req-12345",
    "timestamp": "2026-10-10T18:30:00Z"
  }
}
```

### 1.3 Pagination Format
Paginated endpoints include pagination info in `meta`:
```json
{
  "success": true,
  "data": [ ... ],
  "error": null,
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

### 1.4 WebSocket Message Format (STOMP)
WebSocket frames use STOMP. Payload format:
```json
{
  "event": "QUEUE_CALLED",
  "topic": "/topic/clinics/cl-123/queues/q-456",
  "timestamp": "2026-10-10T18:30:00Z",
  "payload": {
    "tokenId": "tok-789",
    "tokenNumber": "A-31",
    "status": "CALLED",
    "roomId": "rm-12"
  },
  "version": 42
}
```

---

## 2. Authentication Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/auth/send-otp` | None | Send OTP to mobile number |
| POST | `/api/auth/verify-otp` | None | Verify OTP and return tokens |
| POST | `/api/auth/refresh` | None (Refresh Token) | Refresh JWT access token |
| POST | `/api/auth/logout` | Any | Invalidate current token session |

### `POST /api/auth/send-otp`
- **Body:** `{ "mobile": "string" }`
- **Response:** `{ "success": true, "data": { "message": "OTP sent" } }`
- **Rate Limit:** 3 per minute per IP/mobile

### `POST /api/auth/verify-otp`
- **Body:** `{ "mobile": "string", "otp": "string" }`
- **Response:** `{ "accessToken": "string", "refreshToken": "string", "user": UserDTO }`
- **Rate Limit:** 5 failed attempts per 15 minutes

---

## 3. Clinics (Public + Admin)

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/clinics` | None | Search clinics (filters: query, lat, lng, radius) |
| GET | `/api/clinics/{clinicId}` | None | Get public clinic profile |
| POST | `/api/super/clinics` | Super Admin | Create new clinic tenant |
| PUT | `/api/super/clinics/{clinicId}` | Super Admin | Update clinic tenant settings |

*(Note: Super Admin endpoints are strictly isolated. All operations log to audit.)*

---

## 4. Doctors & Services

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/clinics/{clinicId}/doctors` | None | List doctors for a clinic |
| GET | `/api/clinics/{clinicId}/services`| None | List services for a clinic |

**Admin CRUD (`/api/admin/doctors` and `/api/admin/services`):**
- **Auth:** Clinic Admin / Receptionist
- **Tenant Scoping:** All operations strictly scoped to the caller's JWT `clinicId` claim.

---

## 5. Appointments

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/appointments` | Patient | Book an appointment (fail-closed slot check) |
| GET | `/api/appointments/{id}` | Patient / Admin | Get appointment details |
| PUT | `/api/appointments/{id}/reschedule`| Patient / Admin | Reschedule appointment |
| POST | `/api/appointments/{id}/cancel` | Patient / Admin | Cancel appointment |
| POST | `/api/appointments/{id}/confirm-arrival`| Admin | Convert appointment to active queue token |
| GET | `/api/clinics/{clinicId}/appointments`| Admin | List today's/upcoming appointments |

---

## 6. Queue Management

### Public Access
| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/queue/{publicToken}` | None | Get real-time status of a token (no PII) |
| GET | `/api/queue/lookup` | None | Look up token by number and clinic ID |

### Admin Controls
*Auth required: Clinic Admin / Receptionist. Scoped to clinic.*
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/queue/next` | Atomic call next token |
| POST | `/api/admin/queue/{id}/skip` | Skip token (WA waiting -> skipped) |
| POST | `/api/admin/queue/{id}/recall` | Recall skipped token (Skipped -> called) |
| POST | `/api/admin/queue/{id}/hold` | Put token ON_HOLD with reason |
| POST | `/api/admin/queue/{id}/cancel` | Cancel token entirely |
| POST | `/api/admin/queue/{id}/complete` | Mark token completed |
| POST | `/api/admin/queue/pause` | Pause entire queue |
| POST | `/api/admin/queue/resume` | Resume paused queue |
| POST | `/api/admin/queue/emergency` | Insert emergency priority token |
| POST | `/api/admin/queue/{id}/move` | Manually reorder a token |
| GET | `/api/admin/queue/today` | Dashboard snapshot of today's queue |

---

## 7. Payments

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/payments/create-order` | Patient | Create payment order (e.g. Razorpay) |
| POST | `/api/payments/verify` | Patient | Frontend verification trigger |
| POST | `/api/webhooks/razorpay` | None | Server-side webhook (Requires Signature) |
| GET | `/api/admin/payments` | Admin | List payments (clinic scoped) |

*Security Note: Webhook signature is verified via `X-Razorpay-Signature`. Idempotency enforced via DB transaction.*

---

## 8. Announcements

*From Section 51.10*

### Admin (Authenticated, clinic-scoped)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/announcements` | List announcements |
| POST | `/api/admin/announcements` | Create announcement |
| GET | `/api/admin/announcements/{id}` | Get announcement |
| PUT | `/api/admin/announcements/{id}` | Update announcement |
| POST | `/api/admin/announcements/{id}/pause`| Pause announcement |
| POST | `/api/admin/announcements/{id}/resume`| Resume announcement |
| POST | `/api/admin/announcements/{id}/archive`| Archive announcement |
| POST | `/api/admin/announcements/{id}/duplicate`| Duplicate announcement |
| POST | `/api/admin/announcements/test-callout`| Send test TTS call-out |
| GET | `/api/admin/announcement-templates`| Get clinic & system templates |
| GET | `/api/admin/settings/callout` | Get TTS / Voice settings |
| PUT | `/api/admin/settings/callout` | Update TTS settings |

### Super Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/super/announcements` | List platform-wide announcements |
| POST | `/api/super/announcements` | Create platform-wide announcements |

---

## 9. Viewer / Display

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/viewer/{displayToken}/snapshot`| Display Token | Get active queue + announcements snapshot |
| GET | `/api/viewer/{displayToken}/events` | Display Token | Server-Sent Events (SSE) connection |

*WebSocket Endpoint:* `/ws` (Connect via STOMP, authenticate via `{displayToken}` in headers).

---

## 10. WhatsApp

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/webhooks/whatsapp` | None | Incoming WA messages (verify `X-Hub-Signature-256`) |
| GET | `/api/webhooks/whatsapp` | None | WA Verification challenge endpoint |
| GET | `/api/admin/whatsapp/status`| Admin | Check clinic's WA integration status |

---

## 11. Advertisements

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/ads/{placement}` | None | Get active ad for placement (e.g. `TV_VIEWER_BOTTOM`) |
| POST | `/api/ads/{id}/impression` | None | Record ad impression |
| POST | `/api/ads/{id}/click` | None | Record ad click |

*Admin CRUD:* Super Admin endpoints for campaigns at `/api/super/ads`.

---

## 12. Reports

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/admin/reports/daily` | Admin | Get daily clinic stats |
| GET | `/api/admin/reports/monthly`| Admin | Get monthly clinic stats |
| GET | `/api/admin/reports/export` | Admin | Export PDF/Excel report |

---

## 13. Admin Management
Includes CRUD for:
- **Patients:** `/api/admin/patients`
- **Staff:** `/api/admin/staff`
- **Settings:** `/api/admin/settings`
- **Displays:** `/api/admin/displays`
- **Audit Logs:** `/api/admin/audit-logs`

---

## 14. Super Admin
Includes CRUD for:
- Platform Settings: `/api/super/settings`
- Clinics Management: `/api/super/clinics`
- Platform Reports: `/api/super/reports`

---

## 15. Utility

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/health` | None | Liveness/Readiness probe |
| GET | `/api/config` | None | Public app configuration (e.g. features, versions) |
