# Project Progress Tracker

> **Last Updated:** 2026-10-11  
> **Overall Status:** Milestone M1 (Architecture & Design Docs) Complete — Awaiting Approval

---

## Milestone Status Overview

| # | Milestone | Status | Output Documents / Artifacts | Approval Date |
|---|---|---|---|---|
| **M0** | Reference Repo Analysis | ✅ **Approved** | `docs/00-reference-analysis.md` | 2026-10-10 |
| **M1** | Architecture & Design Docs | ✅ **Approved** | `docs/01-architecture.md`<br>`docs/02-schema.md`<br>`docs/03-api.md`<br>`docs/04-flows.md`<br>`docs/05-security.md`<br>`docs/06-deployment.md` | 2026-10-11 |
| **M2** | Project Scaffold, DB Migrations, Seed, OTP Auth | ✅ **Approved** | Monorepo layout, Prisma, Seed data, Auth APIs & UI, 10/10 tests pass | 2026-10-11 |
| **M3** | Multi-Tenant Core (Clinics, Staff, RBAC) | 📝 **Completed** (Awaiting Approval) | TenantGuard, RBAC, Clinics/Doctors/Services APIs, 20/20 tests pass | *Pending* |
| **M4** | Queue Core (Tokens, Concurrency-Safe Call Next) | ⏳ Queued | Queue state machine, Atomic counter logic | — |
| **M5** | Receptionist Dashboard + Walk-ins | ⏳ Queued | Dashboard UI, Walk-in registration | — |
| **M6** | Public QR Token Page (No Login) | ⏳ Queued | Public token view, 360px mobile responsive | — |
| **M7** | TV Viewer Mode + Real-Time WebSocket | ⏳ Queued | 3 TV templates, WebSockets, Audio/Chime, Sound overlay | — |
| **M8** | Announcement System | ⏳ Queued | Call-outs, Banners, Takeovers, English & Hindi TTS | — |
| **M9** | Appointments + Payments (Razorpay Webhooks) | ⏳ Queued | Booking slots, Webhook idempotency | — |
| **M10** | WhatsApp Notifications (Official API) | ⏳ Queued | Cloud API templates, Outbox delivery logs | — |
| **M11** | Advertisement Slots (Patient & TV Viewer) | ⏳ Queued | Reusable ad slot components | — |
| **M12** | Reporting & Export (PDF / Excel) | ⏳ Queued | Daily/Monthly metrics, PDF & Excel export | — |
| **M13** | Hardening, Performance, Security & Deploy | ⏳ Queued | Security checklist, Throttling, E2E checks | — |

---

## Decisions Log & Approved Changes
- **ADR-001**: Inspiration only from reference repositories (`FQM`, `QueueLess`, `RAG-GoogleCalender-Chatbot`). Zero code copy.
- **ADR-002**: Relational PostgreSQL with Row-Level Security (RLS) instead of MongoDB.
- **ADR-003**: WebSocket (Socket.io/STOMP) primary with SSE and polling fallback.
- **ADR-004**: Deterministic rule-based WhatsApp chatbot for MVP; LLM/RAG deferred to Phase 2/3.
- **ADR-005**: Fail-closed principle for all external integrations (slot check error = unavailable; payment verification error = unverified).
- **ADR-006**: `ON_HOLD` is an explicit, separate queue state with hold reasons and recall capability.
- **ADR-007**: All 3 TV display templates ship in MVP (`Now Serving + Next List`, `Last 4 Called`, `Single Large Token`).
- **ADR-008**: English and Hindi voice call-out support in MVP.
- **ADR-009**: Full-Stack TypeScript (Node.js/NestJS + React/Vite) selected to maximize solo/small-team development velocity and shared contracts.

---

## Current Work in Progress
- Verification and review of the complete design document suite in `docs/`.
- No application code written yet (waiting for founder approval on M1).

## Next Step
- **Founder Approval of M1** → Proceed to **M2: Project Scaffold, CI-style checks, DB + migrations, seed data, and OTP auth**.
