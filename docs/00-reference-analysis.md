# Phase 0 / M0 — Reference Repository Analysis

> **Status:** Draft — awaiting founder approval before proceeding to M1.
> **Date:** 2026-10-10
> **Analysed by:** Read-only GitHub review (no repos were cloned or executed).

---

## 1. Repository Summaries

### Repo 1 — FQM (Free Queue Manager)

| Attribute | Detail |
|---|---|
| **Confirmed URL** | [mrf345/FQM](https://github.com/mrf345/FQM) (confirmed via [fqms.github.io](https://github.com/fqms/fqms.github.io) links) |
| **Stack** | Python 3 / Flask, SQLAlchemy (SQLite default), Bootstrap + jQuery, server-rendered HTML |
| **License** | **MPL-2.0** (Mozilla Public License 2.0) — file-level copyleft |
| **Maturity** | Mature single-developer project with many releases and real-world deployment. Feature-rich but architecturally dated (polling, single-tenant, no API layer). |
| **Activity** | Low recent activity; project appears in maintenance/archive mode. |
| **Deployment** | Docker or standalone Python executable; historically shipped as a downloadable desktop app. |
| **Database** | SQLAlchemy ORM over SQLite (single-file DB). |
| **Real-time** | Client-side jQuery polling (`strict_pulling` setting) — no WebSocket/SSE. |

**License implications for our commercial SaaS:**
- MPL-2.0 is file-level copyleft. If we were to copy and modify *specific FQM source files*, those files must remain MPL-licensed.
- However, since (a) we are building a SaaS (not distributing binaries) and (b) we are implementing ideas from scratch in a completely different architecture (React + Spring Boot/Node), there is **no copyleft obligation**.
- **Decision: Inspiration only. Do NOT copy any FQM source code.** Take ideas, UX patterns, and lessons learned.

---

### Repo 2 — RAG-GoogleCalender-Chatbot

| Attribute | Detail |
|---|---|
| **URL** | [RaghavO222/RAG-GoogleCalender-Chatbot](https://github.com/RaghavO222/RAG-GoogleCalender-Chatbot) |
| **Stack** | Python / FastAPI, Google Gemini (LLM), Qdrant (vector DB), Google Calendar API, Telegram Bot API + basic web chat |
| **License** | **MISSING** — no LICENSE file. All rights reserved by default. |
| **Maturity** | Very early-stage: ~3 commits, single author, no tests, no CI. Proof-of-concept quality. |
| **Activity** | Minimal. |
| **Messaging** | **Telegram** and web chat — **NOT WhatsApp**. Does not use the WhatsApp Business API or any unofficial WhatsApp library. |

**License implications:**
- No license = all rights reserved. We **cannot** copy any code.
- **Decision: Inspiration only.** Adopt architectural patterns (intent routing, orchestrator pattern, RAG for FAQ, fail-closed booking) but implement everything from scratch using the official WhatsApp Business Platform API.

---

### Repo 3 — QueueLess

| Attribute | Detail |
|---|---|
| **URL** | [harman-04/QueueLess](https://github.com/harman-04/QueueLess) |
| **Stack** | Java 17+ / Spring Boot, React + Redux, MongoDB, Redis (caching), STOMP WebSockets, Razorpay, Firebase Cloud Messaging, Prometheus + Grafana + Loki, Docker Compose |
| **License** | **Apache-2.0** — permissive; verified in LICENSE file |
| **Maturity** | Early-stage: ~42 commits, 2 stars, single author, partial backend tests, no frontend tests. |
| **Activity** | Recent but single-developer project. |

**License implications:**
- Apache-2.0 is permissive. We *could* use and modify code with attribution (copyright notice + state changes).
- However, the code uses MongoDB (we use PostgreSQL), has no tenant isolation, and has critical security flaws (unverified payments, race conditions). Adapting it would cost more than writing clean code.
- **Decision: Inspiration only.** Take data model ideas, WebSocket topic design, role annotations, analytics/export patterns, and audit-log approach. Implement from scratch in our own architecture.

---

## 2. Feature Adoption Table

| Feature | Seen In | Adopt / Adapt / Skip | Reason | Effort |
|---|---|---|---|---|
| **Queue token state machine** (Waiting → Called → In Service → Completed + skip/cancel/no-show) | Repo 1 (Serial.status), Repo 3 (QueueToken.status) | **Adapt** | Both have basic states. Our state machine (Section 48) is more complete with `BOOKED`, `CALLED`, `SKIPPED→CALLED` recall. Implement our own. | Low |
| **Counter/room assignment** (Office model) | Repo 1 | **Adapt** | FQM's Office→Operator→Serial mapping is a good conceptual model. Map to our Queue→Doctor→Room. | Low |
| **TTS / voice call-outs** (Web Speech API) | Repo 1 | **Adopt** | Browser built-in speech synthesis (free, no server cost). Add chime, repeat logic, language config, call-out queue, and autoplay-permission handling. | Medium |
| **Display screen configuration** (fonts, colors, sizes, backgrounds) | Repo 1 (Display_store model) | **Adapt** | FQM has extensive display customization. Take the concept but simplify for MVP (theme, font size, logo, language). | Medium |
| **POS ticket printing** | Repo 1 | **Skip (Phase 2/3)** | Not MVP. Requires hardware integration (ESC/POS). Note for future. | — |
| **Touch-screen kiosk** | Repo 1 | **Skip (Phase 2/3)** | Not MVP. Interesting for large hospitals later. | — |
| **Put on hold / recall** | Repo 1 | **Adopt** | Maps directly to our `SKIPPED→CALLED` transition. Essential for real-world use. | Low |
| **Polling-based real-time** | Repo 1 | **Skip** | Too expensive at scale. Use WebSocket with polling *fallback* only. | — |
| **Structured JSON intent routing** (LLM classifies into CHAT/BOOK/DELETE/RAG) | Repo 2 | **Adopt (Phase 2/3)** | Excellent pattern for optional AI chatbot layer. MVP bot will be deterministic (menus/buttons). | Low (design now) |
| **Router → Orchestrator → Handler pattern** | Repo 2 | **Adopt (Phase 2/3)** | Clean separation of NLU from business logic. | Low (design now) |
| **RAG for FAQ** (clinic timings, services, preparation instructions) | Repo 2 | **Adopt (Phase 2/3)** | Good for answering common patient questions per-clinic without hard-coding. Scope per tenant. | Medium |
| **Fail-closed slot check** (errors = unavailable) | Repo 2 | **Adopt** | Critical safety pattern. On any error checking availability, treat slot as unavailable. Prevents double-booking. | Low |
| **Session-keyed conversation history** | Repo 2 | **Adapt** | Good concept (session_id abstraction), but store in DB with expiry, not flat files. | Low |
| **Google Calendar as source of truth** | Repo 2 | **Skip** | Our database is the source of truth for appointments. Calendar sync is optional Phase 2/3 export. | — |
| **Flat-file history storage** | Repo 2 | **Skip** | Not thread-safe, not scalable. Use database. | — |
| **Emergency tokens with approval flow** | Repo 3 | **Adapt** | Good concept (pending → approved → WAITING). Add audit logging and permission checks. | Medium |
| **Group tokens** (groupSize, groupMembers) | Repo 3 | **Skip (Phase 2)** | Not needed for clinic MVP. Useful for labs/diagnostics later. | — |
| **STOMP WebSocket topics** per queue | Repo 3 | **Adopt** | `/topic/clinics/{clinicId}/queues/{queueId}` pattern. Add display-specific topics. Use display token auth for public viewers, not user JWT. | Medium |
| **Role annotations** (@AdminOnly, @PreAuthorize) | Repo 3 | **Adopt** | Clean pattern for RBAC. Add announcement-specific permissions (CREATE, EMERGENCY_TAKEOVER). | Low |
| **Notification preferences** (alert thresholds, opt-in/out) | Repo 3 | **Adapt** | Add WhatsApp-specific preferences, delay/closure notifications. | Low |
| **Analytics & statistics** (avg wait, busiest hours, daily served) | Repo 3 | **Adopt** | QueueStatistics model is a good starting point. Extend for our reporting needs. | Medium |
| **PDF/Excel export** (iText + Apache POI) | Repo 3 | **Adopt** | Standard approach. Works well for clinic reports. | Low |
| **Audit log** | Repo 3 | **Adopt** | Essential for compliance and debugging. Add to all sensitive operations including announcements. | Low |
| **Docker Compose layout** (backend + DB + Redis + monitoring) | Repo 3 | **Adapt** | Good reference for local dev setup. Replace MongoDB with PostgreSQL, add migrations. | Low |
| **Razorpay payment integration** | Repo 3 | **Skip (their implementation)** | Their implementation is **critically insecure** — no signature verification, public endpoints. Design our own with proper webhook verification and idempotency. | — |
| **QR code → raw JSON payload** | Repo 3 | **Skip** | Their QR contains raw JSON requiring an authenticated app to scan. Our QR must open a public web URL with a secure token — no login required. | — |
| **MongoDB data model** | Repo 3 | **Skip** | We use PostgreSQL. Take entity relationship ideas but design proper relational schema. | — |
| **Local file uploads** (uploads/ dir) | Repo 3 | **Skip** | Fails in containers. Use object storage (S3/GCS/R2). | — |
| **Token counter increment (non-atomic)** | Repo 3 | **Skip (anti-pattern)** | Race condition under load. Use `SELECT ... FOR UPDATE` or `RETURNING` in PostgreSQL. | — |

---

## 3. Specific Lessons

### 3A. Lessons for Our Announcement System (Section 51)

These lessons are primarily from **Repo 1 (FQM)**, which is the only reference with a display/announcement system:

| # | Lesson | Source | Our Design Response |
|---|---|---|---|
| 1 | **Browser autoplay blocks audio.** FQM had a bug where the autoplay-permission warning *blocked the entire display screen*. | FQM release notes | Show a non-blocking "Enable Sound" overlay on first load. The display must remain fully functional visually even without sound. Store sound-enabled state in localStorage. |
| 2 | **TTS fails without internet.** Some browser speech voices are cloud-based (especially on Smart TVs). When internet drops, TTS silently fails or produces garbage. | FQM bug fixes | Detect speech synthesis failure/timeout. Fall back to chime + visual-only highlight. Never freeze the call-out queue because speech failed. Optionally support pre-recorded audio files per language in Phase 2. |
| 3 | **TTS caching causes race conditions.** Multiple rapid "Call Next" actions can cause overlapping speech or corrupted audio. | FQM bug fixes | Implement a client-side call-out queue: play sequentially, never overlap. Drop stale call-outs older than a configurable age (e.g., 30 seconds). |
| 4 | **Display screens cause excessive CPU on low-spec devices.** Heavy CSS animations, continuous DOM updates, and background videos cause thermal throttling on cheap Android TV boxes and Raspberry Pis. | FQM bug fixes | Avoid heavy animation. Provide a "Reduce effects" option. Test on throttled CPU (Chrome DevTools 4× slowdown). Keep the render loop minimal during idle periods. |
| 5 | **Multiple display screens per clinic are needed.** Waiting Hall TV vs Lab TV vs specific doctor's room. | FQM architecture (Office routing) | Each display gets its own `displayToken`, scoped to specific queues/doctors. Topic subscriptions are per-display. |
| 6 | **Display configuration is extensive.** FQM's `Display_store` model has fonts, colors, sizes, RGBA values, background videos, slider images. | FQM data model | Simplify for MVP: theme (light/dark), font size (3 presets), clinic logo, language. Extensible later. |
| 7 | **Duck/mute other media during call-outs.** If an ad video is playing sound, it must be lowered/muted when a call-out speaks. | FQM design pattern | Implement media ducking: pause/mute ad audio during call-out, restore after. |
| 8 | **Ticker text for low-priority items.** FQM uses scrolling ticker for general info. | FQM display | Use `TICKER` display mode for `LOW` priority announcements; `CARD` rotation for `NORMAL`/`HIGH`; `FULLSCREEN_TAKEOVER` only for `EMERGENCY`. |

### 3B. Lessons for Our WhatsApp Chatbot (Sections 14–19)

These lessons come from **Repo 2 (RAG Chatbot)**, adapted for WhatsApp:

| # | Lesson | Source | Our Design Response |
|---|---|---|---|
| 1 | **Repo 2 uses Telegram, NOT WhatsApp.** | Repo 2 analysis | All WhatsApp specifics (templates, 24-hour window, interactive messages, webhook signatures) must come from the official WhatsApp Business Platform documentation. Repo 2 is inspiration for conversation design only. |
| 2 | **Structured JSON intent routing is clean.** LLM returns `{intent, action, date, time, ...}` → orchestrator routes to handler functions. | Repo 2 (`classify_intent`) | Adopt for Phase 2/3 AI layer. Validate returned JSON against a strict schema (Pydantic/Zod). Reject anything that doesn't match. |
| 3 | **Router → Orchestrator → Handler separation** keeps NLU separate from business logic. | Repo 2 architecture | Adopt. The orchestrator calls the same validated service layer as the web app — LLM never writes to DB directly. |
| 4 | **Fail-closed availability check** — treat API errors as "slot unavailable". | Repo 2 (`is_slot_free`) | Adopt. Critical for preventing double-booking. |
| 5 | **RAG for FAQ is useful** — embed clinic-specific docs (services, timings, preparation instructions), retrieve and answer via LLM. | Repo 2 (Qdrant + Gemini) | Adopt for Phase 2/3. Scope retrieval per-clinic (tenant isolation). Never include patient data in the RAG corpus. |
| 6 | **No webhook security.** Repo 2 accepts Telegram webhooks without signature verification or idempotency. | Repo 2 weakness | Our WhatsApp webhook MUST verify the `X-Hub-Signature-256` header (HMAC-SHA256). Process idempotently by message ID. Acknowledge (200) fast, process async. |
| 7 | **Flat-file session storage is fragile.** Not thread-safe, no expiry, no multi-instance support. | Repo 2 weakness | Store conversation state in PostgreSQL with session expiry (15–30 min inactivity). Key by `(whatsapp_number, clinic_context)`. |
| 8 | **No 24-hour window handling.** Telegram doesn't have this constraint; WhatsApp does. | Repo 2 gap | Outside the 24-hour customer-service window, only pre-approved template messages (HSM) may be sent. Design template catalog from day one. |
| 9 | **MVP bot must be deterministic.** Repo 2's LLM-first approach is fragile for production (JSON parsing failures, hallucination). | Repo 2 risk | MVP: menus, buttons, keywords. Phase 2/3: add optional NLU layer with the router pattern, strict validation, and human-handoff fallback. |
| 10 | **Session-keyed history abstraction** allows multi-channel support. | Repo 2 good idea | Use a generic `session_id` so the same conversation service can back WhatsApp, web chat, and SMS. |

---

## 4. Risks and Things We Must Do Differently

### 4.1 Multi-Tenancy (Critical)

| Risk | Seen In | Our Mitigation |
|---|---|---|
| **No tenant isolation at all** | Repo 1 (single-tenant), Repo 2 (single barber shop) | Every table includes `clinic_id`. Every query is scoped by tenant. Row-Level Security (RLS) in PostgreSQL as defense-in-depth. Integration tests that attempt cross-tenant access and verify denial. |
| **Loose ID-based linking** instead of strict hierarchies | Repo 3 (flat `ownedPlaceIds` arrays) | Strict relational hierarchy: `Clinic → Doctor → Service → Queue → QueueEntry`. Foreign keys enforced at DB level. Server-side tenant check on every request — never trust `clinicId` from frontend. |

### 4.2 Security (Critical)

| Risk | Seen In | Our Mitigation |
|---|---|---|
| **Payment endpoints are public and unverified** | Repo 3 (Razorpay confirm endpoints whitelisted in SecurityConfig, no signature verification) | Verify Razorpay webhook signature (`X-Razorpay-Signature` HMAC-SHA256). Idempotent processing by `order_id`. Never trust frontend payment status. Wrap in DB transaction. |
| **Token numbering race condition** | Repo 3 (`getTokenCounter() + 1` then save — not atomic) | Use `SELECT ... FOR UPDATE` or PostgreSQL `RETURNING` clause for atomic token number assignment within a transaction. Test with concurrent requests. |
| **No webhook signature verification** | Repo 2 (Telegram), Repo 3 (Razorpay) | Verify signatures for ALL webhook sources: WhatsApp (`X-Hub-Signature-256`), Razorpay (`X-Razorpay-Signature`), any payment gateway. |
| **Default credentials in config** | Repo 3 (Grafana `admin/admin` in docker-compose) | Never ship default credentials. Use `.env.example` with placeholder values. Document required secrets. |
| **Local file storage** | Repo 3 (`uploads/` directory) | Use object storage (S3/GCS/Cloudflare R2) from day one. Validate file type/size, strip metadata. |
| **LLM output trusted directly** | Repo 2 (JSON parsing of LLM response without validation) | Validate LLM output against strict schema. LLM never writes to DB directly — always through validated service layer. Fail closed on malformed output. |

### 4.3 Architecture

| Risk | Seen In | Our Mitigation |
|---|---|---|
| **Polling-only real-time** causes excessive DB load at scale | Repo 1 (jQuery polling) | WebSocket (STOMP) primary, SSE alternative, polling fallback only (10–15s interval). |
| **MongoDB for relational data** | Repo 3 | Use PostgreSQL. Queue operations, payments, and bookings need ACID transactions, proper locking, and relational integrity. |
| **QR code requires authenticated app** | Repo 3 (raw JSON payload) | QR opens a public web URL (`/queue/<secure-token>`) — no login required. Cryptographically random, non-guessable, short-lived tokens. |
| **Google Calendar as source of truth** | Repo 2 | Our PostgreSQL database is the source of truth. Calendar sync is optional one-way export (Phase 2/3). |

### 4.4 WhatsApp-Specific

| Risk | Our Mitigation |
|---|---|
| **Using unofficial WhatsApp library** | Repo 2 uses Telegram (not WhatsApp). We use ONLY the official WhatsApp Business Platform / Cloud API. No browser automation, no QR pairing libraries. |
| **No template message strategy** | Design HSM template catalog from day one. Register templates for: appointment confirmation, queue update, turn approaching, turn called, cancellation, delay notification. |
| **No 24-hour window handling** | Track last customer message timestamp. Outside window, send only approved templates. Inside window, use session messages (interactive buttons/lists). |

---

## 5. Recommended Changes to the Master Prompt

After analyzing all three repositories, I suggest the following minor refinements:

### 5.1 Confirmed — No Changes Needed

The master prompt's pre-analysis findings (Part 0.4) are **accurate** and verified against the actual code:

- ✅ FQM is indeed MPL-2.0, single-tenant Flask/SQLite, with TTS/display features as described.
- ✅ Repo 2 is indeed Telegram (not WhatsApp), early-stage, no license, with the router/orchestrator pattern.
- ✅ QueueLess is indeed Apache-2.0, Java/Spring Boot/React/MongoDB, with the features and gaps listed.

### 5.2 Suggested Additions

| # | Suggestion | Rationale |
|---|---|---|
| 1 | **Add a `RECONNECTING` display state to Section 51.3 layout rules.** | FQM's polling approach masked connection issues. Our WebSocket viewer needs an explicit "Reconnecting…" visual state with last-known data + staleness indicator. *(Already mentioned in 51.7 but worth elevating to a layout rule.)* |
| 2 | **Add burn-in prevention to Section 51.3.** | Always-on TV displays risk LCD burn-in. Add a subtle periodic layout shift or pixel-shift mechanism. *(Already mentioned in 51.11 — confirmed as important from FQM's real-world deployment.)* |
| 3 | **Consider `HOLD` as an explicit queue state.** | FQM has "put on hold" as a distinct action (separate from `SKIPPED`). Our current state machine maps this to `SKIPPED→CALLED`, but a dedicated `ON_HOLD` state with a "hold reason" field might be clearer for receptionists. **Open question for founder.** |
| 4 | **Add a "time spent waiting" metric to the receptionist dashboard.** | FQM displays this per-token. Valuable for real-time clinic management and ETA calibration. Already covered by our ETA system (Section 30) but worth making explicit in the dashboard spec (Section 20). |
| 5 | **Specify atomic token numbering in Section 49 edge cases.** | QueueLess's non-atomic counter increment is a confirmed race condition. Worth calling out explicitly: "Token number assignment MUST be atomic (e.g., `SELECT ... FOR UPDATE` or DB sequence)." |

### 5.3 No Prompt Changes Required For

- The three repos don't reveal any *missing* features in our spec — our spec is already more comprehensive.
- The announcement system design (Section 51) is well-informed by FQM's real-world issues.
- The WhatsApp design (Sections 14–19, 53) correctly avoids Repo 2's weaknesses.

---

## 6. Summary Decision Matrix

| Repo | License | Can Copy Code? | Our Use |
|---|---|---|---|
| **FQM** (Repo 1) | MPL-2.0 | Technically yes (SaaS exemption), but architecture mismatch makes it impractical | **Inspiration only** — display/TTS patterns, real-world bug lessons |
| **RAG Chatbot** (Repo 2) | None (all rights reserved) | **No** | **Inspiration only** — intent routing pattern, RAG for FAQ, fail-closed checks |
| **QueueLess** (Repo 3) | Apache-2.0 | Yes (with attribution) | **Inspiration only** — entity model, WebSocket topics, role annotations, analytics. Code is MongoDB-based with security flaws; cheaper to write fresh. |

---

## Founder Decisions (2026-10-10)

1. ✅ **`ON_HOLD` is a separate queue state** (distinct from `SKIPPED`). Receptionists can explicitly hold a patient with a reason and recall them later. Update the queue state machine in M1 accordingly.

2. ✅ **All 3 TV display templates ship in MVP:** Now serving + next list, Last 4 called tokens, Single large token.

3. ✅ **English + Hindi voice in MVP.** Both languages supported from day one.

---

**✅ M0 APPROVED — Proceeding to M1 (Architecture & Design Docs).**
