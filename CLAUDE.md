# CLAUDE.md — Project Memory

> Living document. Updated after every milestone.

## Project

**Multi-Clinic Queue, Appointment & Announcement Platform** — a multi-tenant SaaS for queue management, appointment booking, and real-time announcements for clinics/hospitals in India.

## Current Status

- **Phase:** M6 (Public QR Token Page) — completed; advancing directly to M7.
- **M0:** ✅ Approved (2026-10-10). See `docs/00-reference-analysis.md`.
- **M1:** ✅ Approved (2026-10-11). See `docs/01-architecture.md` - `docs/06-deployment.md`.
- **M2:** ✅ Approved (2026-10-11). See commit `2e74cb9`.
- **M3:** ✅ Approved (2026-10-11). See commit `d2571a3`.
- **M4:** ✅ Approved (2026-10-11). See commit `e7dd02f`.
- **M5:** ✅ Approved (2026-10-11). See commit `2991d6a`.
- **M6:** ✅ Completed (2026-10-11). Public QR page & zero-PII manual lookup verified.
- **Next:** M7 (TV Viewer mode + real-time updates: 3 templates, sound chime, WebSockets/polling).

## Tech Stack (Pending M1 Approval)

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (PWA)
- **Backend:** Java + Spring Boot (preferred) — alternative pending justification review
- **Database:** PostgreSQL (managed)
- **Real-time:** WebSocket (STOMP) + SSE fallback + polling fallback
- **Auth:** Passwordless OTP (patients), secure login + MFA (admins)
- **Payments:** Abstracted provider layer (Razorpay default)
- **Messaging:** Official WhatsApp Business Platform / Cloud API
- **Storage:** Object storage (S3/GCS/R2)
- **Deployment:** Docker Compose locally; cloud-agnostic (AWS/GCP/Render/Railway)

## Repository Layout (Planned)

```
apps/web/        — React + TypeScript + Vite + Tailwind
apps/api/        — Backend (Spring Boot or Node)
packages/shared/ — Shared types/contracts
docs/            — Design docs, specs, analysis
scripts/         — Dev/build/deploy scripts
docker-compose.yml
```

## Key Documents

| Doc | Path | Status |
|---|---|---|
| Master Prompt | `docs/MASTER_PROMPT.md` | ✅ Complete |
| Reference Analysis | `docs/00-reference-analysis.md` | ✅ Approved (M0) |
| Architecture | `docs/01-architecture.md` | 📝 Complete — Awaiting Approval (M1) |
| Schema / ERD | `docs/02-schema.md` | 📝 Complete — Awaiting Approval (M1) |
| API Spec | `docs/03-api.md` | 📝 Complete — Awaiting Approval (M1) |
| Flows | `docs/04-flows.md` | 📝 Complete — Awaiting Approval (M1) |
| Security | `docs/05-security.md` | 📝 Complete — Awaiting Approval (M1) |
| Deployment | `docs/06-deployment.md` | 📝 Complete — Awaiting Approval (M1) |
| Progress | `docs/PROGRESS.md` | ✅ Maintained |

## Architecture Decisions (ADR-style)

1. **ADR-001:** Inspiration only from all three reference repos — no code copied (MPL-2.0 copyleft risk for Repo 1, no license for Repo 2, architecture mismatch for all three).
2. **ADR-002:** PostgreSQL over MongoDB — queue operations need ACID transactions, relational integrity, and row-level security for tenant isolation.
3. **ADR-003:** WebSocket primary, SSE alternative, polling fallback — FQM's polling-only approach doesn't scale.
4. **ADR-004:** MVP WhatsApp bot is deterministic (menus/buttons) — AI/NLU layer deferred to Phase 2/3.
5. **ADR-005:** Fail-closed for all external operations — payment check errors = failed, slot check errors = unavailable.
6. **ADR-006:** `ON_HOLD` is a separate queue state (not reusing `SKIPPED`). Patients can be held with a reason and recalled.
7. **ADR-007:** All 3 TV display templates ship in MVP (Now serving + next list, Last 4 called, Single large token).
8. **ADR-008:** English + Hindi voice call-outs both supported in MVP.
9. **ADR-009:** Full-Stack TypeScript (Node.js/NestJS + React/Vite) selected over Java/Spring Boot for developer velocity, single language, shared DTO types, and agile vibe coding while retaining enterprise DI/modular patterns.

## Gotchas

- Browser autoplay policy blocks TV display audio — must show "Enable Sound" overlay.
- TTS can fail silently on Smart TVs (cloud-based voices need internet).
- Token numbering MUST be atomic (race condition found in QueueLess).
- Razorpay webhook signatures MUST be verified server-side (QueueLess skips this).
- TV displays risk LCD burn-in — need pixel-shift or layout rotation.

## Commands

```bash
# Install all dependencies across monorepo:
npm install

# Build all packages:
npm run build

# Run TypeScript typecheck across all packages:
npm run typecheck

# Run backend unit and E2E integration tests:
npm test

# Generate Prisma client:
npx prisma generate --schema=apps/api/prisma/schema.prisma

# Sync schema to database:
npx prisma db push --schema=apps/api/prisma/schema.prisma

# Seed 2 demo clinics and users:
npx ts-node apps/api/prisma/seed.ts
```

## Conventions

- Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`
- Branch per milestone: `feat/m0-reference-analysis`, `feat/m1-architecture`, etc.
- Never commit secrets, `.env`, or build artifacts
- `.env.example` with placeholders only
