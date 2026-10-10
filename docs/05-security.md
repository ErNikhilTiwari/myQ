# Security Architecture

This document defines the security boundaries, authentication mechanisms, and tenant isolation strategies for the multi-clinic queue management platform.

## 1. Authentication

### Patient Authentication
- **Passwordless OTP Flow:** Patients log in using their mobile number. An OTP is generated and sent via SMS/WhatsApp.
- **Rate Limiting:** 
  - Max 3 OTP requests per minute per IP/mobile.
  - Max 5 failed verification attempts per 15 minutes.
- **Expiry:** OTPs expire 5 minutes after generation.

### Admin/Staff Authentication
- **Flow:** Secure login via username (or email) and password.
- **MFA:** Optional Multi-Factor Authentication (TOTP) supported for higher security roles.

### JWT Architecture
- **Access Tokens:** Short-lived (e.g., 15-30 minutes). Contains `sub` (userId), `role`, and `clinicId` (tenant context).
- **Refresh Tokens:** Long-lived (e.g., 7-30 days), stored securely (HttpOnly cookies or secure local storage). Revocable in the database.
- **Session Management:** Refresh tokens are tracked in the database to allow remote logout and session invalidation.

---

## 2. Authorization

### RBAC Model
- **Super Admin:** Platform-wide access. Cannot access patient PII without explicit audit logging.
- **Clinic Admin:** Full access to their specific clinic settings, staff, and reports.
- **Receptionist:** Can manage queue, appointments, and announcements for their clinic.
- **Doctor:** Can view their own queue and appointment list.
- **Patient:** Can book appointments, manage their own bookings, and view public queue statuses.

### Enforcement
- **Server-Side Verification:** Every API endpoint enforces authorization server-side using middleware/interceptors.
- **No Client Trust:** The frontend-supplied role or clinic ID is never trusted. Context is extracted strictly from the validated JWT claims.

---

## 3. Tenant Isolation

### Database-Level (Defense in Depth)
- **Foreign Keys:** Every relevant table (`Queues`, `Appointments`, `Announcements`) has a `clinic_id`.
- **Row-Level Security (RLS):** PostgreSQL RLS policies enforce that queries automatically filter by the tenant ID associated with the current database transaction context.

### API-Level
- **Middleware/Interceptor:** A tenant interceptor extracts the `clinicId` from the JWT and injects it into the request context. All service layer methods automatically scope queries to this ID.

### Testing Strategy
- Automated integration tests specifically attempt cross-tenant access (e.g., Admin of Clinic A requesting data of Clinic B). These tests must return `403 Forbidden` or `404 Not Found` and write an audit log entry.

---

## 4. Input Validation & Output Encoding

### Request Validation
- **DTOs:** All incoming requests are validated against strict Data Transfer Objects (DTOs) using libraries like class-validator or Zod. 

### Injection Prevention
- **SQL Injection:** The ORM/Query Builder uses parameterized queries exclusively. Raw SQL is forbidden.
- **XSS Prevention:** All user-generated content (especially TV announcements and patient queue names) is plain text or strictly sanitized. HTML rendering of user input is prohibited on TV viewers and patient pages.

### CSRF Protection
- For any cookie-based sessions, `SameSite=Strict` and Anti-CSRF tokens are enforced. API endpoints primarily rely on Authorization headers.

---

## 5. API Security

### Rate Limiting
- **Public Endpoints:** Strict rate limiting (e.g., public queue lookup, OTP generation).
- **Authenticated Endpoints:** Moderate rate limiting to prevent abuse or scraping.

### Transport Security
- **HTTPS Enforcement:** All traffic must run over TLS 1.2+. HTTP redirects to HTTPS.
- **CORS:** Configured to strictly allow only the specific production domains (e.g., `app.domain.com`, `api.domain.com`).

### Payload Security
- **Size Limits:** Request bodies are strictly limited (e.g., max 2MB for standard payloads) to prevent DoS attacks.
- **File Uploads:** Announcement images or logos are validated by MIME type, file size, and scanned. Metadata is stripped before saving to object storage (S3/GCS).

---

## 6. Payment Security

### Webhook Verification
- All payment webhooks (e.g., Razorpay) verify the `X-Razorpay-Signature` using HMAC-SHA256 with the provider secret.
- **Idempotency:** Webhook processing relies on database transactions and checks order status to prevent duplicate processing.
- **No Frontend Trust:** An appointment is never marked paid based on frontend confirmation. It must be verified server-side.
- **Audit Logging:** Every payment state change is logged.

---

## 7. WhatsApp Webhook Security

### Message Integrity
- Verify the `X-Hub-Signature-256` header (HMAC-SHA256) for all incoming WhatsApp Cloud API webhooks.
### Processing
- **Idempotent Processing:** Webhooks are deduplicated using the WhatsApp message ID.
- **Fast Acknowledgment:** The API responds with `200 OK` immediately, queueing the message for asynchronous processing to prevent timeout retries from Meta.

---

## 8. QR / Public Token Security

### Token Generation
- QR URLs use cryptographically secure pseudo-random identifiers (CSPRNG), e.g., `/queue/qtk_abc123xyz`.
- **No Predictability:** Sequential IDs (like `/queue/1`) are strictly prohibited to prevent enumeration.

### Privacy
- **Information Minimization:** The public queue page shows only token number, position, and ETA. No patient names, phone numbers, or PII are exposed.
- **Abuse Protection:** Public token lookup endpoints are aggressively rate-limited.

---

## 9. Display Token Security

### TV Viewer Auth
- TV Viewers authenticate using a `displayToken`.
- **Scope:** Tokens are read-only, scoped strictly to a single clinic, and optionally to specific queues or doctors.
- **Revocation:** Display tokens are rotatable. A leaked token can be instantly revoked from the admin dashboard without affecting other TVs.
- **No PII:** The display API explicitly strips all patient PII from the payload.

---

## 10. Secret Management

### Architecture
- **Environment Variables:** All secrets (DB credentials, API keys, JWT secrets, webhook secrets) are passed via environment variables.
- **No Commits:** Secrets are never committed to version control.
- **`.env.example`:** Only a template file with placeholder values is committed.
- **Key Rotation:** JWT signing keys and API keys have a defined rotation strategy.

---

## 11. Audit Logging

### What Gets Logged
- Authentication events (login, logout, failed attempts).
- All sensitive admin actions (clinic settings changes, role changes).
- Data state changes (appointment cancellations, payment refunds).
- Announcement creation, modification, or emergency takeovers.

### Format and Retention
- Logs are structured in JSON format (e.g., `timestamp`, `actor_id`, `action`, `resource_id`, `ip_address`).
- **PII Masking:** Patient PII is masked or omitted in audit logs.
- **Retention:** Logs are retained for a minimum of 90 days (configurable based on compliance needs).

---

## 12. Security Checklist (Pre-Deployment M13)

- [ ] All API endpoints enforce tenant isolation (verified by automated tests).
- [ ] No sequential IDs exposed in URLs (UUIDs or secure random tokens used).
- [ ] Webhook signatures (Razorpay, WhatsApp) are strictly verified.
- [ ] Rate limiters are active on public, auth, and webhook endpoints.
- [ ] Display and QR tokens strip all patient PII.
- [ ] RLS policies are active on PostgreSQL tables.
- [ ] Secrets injected via environment, confirmed not in repository.
- [ ] XSS protections validated on TV Viewer and Patient modes.
- [ ] Payments require server-side validation, discarding frontend status.
- [ ] Audit logging captures all administrative and announcement actions.
