# CLAUDE CODE MASTER PROMPT — Multi-Clinic Queue, Appointment & Announcement Platform

> **How to use this file:** Place it in your project root as `docs/MASTER_PROMPT.md` and give it to Claude Code as the first message, telling it: *"Read this file fully. Start with Part 0.4 (Phase 0) only. Do not write application code yet."*

---

# PART 0 — HOW YOU (CLAUDE CODE) MUST WORK

You are acting as a senior full-stack architect and engineer, pair-building this product with a founder who is **vibe coding**: they describe outcomes and review results, and may not read every line of code. This means you must be **careful, explicit, and self-verifying**. Plain-language explanations are required after every step.

## 0.1 Non-negotiable working rules

1. **Plan first, code second.** Use Plan Mode (or an equivalent "propose, then wait for approval" step) before every milestone. Never start a milestone without my approval.
2. **One milestone at a time.** Finish, test, and demonstrate each milestone before starting the next. Do not build the whole product in one go.
3. **Never claim something works unless you ran it.** After each change, run the relevant tests, linter, type-check, and build. Show me the actual results (pass/fail), not assumptions.
4. **Ask instead of guessing.** If a requirement is ambiguous or an external resource (repo, API key, credential) is missing or unreachable, stop and ask me. State assumptions explicitly when you proceed.
5. **Explain in plain language** after each milestone using this fixed format:
   - **What I built** (2–5 lines, non-technical)
   - **How to run it** (exact commands)
   - **How to test it manually** (click-by-click steps I can follow)
   - **What could break / known limitations**
   - **Proposed next step** (and wait for approval)
6. **Keep the simplest architecture that works.** Do not introduce Kubernetes, microservices, message brokers, or other heavy infrastructure unless I approve a documented need.
7. **Never fabricate.** If you did not read a file, repo, or API doc, do not describe it as if you did.

## 0.2 The 10 Best Practices (follow all of them throughout the project)

### 1. Plan before you code, with an approval gate
For every milestone: write a short plan (files to create/change, data model changes, risks, test plan), present it, and **wait for my "approved"**. Use plan mode (or an equivalent read-only planning step) so no files are changed during planning.

### 2. Maintain `CLAUDE.md` as living project memory
Create a `CLAUDE.md` at the start. Keep it short and accurate: tech stack, folder structure, run/test/build/lint commands, coding conventions, architecture decisions (ADR-style), and "gotchas". Update it whenever a decision changes. Put long documents (schema, API spec, flows) in `docs/` and reference them from `CLAUDE.md` instead of pasting them in.

### 3. Build in small, end-to-end vertical slices
Each slice must work from UI → API → service → database → test. Example slice: "Receptionist clicks **Call Next** → queue entry becomes `CALLED` → TV viewer updates." Do not build all backend first and all frontend later.

### 4. Always run the verify loop
After every meaningful change run: **type-check → lint → unit tests → integration tests → build**. Fix failures before moving on. Write tests for critical logic first or alongside (queue state machine, payment verification, tenant isolation, announcement scheduling). Report results honestly.

### 5. Keep context clean
Start a fresh session for unrelated tasks, summarise long sessions while keeping key decisions (such as the queue state machine), and reference files by path (e.g., `docs/02-schema.md`) instead of re-pasting them. At the end of each session, update `CLAUDE.md` and write a short `docs/PROGRESS.md` (done / in progress / next / open questions) so a fresh session can resume instantly.

### 6. Disciplined Git workflow
One branch per milestone (`feat/m4-queue-core`), small commits with Conventional Commit messages (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`), and a commit/checkpoint **before** any risky refactor or migration so changes can be rewound. Never commit secrets, `.env`, or build artifacts. Maintain a correct `.gitignore` from day one.

### 7. Security and safety by default
Secrets only in environment variables; commit a `.env.example` with placeholders. Ask before running destructive commands (`rm -rf`, dropping databases, force-push, bulk deletes). Run least-privilege: do not grant broad permissions unnecessarily. Treat all input as untrusted (validate, sanitize, encode). Enforce tenant isolation and role checks **server-side** in every endpoint. Never trust frontend-supplied role, clinic ID, user ID, or payment status.

### 8. Be specific, with acceptance criteria
Every feature you propose must include testable acceptance criteria written as "Given / When / Then". Example: *Given an announcement scheduled for 10:00–11:00, when the TV viewer loads at 10:30, then it is displayed; at 11:01 it disappears without a page reload.* I will approve against these criteria.

### 9. Use review passes and parallel exploration
Before marking a milestone done, run an independent review pass (a code-review subagent, plus a dedicated security review of auth, payments, webhooks, QR tokens, and tenant isolation). Use subagents for read-only exploration (for example, analysing the reference repositories in Part 0.4) so the main context stays small.

### 10. Database changes only through migrations, and operations must be safe
Never hand-edit the schema. Every schema change is a versioned, reversible migration. Provide seed/demo data (2 clinics, doctors, services, sample queue, sample announcements) so I can see the app working immediately. Wrap queue operations and slot booking in transactions with proper locking/idempotency, and test concurrent scenarios (two receptionists clicking "Call Next", double payment webhooks).

---

# PART 0.4 — PHASE 0: ANALYSE THE THREE REFERENCE REPOSITORIES (DO THIS FIRST)

Three open-source repositories are provided as **reference and inspiration only**. Do not fork them, clone them, or run them locally; read them on GitHub (README, docs, folder structure and key files) and extract ideas:

- **Repo 1 — FQM (Free Queue Manager) queue system with text-to-speech announcements:**
  - Website repo provided: `https://github.com/fqms/fqms.github.io` (this is only the project's **website**; it contains static HTML/CSS/JS, not the application code)
  - The actual application is a separate repository, believed to be `https://github.com/mrf345/FQM` (a Python Flask app). **Confirm this by reading the website repo's links/README first**, then analyse that repo.
- **Repo 2 — Booking chatbot with LLM intent routing + RAG:** `https://github.com/RaghavO222/RAG-GoogleCalender-Chatbot`
  - Note: this is a **Telegram + web-chat** barber-booking bot (Python, FastAPI, Gemini, Qdrant, Google Calendar), **not a WhatsApp project**. Use it for conversation/AI-routing ideas only. WhatsApp specifics must come from the official WhatsApp Business Platform documentation.

- **Repo 3 — QueueLess (queue platform to take inspiration from):** `https://github.com/harman-04/QueueLess`
  - Multi-location queue platform: Java 25, Spring Boot 3.5, React 18 + Vite + Redux Toolkit, MongoDB, Redis, WebSocket (STOMP), Razorpay, Firebase push, email OTP, Prometheus/Grafana/Loki, Docker Compose. Licence shown on GitHub: Apache-2.0 (verify in its LICENSE file).
  - It covers much of the core queue platform but, per its README, not the WhatsApp bot, a public no-login QR token page, or a public announcement system. Use it to inspire our design; build everything in our own architecture.

> If a repo cannot be accessed or the application repo cannot be confirmed, **stop and ask me** for a URL or a local copy. Do not guess what a repo contains.

## Pre-analysis findings (from READMEs and release notes only; **verify against the actual code in M0**)

**Repo 1 / FQM**
- Self-hosted, single-organisation web app (Flask, Bootstrap, jQuery). Reported licence: **MPL-2.0** (file-level copyleft; verify in the repo's LICENSE file). Not multi-tenant, no online booking, payments, or WhatsApp.
- Relevant features seen in release notes: text-to-speech call-outs, configurable audio-announcement queuing on the display screen, multiple display screens routed per office, a display template showing the last 4 called tickets, option to hide the waiting-ticket index number, option to disable transition effects, auto-muting video while a TTS announcement plays, touch-screen kiosk for ticket issuing, single-row queuing without a kiosk, POS ticket printing, "put on hold" and "pull ticket" actions, and a time-spent-waiting column.
- Real-world bugs they had to fix are valuable warnings: the browser **auto-play permission warning blocked the display screen**, **TTS failing when there is no internet** was not handled, **TTS caching caused race conditions**, and the display screen used **excessive CPU on low-spec devices**.

**Repo 2 / RAG Calendar Chatbot**
- Pattern: (1) an LLM "router" classifies each message into `CHAT`, `BOOK`, `DELETE`, or `RAG` and returns structured JSON; (2) an orchestrator routes to handlers; (3) booking checks/creates events in Google Calendar; (4) `RAG` retrieves chunks from a vector database and a second LLM call writes the answer; (5) per-session history is stored in flat files.
- Weaknesses to avoid: tiny, early-stage project (3 commits, no visible licence, so treat as **inspiration only, all rights reserved by default**); no tenant isolation; history in JSON files; Google Calendar used as the source of truth; LLM output trusted to drive bookings.
- Good ideas: structured-JSON intent routing, a separate orchestrator layer, RAG for FAQ-type questions (clinic timings, services, preparation instructions), and a **fail-closed slot check** (treat errors as "unavailable" to avoid double-booking).

**Repo 3 / QueueLess (from the README only; verify by reading the code on GitHub)**
- Maturity: 42 commits, 2 stars, single author, partial backend tests, no frontend tests. Treat it as early-stage inspiration, not proven software.
- Ideas worth taking: the places → services → queues → tokens model; regular/group/emergency tokens with staff approval; STOMP topics per queue plus user-specific channels; role annotations on endpoints; per-queue notification preferences; feedback with multi-dimension ratings; provider/admin analytics (token volume, busiest hours, wait-time trends); PDF/Excel export; audit log; rate limiting; Redis caching; geographic heat map; Swagger API docs; CI workflow and Docker Compose layout.
- Not covered (we must design these ourselves): time-slot appointment booking, TV/viewer mode, announcements, ads, WhatsApp, phone-number OTP, Hindi/i18n, clinic-level tenant isolation, walk-in/no-login token access. A QR code appears on its provider screen; check what it actually does.
- Things to do differently: it uses MongoDB while our spec uses PostgreSQL; its payments sell admin/provider access tokens rather than patient payments, and the payment endpoints are listed as public (we must verify signatures and idempotency in our own design); its WebSocket auth uses a user JWT (our public TV viewer needs a separate read-only display token); images are stored in a local `uploads/` folder (we use object storage); default dev credentials appear in its docs (we never ship defaults).

## Rules for the analysis

- **Read-only analysis** through GitHub only.
- **Check each repo's license first** (MIT/Apache/GPL/AGPL/none). Report it, and tell me what it means for reuse in a commercial SaaS. If the license is restrictive or missing, treat the repo as inspiration only.
- **Do not copy code from any of the three repositories.** Take ideas, data models, flows and UX patterns only, then implement them cleanly in our own architecture. Do not clone, install or run any reference repo.
- **Flag unofficial or risky approaches.** Our project uses only the **official WhatsApp Business Platform / Cloud API**. If Repo 2 uses an unofficial library (for example one that automates WhatsApp Web via a browser session or QR pairing), note it as **not adoptable**, and extract only the conversation-design ideas.
- Use subagents for exploration to keep the main context small.

## What to analyse in Repo 1 (queue + announcements)

- Tech stack, folder structure, how it is run and deployed
- Data model for tickets, counters/rooms, services, queues, users
- **How announcements work:** what triggers them (token called, recall, custom message), how they are displayed (ticker, popup, full screen), whether voice/TTS or chime is used, languages, repeat logic, scheduling, targeting, priority and conflict handling
- Display/TV screen design and real-time mechanism (WebSocket, SSE, polling)
- Ticket kiosk / printing / counter operator flows worth borrowing
- Weaknesses: scalability, security, tenant isolation (likely single-tenant), missing tests

## What to analyse in Repo 3 (QueueLess)

- Data model: `User`, `Place`, `Service`, `Queue`, `Token`, `Feedback`, `AuditLog`, `NotificationPreference`; map each to our entities (Section 24) and note what we do differently for clinics and tenant isolation
- Token types and the emergency-approval flow; how "serve next", complete and cancel work
- WebSocket topic design and what is broadcast on each queue change
- Role and permission annotations, JWT handling, rate limiting and caching approach
- Notification preferences and alert thresholds (email/push) that we could adapt for WhatsApp
- Analytics, export and audit-log features worth adapting for our reports (Section 33 onward)
- Docker Compose and CI workflow layout
- Weaknesses to avoid: tenant isolation, concurrency safety of token numbering, public payment endpoints, test coverage, secrets handling

## What to analyse in Repo 2 (WhatsApp chatbot)

- Provider and API used (official Cloud API vs unofficial)
- Conversation state machine: menu navigation, session storage, timeouts, fallbacks, "back/cancel/help" handling
- Webhook handling: signature verification, idempotency, retries, ordering, rate limits
- Template (HSM) vs session messages and the 24-hour customer-service window
- Registration/OTP flow, booking flow, status flow, error handling, language handling
- Weaknesses and security gaps

## Required output of Phase 0 (a document, `docs/00-reference-analysis.md`)

1. Summary of each repo (stack, license, maturity, activity)
2. A table: **Feature | Seen in repo | Adopt / Adapt / Skip | Reason | Effort**
3. Specific lessons for our **Announcement System (Section 51 below)** and **WhatsApp chatbot (Section 14–19)**
4. Risks and things we must do differently (multi-tenancy, security, official API only)
5. Recommended changes to this master prompt, if any

**STOP after Phase 0 and wait for my approval before continuing.**

---

# PART 0.5 — MILESTONE ROADMAP (build order; approval required at each step)

| # | Milestone | Done when |
|---|---|---|
| M0 | Reference repo analysis | `docs/00-reference-analysis.md` approved |
| M1 | Architecture & design docs (First Task list at the end of this file) | Docs approved, no app code yet |
| M2 | Project scaffold, CI-style checks, DB + migrations, seed data, OTP auth | Can register/login, tests pass |
| M3 | Multi-tenant core: clinics, staff, doctors, services, RBAC, tenant isolation tests | Cross-tenant access tests pass |
| M4 | Queue core: queues, tokens, state machine, concurrency-safe "Call Next" | State machine + concurrency tests pass |
| M5 | Admin/receptionist dashboard + walk-in patients | Receptionist can run a full day |
| M6 | Public QR token page + manual token lookup (no login) | Works on a 360px phone |
| M7 | TV Viewer mode + real-time updates (WebSocket/SSE + polling fallback) | TV updates within ~1–2 s |
| M8 | **Announcement system** (Section 51) | All acceptance criteria in 51.12 pass |
| M9 | Appointment booking + payment abstraction + webhook verification | Idempotent webhook tests pass |
| M10 | Basic WhatsApp notifications (official API) | Delivery status logged |
| M11 | Advertisement slots (Patient + Viewer) | Ads never obscure queue/announcements |
| M12 | Basic reports (PDF/XLSX) | Filters + export work |
| M13 | Hardening, performance, accessibility, deployment guide | Security checklist passes |

Phase 2 and Phase 3 items stay out of scope until MVP is approved.

---

# PART B — PRODUCT SPECIFICATION

*(Original requirements follow. They are updated to include the Announcement System and reference-repo learnings. Where this section conflicts with Part 0 working rules, Part 0 wins on **how** you work; this section wins on **what** you build.)*

---

# Build a Production-Ready Multi-Clinic Queue & Appointment Management Web Application

You are a senior full-stack architect, product designer, UX designer, and software engineer.

Design and implement a **production-ready, multi-tenant web application for queue management and appointment booking**, primarily targeted at small hospitals, clinics, diagnostic centers, and individual doctors.

The application must work well on:

- Android phones
- iPhones
- Tablets
- Laptops/desktops
- Smart TVs / TV browsers

The application should be **responsive, minimalistic, pleasant, fast, highly readable, and easy to operate for non-technical clinic receptionists**.

There is **no mandatory technology restriction**. Choose technologies based on:

1. Ease of development
2. Ease of deployment
3. Low startup cost
4. Availability of affordable hosting/services in India
5. Reliability
6. Easy third-party API integration
7. Scalability
8. Developer availability
9. Long-term maintainability

Do not choose unnecessarily complex enterprise technologies.

---

# 1. Product Concept

Build a centralized platform where **multiple independent clinics/hospitals can use the same application**.

A patient should be able to:

- Register once on the platform.
- Search/select any participating clinic.
- View available doctors/services.
- Book an appointment/queue slot at any available clinic.
- Pay a configurable token/booking amount.
- Receive confirmation.
- Track their queue position and estimated waiting time.
- Receive WhatsApp notifications.
- Access their queue status through a QR code without having to log in again.

A clinic should be able to:

- Manage its own queue.
- Register patients.
- Add walk-in/offline patients.
- Manage doctors and services.
- Manage appointments.
- Call the next patient.
- Skip/pause/recall patients.
- Display queue information on a TV.
- Generate reports.

A Super Admin should be able to manage the entire platform and all participating clinics.

---

# 2. Multi-Tenant Architecture

The application must be designed as a **multi-tenant SaaS platform**.

Each clinic is an independent tenant.

Example:

Platform:

```
QueueApp
```

Clinics:

```
Clinic A
Clinic B
Clinic C
Hospital D
```

Each clinic must have its own:

- Clinic profile
- Doctors
- Services
- Staff/admins
- Queue configuration
- Appointment schedules
- Patients/visits
- Payment configuration
- Reports
- QR codes
- TV displays
- WhatsApp configuration where applicable

Clinic A must never be able to access Clinic B's private data.

The architecture should make tenant isolation explicit at the database and API levels.

---

# 3. User Roles

Implement these primary roles:

## 3.1 Platform Super Admin

The Super Admin controls the entire SaaS platform.

Capabilities:

- Create/edit/delete clinics
- Approve/suspend clinics
- Manage clinic subscriptions/plans
- Manage clinic admins
- View platform-wide statistics
- Manage advertisements
- Create platform-wide announcements (see Section 51)
- Manage platform settings
- View platform-level reports
- Manage payment configuration
- Manage WhatsApp integration
- Manage system configuration
- Manage support/issues
- View audit logs

The Super Admin must NOT require access to unnecessary patient information unless required for legitimate administrative/reporting purposes.

---

# 3.2 Clinic Admin / Receptionist

The clinic admin operates the clinic.

Dashboard should provide:

- Today's appointments
- Current queue
- Waiting patients
- Completed patients
- Cancelled patients
- No-shows
- Average waiting time
- Current token
- Next token
- Queue size
- Revenue/booking summary where applicable

Actions:

### Patient management

- Register patient
- Search existing patient
- Add walk-in patient
- Add offline patient
- Update patient information
- Generate token
- Assign doctor/service
- Add notes
- Mark patient arrived
- Mark patient completed
- Mark no-show

### Queue controls

- Call next patient
- Recall patient
- Skip patient
- Pause queue
- Resume queue
- Cancel token
- Move token
- Manually change token
- Emergency priority token
- Add priority patient
- Reorder queue where permitted

### Appointment management

- Create appointment
- View appointments
- Reschedule
- Cancel
- Confirm arrival
- Convert appointment into queue token

---

# 3.3 Patient / Customer

Patients should have a simple experience.

## Registration

A user can register once using:

- Mobile number
- Name
- Optional email
- Optional date of birth
- Optional gender
- Optional profile information

Authentication should be **passwordless**.

Use:

```
Mobile Number → OTP → Login
```

Do NOT require users to remember a password.

Once registered, the same account can be used across all clinics on the platform.

---

# 4. Clinic Discovery

The patient should be able to open the application and see:

- Search clinics
- Nearby clinics (if location permission is granted)
- Clinic categories
- Doctors
- Services
- Availability
- Appointment slots
- Current queue information

Example:

```
Search "Dentist"
```

Results:

```
ABC Dental Clinic
12 people waiting
Estimated wait: 35 min

XYZ Dental Care
4 people waiting
Estimated wait: 15 min
```

The patient can select any participating clinic.

---

# 5. Appointment Booking

Patients should be able to:

1. Select clinic
2. Select doctor
3. Select service
4. Select date
5. Select available time/queue slot
6. View booking fee/token amount
7. Pay
8. Receive confirmation
9. Receive token/appointment number

Payment must be handled using a reliable Indian payment gateway.

Consider economical and easy-to-integrate options such as:

- Razorpay
- Cashfree
- PhonePe Payment Gateway
- PayU

Do NOT hard-code the payment provider.

Create a payment abstraction/service layer so another provider can be added later.

Payment states:

```
CREATED
PENDING
SUCCESS
FAILED
REFUNDED
CANCELLED
```

Never consider an appointment paid merely because the frontend says payment succeeded.

Verify payment using the gateway's server-side verification/webhook mechanism.

---

# 6. Queue Management

The queue is the core functionality.

Each clinic/doctor/service should be able to have an independent queue.

Example:

Clinic:

```
ABC Clinic
```

Doctors:

```
Dr. Sharma
Dr. Singh
```

Queues:

```
Dr. Sharma - General Consultation
Dr. Singh - Dental
Lab - Blood Test
```

Each queue should support:

- Token number
- Patient
- Status
- Created time
- Appointment time
- Check-in time
- Called time
- Start time
- Completion time
- Estimated waiting time
- Queue position

Statuses can include:

```
BOOKED
WAITING
CALLED
IN_SERVICE
COMPLETED
SKIPPED
CANCELLED
NO_SHOW
```

---

# 7. QR Code Patient Access

This is extremely important.

The QR code provided by the clinic should NOT simply send the user to a login page.

When a patient scans the QR code, they should immediately reach a **token-specific queue status page**.

Example:

```
Token: A-37

Current Token: A-31

Your Position: 6

Estimated Waiting Time: 32 minutes

People Ahead: 5

Doctor: Dr. Sharma

Clinic: ABC Clinic
```

The patient should NOT need to log in merely to see this information.

The QR URL should contain a secure, non-guessable queue/visit identifier.

For example conceptually:

```
/queue/<secure-public-token>
```

Do NOT expose:

- Database IDs
- Patient database IDs
- Mobile numbers
- Sensitive patient information

through the URL.

Use a cryptographically secure public identifier.

---

# 8. Manual Queue Status Access

A patient who does not scan the QR code should also be able to manually check their queue.

Example:

```
Enter Token Number

[ A-37 ]
```

Optional:

```
Enter Mobile Number

[ ********21 ]
```

Then:

```
Check Status
```

The application should display:

- Clinic
- Doctor/service
- Token
- Current token
- People ahead
- Estimated waiting time
- Queue status
- Approximate waiting time
- Last updated time

Mobile verification should only be required when necessary.

---

# 9. QR Security

QR-based public access must not reveal sensitive information.

Implement:

- Random public identifiers
- Short-lived access tokens where appropriate
- Rate limiting
- Abuse protection
- No patient personal details on public pages
- No sequential predictable IDs
- Server-side authorization

The QR status page should expose only the minimum information necessary.

---

# 10. Viewer / TV Mode

Create a dedicated **Viewer Mode** optimized for smart TVs.

Example URL:

```
/viewer/<secure-display-token>
```

The clinic can open this page on:

- Smart TV browser
- Android TV
- Laptop connected to TV
- Chromecast-compatible browser
- Any modern browser

The display should be extremely simple.

Example:

---

ABC CLINIC

NOW SERVING

```
        A-31
```

PLEASE WAIT

Your Token: A-37

People Ahead: 5

Estimated Wait: 32 min

---

The TV should automatically update when the receptionist calls the next patient.

Use real-time updates where appropriate.

Prefer:

- WebSockets

or:

- Server-Sent Events

If real-time infrastructure adds unnecessary cost, implement a lightweight polling fallback.

---

# 11. Viewer Display Customization

Each clinic should be able to configure:

- Clinic logo
- Clinic name
- Display title
- Doctor name
- Queue name
- Token prefix
- Theme
- Font size
- Language
- Announcements and voice call-outs (full specification in Section 51)

The display must remain readable from a distance.

Use:

- Large typography
- High contrast
- Minimal UI
- No unnecessary controls
- Large token number

---

# 12. Advertising System

The application must be designed from the beginning to support **banner advertising**.

This is an important monetization feature.

Create reserved advertisement components/slots in:

## Patient Mode

Place an advertising banner:

```
BELOW QUEUE STATUS
```

Example:

```
-------------------------
Token: A-37
Position: 5
Wait: 28 minutes
-------------------------

[ ADVERTISEMENT BANNER ]

-------------------------
```

The ad must not interfere with the queue information.

## Viewer / TV Mode

Include a dedicated advertising area below or beside the queue information.

Example:

```
--------------------------------
CURRENT TOKEN: A-31
--------------------------------

Queue Information

--------------------------------
ADVERTISEMENT
--------------------------------
```

The advertisement area must work well on TV screens.

---

# 13. Advertisement Architecture

Do NOT hard-code Google AdSense or another advertising provider directly into the queue UI.

Create a reusable:

```
AdvertisementSlot
```

component/service.

It should support:

- Image advertisements
- HTML advertisements
- External ad provider
- Internal clinic/platform advertisements
- Campaign start/end dates
- Target clinic
- Target location
- Device type
- Impression tracking
- Click tracking

Example:

```
<AdvertisementSlot
    placement="PATIENT_QUEUE_BOTTOM"
/>
```

and:

```
<AdvertisementSlot
    placement="TV_VIEWER_BOTTOM"
/>
```

The actual advertising provider should be configurable later.

This allows integration with:

- Google AdSense
- Google Ad Manager
- Direct advertisers
- Local businesses
- Platform-managed advertisements

Do not make the architecture dependent on one ad provider.

---

# 14. WhatsApp Chatbot

Integrate WhatsApp using the official WhatsApp Business Platform/API.

Do not build an unofficial WhatsApp automation system.

See also Section 53 (conversation state machine, idempotency, templates) and the Repo 2 analysis from Phase 0.

The chatbot should allow customers to perform important actions without opening the web application.

Possible flow:

```
User → WhatsApp

"Hi"
```

Bot:

```
Welcome to QueueApp.

1. Check Queue
2. Book Appointment
3. My Appointment
4. My Queue Status
5. Register
6. Help
```

---

# 15. WhatsApp Registration

Example:

User:

```
Register
```

Bot:

```
Please enter your mobile number.
```

Then:

```
OTP verification
```

After successful verification:

```
Please enter your name.
```

Then:

```
Registration completed.
```

The backend should associate the WhatsApp number with the user's account.

---

# 16. WhatsApp Queue Status

User:

```
Status
```

Bot:

```
Please select your active appointment.
```

Then:

```
ABC Clinic
Dr. Sharma
Token A-37
```

Bot:

```
Current Token: A-31
Your Position: 6
People Ahead: 5
Estimated Wait: 32 minutes
```

---

# 17. WhatsApp Appointment Booking

Allow users to:

- Search/select clinic
- Select doctor
- Select service
- Select date
- Select available slot
- Confirm booking
- Complete payment where required
- Receive booking confirmation

Example:

```
ABC Clinic

Dr. Sharma

Available Slots:

4:00 PM
4:20 PM
4:40 PM
```

User selects:

```
4:20 PM
```

Bot provides booking details and payment link if payment is required.

---

# 18. WhatsApp Notifications

Send notifications for:

### Registration

```
Registration successful.
```

### Appointment confirmation

```
Your appointment at ABC Clinic is confirmed.
```

### Queue update

```
Your turn is approaching.
```

### Near turn

```
There are approximately 2 patients ahead of you.
```

### Turn called

```
Token A-37 is now being called.
```

### Cancellation

```
Your appointment has been cancelled.
```

Do not spam users.

Implement configurable notification rules.

---

# 19. WhatsApp API Architecture

Create an abstraction:

```
NotificationService
```

with providers such as:

```
WhatsAppProvider
SMSProvider
EmailProvider
```

This allows additional providers later.

WhatsApp integration should support:

- Webhooks
- Incoming messages
- Outgoing messages
- Message templates
- Delivery status
- Failed message handling
- Retry mechanisms

Keep API credentials in environment variables/secrets.

---

# 20. Admin Dashboard

Create a modern dashboard.

Example:

```
-----------------------------------------
Today's Queue
-----------------------------------------

Current Token       A-31
Waiting             14
Completed           27
Avg Wait            24 min

-----------------------------------------

QUEUE

A-32   Waiting
A-33   Waiting
A-34   Waiting
A-35   Waiting

[CALL NEXT]
```

The dashboard should be usable on:

- Desktop
- Tablet
- Mobile

But desktop should be the primary receptionist experience.

---

# 21. Offline Patient Management

Receptionists must be able to add walk-in patients.

Example:

```
Add Patient

Name
Mobile Number
Doctor
Service

[Generate Token]
```

The system should recognize an existing patient when possible rather than creating duplicate users.

---

# 22. Patient Profile

Patient account should contain:

- Name
- Mobile number
- Email
- Appointment history
- Active appointments
- Queue history
- Clinics visited
- Payment history
- Notification preferences

Do not expose patient information to other patients.

---

# 23. Reports

Clinic admins should be able to generate:

### Daily report

Include:

- Date
- Clinic
- Doctor
- Token
- Patient name
- Patient mobile
- Appointment
- Arrival time
- Waiting time
- Service time
- Completion status
- Payment status
- Booking amount

### Monthly report

Include aggregated and detailed information.

Export:

- PDF
- Excel/XLSX

Allow filters:

- Date range
- Doctor
- Service
- Status
- Payment status

Large reports should be generated asynchronously if necessary.

---

# 24. Database Design

Design a proper relational database.

Suggested entities:

```
User
PatientProfile
Clinic
ClinicStaff
Doctor
Service
Queue
QueueEntry
Appointment
Payment
QRAccessToken
DisplayDevice
Notification
WhatsAppConversation
WhatsAppMessage
Advertisement
AdvertisementCampaign
AdvertisementImpression
AdvertisementClick
Report
AuditLog
Subscription
ClinicSettings
Announcement
AnnouncementTranslation
AnnouncementTarget
AnnouncementSchedule
AnnouncementTemplate
CallAnnouncementSetting
AnnouncementDeliveryLog
```

(Announcement table details are in Section 51.9.)

Design relationships carefully.

Use indexes for:

- clinic_id
- doctor_id
- queue_id
- appointment date
- token status
- mobile number
- public queue identifier

---

# 25. Recommended Technology Stack

You have complete freedom to select technology.

However, prioritize an economical startup-friendly stack.

A strong default architecture could be:

## Frontend

```
React
TypeScript
Vite
Tailwind CSS
```

Use a responsive component architecture.

Consider PWA support.

## Backend

Prefer:

```
Java + Spring Boot
```

because the application requires:

- Authentication
- Payments
- Scheduling
- WhatsApp integration
- Reports
- Database transactions
- REST APIs
- WebSockets

Alternative technologies are acceptable if you can justify them.

## Database

Prefer:

```
PostgreSQL
```

Use a managed PostgreSQL provider initially.

## Authentication

Patient:

```
OTP/passwordless authentication
```

Admin:

```
Secure login + MFA/OTP where appropriate
```

## Real-time queue

Prefer:

```
WebSocket
```

with polling fallback.

## Storage

Use inexpensive object storage for:

- Clinic logos
- Reports
- Advertisement images
- Documents

## Deployment

Prefer inexpensive managed cloud infrastructure initially.

Architecture should allow deployment on:

- AWS
- Azure
- GCP
- Render
- Railway
- DigitalOcean
- similar providers

Do not introduce Kubernetes unless scale genuinely requires it.

---

# 26. PWA Support

The patient application should behave like an installable mobile web app.

Support:

- Add to Home Screen
- Responsive layouts
- Offline-friendly static assets
- Fast loading
- Push notifications where supported

Do not require users to download a native Android/iOS application initially.

The first version should be a responsive web/PWA application.

---

# 27. UI/UX Requirements

The design should be:

- Minimalistic
- Modern
- Clean
- Pleasant
- Professional
- Highly readable
- Accessible
- Mobile-first

Avoid:

- Excessive gradients
- Excessive animations
- Cluttered dashboards
- Tiny fonts
- Excessive colors

Use a professional healthcare-oriented visual language.

Typography must remain readable on:

- 360px mobile screens
- Tablets
- 1080p laptops
- Large TV displays

---

# 28. Navigation

Patient:

```
Home
Clinics
Appointments
Queue Status
Profile
```

Admin:

```
Dashboard
Queue
Appointments
Patients
Doctors
Services
Reports
TV Displays
Announcements
Settings
```

Super Admin:

```
Dashboard
Clinics
Users
Subscriptions
Advertisements
Announcements (platform-wide)
Reports
System Settings
Audit Logs
```

Viewer:

```
Dedicated fullscreen queue display
```

---

# 29. QR Generation

Every clinic should be able to generate:

### Clinic QR

For accessing clinic information/booking.

### Queue QR

For checking the status of a particular queue/token.

### Patient Token QR

A patient-specific QR can be generated after booking/check-in.

The patient-specific QR should open the token status page directly.

Example:

```
Scan QR

↓

Queue Status

Token: A-37
Current: A-31
Position: 6
Estimated Wait: 32 min
```

No login should be required merely to view this page.

---

# 30. Estimated Waiting Time

Implement a reasonable ETA algorithm.

Do not simply calculate:

```
people × fixed minutes
```

if enough historical data exists.

Initially use:

```
Average service time × people ahead
```

Then improve the algorithm using historical data:

- Doctor
- Service
- Time of day
- Day of week
- Historical service duration

Always clearly label waiting time as:

```
Estimated waiting time
```

because actual waiting time can change.

---

# 31. Real-Time Synchronization

When receptionist calls:

```
A-32
```

the following should update almost immediately:

- Patient queue page
- Patient dashboard
- TV viewer
- Admin dashboard
- WhatsApp status where appropriate
- Announcements and voice call-outs on the TV viewer and patient page

Avoid requiring the user to refresh the page manually.

---

# 32. Security Requirements

Implement:

- HTTPS
- Secure authentication
- OTP rate limiting
- API rate limiting
- JWT/session security
- Secure cookies where applicable
- CSRF protection where applicable
- Input validation
- Output encoding
- SQL injection protection
- XSS protection
- Secure file uploads
- Payment webhook verification
- Role-based authorization
- Tenant-level authorization
- Audit logging
- Secret management
- Encryption of sensitive information where appropriate

Never trust:

- Frontend role
- Frontend payment status
- Frontend clinic ID
- Frontend user ID

All important authorization decisions must happen server-side.

---

# 33. Indian Market Considerations

The initial target market is India.

Consider:

- Indian mobile numbers
- INR currency
- UPI payments
- Razorpay/Cashfree/PhonePe
- WhatsApp Business
- Indian SMS providers
- GST/invoice requirements where applicable
- Indian date/time zone
- English + Hindi-ready architecture
- Low-cost hosting
- Low bandwidth environments

Design internationalization so additional languages can be added later.

---

# 34. Subscription / SaaS Architecture

Design the application so clinics can eventually pay for the software.

Potential plans:

```
Free
Basic
Professional
Enterprise
```

Possible limits:

- Number of doctors
- Number of staff
- Monthly appointments
- WhatsApp messages
- Reports
- TV displays
- Advertisement control
- Analytics

Do not necessarily implement the entire billing system in MVP, but design the database/API so it can be added without rewriting the system.

---

# 35. Advertisement Monetization

The platform owner should eventually be able to earn through advertisements.

Design the system so advertisements can be:

### Platform-wide

Shown across participating clinics.

### Clinic-specific

Shown only in a particular clinic.

### Location-specific

Shown to selected geographic areas.

### Device-specific

For example:

```
MOBILE
TABLET
DESKTOP
TV
```

### Placement-specific

```
PATIENT_QUEUE_BOTTOM
VIEWER_BOTTOM
PATIENT_HOME
CLINIC_PAGE
```

Track:

```
impressions
clicks
campaign duration
campaign status
```

Ensure advertisements never obscure essential medical/queue information.

---

# 36. Accessibility

Follow good accessibility practices:

- WCAG-oriented design
- Keyboard navigation
- Sufficient contrast
- Proper labels
- Screen-reader-friendly structure
- Large touch targets
- Readable fonts
- Avoid relying only on color

---

# 37. API Architecture

Design REST APIs logically.

Example:

```
POST /api/auth/send-otp
POST /api/auth/verify-otp

GET /api/clinics
GET /api/clinics/{clinicId}

GET /api/clinics/{clinicId}/doctors
GET /api/clinics/{clinicId}/services

POST /api/appointments
GET /api/appointments/{id}

GET /api/queue/{publicToken}

POST /api/admin/queue/next
POST /api/admin/queue/{id}/skip
POST /api/admin/queue/{id}/recall

GET /api/reports/daily
GET /api/reports/monthly
```

Announcement endpoints are specified in Section 51.10.

Use consistent API response structures and error handling.

---

# 38. Backend Architecture

Use clean architecture principles.

Suggested layers:

```
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

Separate integrations:

```
PaymentService
WhatsAppService
NotificationService
ReportService
AdvertisementService
QueueService
AnnouncementService
```

Use interfaces for external providers.

Example:

```
PaymentProvider
```

Implement:

```
RazorpayPaymentProvider
```

later allowing:

```
CashfreePaymentProvider
```

without rewriting business logic.

---

# 39. Background Jobs

Use scheduled/background jobs for:

- Appointment reminders
- Queue notifications
- WhatsApp messages
- Report generation
- Advertisement campaign status
- Cleanup of expired QR tokens
- Announcement activation/expiry and recurring windows
- Payment reconciliation

Use a suitable scheduler/job system.

Avoid blocking HTTP requests for long-running tasks.

---

# 40. Logging & Monitoring

Implement:

- Application logs
- Error logs
- Audit logs
- Payment logs
- WhatsApp delivery logs
- Queue event logs

Production system should be observable.

Design for integration with tools such as:

- Sentry
- Cloud logging
- Metrics/monitoring service

Do not over-engineer monitoring for MVP.

---

# 41. MVP Priorities

Clearly divide the application into:

## Phase 1 — MVP

Implement first:

1. Multi-clinic architecture
2. Patient registration
3. OTP login
4. Clinic discovery
5. Appointment booking
6. Payment integration
7. Queue management
8. Offline patient registration
9. QR queue status
10. Manual token status
11. TV viewer mode
12. Basic reports
13. Basic WhatsApp notifications
14. Advertisement slots
15. Responsive UI
16. Announcement system for TV viewer and patient queue page (Section 51)

## Phase 2

Add:

- Full WhatsApp chatbot
- Advanced analytics
- Advertisement management
- Subscription plans
- Multiple payment providers
- Advanced ETA prediction
- Push notifications
- Multi-language support

## Phase 3

Add:

- Advanced analytics
- AI-assisted queue prediction
- Automated clinic insights
- Dynamic advertisement targeting
- Enterprise features
- Multi-location hospital chains

---

# 42. Important Product Principle

Do not force users to create an account for simple queue-status viewing.

There should be two experiences:

### Fast public experience

```
Scan QR
   ↓
Queue Status
```

No login.

OR:

```
Enter Token
   ↓
Queue Status
```

### Full patient account experience

```
Login with OTP
   ↓
Appointments
Booking
Payment
History
Multiple Clinics
Profile
```

This distinction is extremely important for reducing friction.

---

# 43. Patient Account Across Multiple Clinics

A patient's account must be platform-wide, not clinic-specific.

For example:

```
Nikhil
Mobile: XXXXXXX1234
```

can book:

```
ABC Clinic
XYZ Hospital
PQR Dental
```

using the same account.

Do not create a separate login for every clinic.

---

# 44. Clinic Data Isolation

Even though the patient account is global, clinic-specific information must remain isolated.

For example:

Patient:

```
Nikhil
```

can have:

```
ABC Clinic appointment
XYZ Clinic appointment
```

But ABC Clinic should only access information that it is authorized to access according to the platform's privacy/data model.

---

# 45. Error Handling

Provide user-friendly errors.

Examples:

```
OTP expired
Invalid OTP
Too many OTP requests
Slot unavailable
Payment failed
Payment pending
Queue paused
Appointment cancelled
Token expired
Clinic closed
```

Never expose raw stack traces to users.

---

# 46. Deliverables

Before writing implementation code, produce:

1. System architecture
2. Technology selection with justification
3. Database ER diagram description
4. Database schema
5. API specification
6. Authentication architecture
7. Multi-tenant architecture
8. Queue state machine
9. Appointment flow
10. Payment flow
11. QR flow
12. WhatsApp flow
13. TV viewer flow
14. Advertisement architecture
15. Security architecture
16. Deployment architecture
17. Folder/project structure
18. MVP implementation roadmap
19. Announcement system design (Section 51)
20. Reference repository analysis (Part 0.4)

Then implement the application incrementally.

---

# 47. Coding Requirements

When implementing:

- Use TypeScript on frontend where applicable.
- Use strong typing.
- Follow clean code principles.
- Keep components modular.
- Keep business logic out of controllers.
- Validate all incoming requests.
- Use DTOs.
- Use database migrations.
- Use environment variables for secrets.
- Never commit API keys.
- Write meaningful error messages.
- Add unit tests for critical business logic.
- Add integration tests for important APIs.
- Add tests for queue transitions and payment verification.

---

# 48. Queue State Machine

Explicitly model valid queue transitions.

Example:

```
WAITING
   ↓
CALLED
   ↓
IN_SERVICE
   ↓
COMPLETED
```

Possible alternate paths:

```
WAITING → CANCELLED
WAITING → NO_SHOW
CALLED → SKIPPED
SKIPPED → CALLED
```

Prevent invalid transitions.

---

# 49. Important Real-World Edge Cases

Handle:

- Two receptionists calling next simultaneously
- Two users attempting the same appointment slot
- Payment succeeds but frontend disconnects
- Payment succeeds but webhook arrives late
- Payment webhook arrives twice
- Patient scans an expired QR
- Patient scans someone else's QR
- Queue is paused
- Doctor becomes unavailable
- Clinic closes unexpectedly
- Internet temporarily disconnects
- TV loses connection
- Patient cancels appointment
- Patient doesn't arrive
- Duplicate patient registration
- Multiple appointments
- Multiple doctors
- Multiple queues
- Emergency priority patients
- Announcement expiring while displayed, overlapping announcements, sound blocked by TV browser
- Cross-tenant announcement access attempts

Use database transactions/locking/idempotency where appropriate.

---

# 50. Final Development Goal

The final application should feel like a polished SaaS product rather than a college project.

Prioritize:

```
Simplicity
Reliability
Speed
Security
Low operating cost
Good UX
Scalability
```

The application should be capable of starting with:

```
5 clinics
↓
50 clinics
↓
500 clinics
↓
5,000+ clinics
```

without requiring a complete architectural rewrite.

Do not prematurely over-engineer the system.

Build the simplest architecture that can realistically support the expected growth.

---


# 51. Announcement System (Viewer Mode + Patient Mode) — NEW, MVP

Build a first-class **Announcement System** so a clinic can communicate with waiting patients through the **TV Viewer** and the **patient queue status page**, without any login for the viewer.

Use the learnings from Repo 1 (Phase 0) to improve the design, but implement it cleanly for our multi-tenant architecture.

## 51.1 Two kinds of announcements

### A. Automatic call-out announcements (system-generated)

Triggered by queue events. No staff typing required.

| Event | Viewer behaviour |
|---|---|
| Token called | Large flash/highlight of token + counter/room/doctor, optional chime, optional voice |
| Token recalled | Same as above, marked "Recall" |
| Token skipped | Subtle notice in the queue list (no loud alert) |
| Queue paused | Persistent banner: "Queue is paused. Please wait." |
| Queue resumed | Brief banner, then removed |
| Doctor on break / unavailable | Banner linked to that doctor/queue |
| Emergency priority patient inserted | No patient details shown; may display a neutral notice only if the clinic enables it |

Voice call-outs must use the **browser's built-in speech synthesis (Web Speech API)** by default, since it is free and works on most TV browsers, with:

- Language selection (English, Hindi; architecture ready for more)
- Configurable message template, for example: `Token {token}, please proceed to {room}` (and a Hindi equivalent)
- Repeat count (default 2) and gap between repeats
- A chime sound before the voice
- A **one-time "Enable Sound" interaction screen** when the viewer starts, because browsers block autoplay audio until a user gesture. Show a clear on-screen state ("Sound ON/OFF") so the receptionist can verify.
- Graceful fallback to visual-only when speech synthesis or the language voice is unavailable
- A queue for call-outs so two quick calls do not talk over each other (play sequentially, drop stale ones older than a configurable age)

### B. Custom announcements (written by clinic staff)

Examples: "Dr. Sharma will be 20 minutes late", "Clinic closes at 5 PM today", "Free diabetes check-up camp on Sunday", "Please keep your token ready", "Emergency: please clear the corridor".

## 51.2 Announcement fields (conceptual model)

- `title` (optional) and `body` (plain text, short; enforce a max length such as 280 characters)
- `translations` (optional per-language title/body, for example `en`, `hi`)
- `type`: `INFO`, `NOTICE`, `DELAY`, `CLOSURE`, `HEALTH_TIP`, `EMERGENCY`, `PROMOTION`
- `priority`: `LOW`, `NORMAL`, `HIGH`, `CRITICAL`
- `display_mode`: `TICKER` (scrolling/rotating line), `CARD` (rotating panel), `FULLSCREEN_TAKEOVER` (emergencies only)
- `audio`: `NONE`, `CHIME`, `VOICE` plus repeat count
- `image` (optional, via secure object storage upload, validated type/size)
- `starts_at`, `ends_at`, optional recurring daily time window, and timezone (default `Asia/Kolkata`)
- `status`: `DRAFT`, `SCHEDULED`, `ACTIVE`, `PAUSED`, `EXPIRED`, `ARCHIVED`
- Targeting: whole clinic, specific doctors, specific queues, specific display devices, and optionally the patient page only, TV only, or both
- `scope`: `CLINIC` or `PLATFORM` (platform-wide announcements created only by Super Admin)
- `created_by`, `updated_by`, timestamps, soft delete
- `dismissible_on_patient_page` (boolean; never allow dismissal of CRITICAL notices)

## 51.3 Viewer (TV) layout rules and priority

The viewer is divided into protected zones:

```
+--------------------------------------------------+
| CLINIC NAME / LOGO                    Time        |
+--------------------------------------------------+
|  NOW SERVING            |  NEXT / WAITING LIST    |
|      A-31               |  A-32  A-33  A-34 ...   |
|  Room 2 · Dr. Sharma    |                         |
+--------------------------------------------------+
|  ANNOUNCEMENT PANEL (rotating cards / ticker)     |
+--------------------------------------------------+
|  ADVERTISEMENT SLOT (TV_VIEWER_BOTTOM)            |
+--------------------------------------------------+
```

Hard rules:

1. **"Now Serving" is never covered, resized below readable size, or delayed by an announcement or ad.**
2. Display priority (highest first): token call-out → `CRITICAL`/emergency takeover → `HIGH` → `NORMAL` → `LOW` → advertisements.
3. `FULLSCREEN_TAKEOVER` is allowed only for `EMERGENCY` type, only for users with the right permission, auto-dismisses at `ends_at` or after a maximum duration (default 60 seconds, configurable), and always keeps the current token visible in a corner.
4. Multiple active announcements rotate in the panel (default 8–10 seconds each, configurable). The ticker is for short, low-priority items.
5. If there are no active announcements, the panel collapses so the queue list can use the space (or shows the advertisement slot).
6. Respect `prefers-reduced-motion`; avoid flashing faster than 3 times per second (accessibility/photosensitivity).
7. Text must remain readable from a distance (large type, high contrast, minimal decoration) and must scale with the clinic's configured font size.

## 51.4 Patient mode (queue status page) behaviour

- On `/queue/<publicToken>`, show applicable active announcements as a **banner above the queue status card**, never replacing token/position/ETA.
- The same targeting rules apply (clinic, doctor, queue).
- Announcements shown to patients must contain **no personal data** about any patient.
- `CRITICAL` announcements are not dismissible. Others may be dismissible per session.
- The announcement banner and the `AdvertisementSlot` must be separate components; ads never appear inside the announcement banner.

## 51.5 Admin (receptionist) experience

Add **Announcements** to the clinic admin navigation.

- List view with filters: status, type, doctor, date; quick enable/pause/archive
- Create/edit form with a **live TV preview** (16:9) and a **mobile preview**
- Templates for one-click use: *Doctor running late (X minutes)*, *Doctor on leave today*, *Clinic closing early*, *Lab sample collection closed*, *Emergency notice*, *Holiday notice*, *Please keep token ready*
- **Quick-action buttons on the Queue screen**: "Doctor delayed", "Pause queue with message", "Test announcement on TV"
- Schedule start/end, repeat window, and targeting
- Duplicate an announcement
- "Send a test call-out" button to verify TV sound/voice
- Show which TV devices are currently online and what each is displaying
- Receptionists can create/edit announcements only for their own clinic; every create/update/delete/takeover action is **audit-logged**

## 51.6 Super Admin

- Create **platform-wide** announcements (for example, maintenance notice) with scope `PLATFORM`
- View announcement usage/volume per clinic (counts only; no patient data)
- Platform-wide announcements must be visually distinguishable from clinic announcements and can be limited by plan

## 51.7 Real-time delivery

- Push `announcement.created`, `announcement.updated`, `announcement.deleted`, `announcement.expired`, and `queue.called` events through the same real-time channel as the queue (WebSocket preferred, SSE alternative) with a **polling fallback** (for example every 10–15 seconds).
- The viewer must also compute expiry **locally** from `starts_at`/`ends_at` so announcements disappear on time even if the connection drops.
- On reconnect, the viewer fetches a full snapshot (active announcements + queue state) and reconciles it. Events must be idempotent and carry a version/timestamp so out-of-order delivery cannot show stale data.
- Cache the last known snapshot in the browser so a TV that briefly loses internet still shows the last known token with a visible "Reconnecting…" indicator (never silently show stale data as live).
- Include a heartbeat so admins can see which displays are online.

## 51.8 Optional WhatsApp/SMS broadcast for urgent changes (Phase 2, design now)

For `DELAY` and `CLOSURE` announcements, design (but do not necessarily enable in MVP) an option to notify **only patients with active bookings for the affected doctor/queue** through approved WhatsApp templates:

- Respect notification preferences and opt-out
- Rate limit and de-duplicate (never spam)
- Log delivery status
- Use the same `NotificationService` abstraction as Section 19

## 51.9 Data model (add to Section 24)

```
Announcement
AnnouncementTranslation
AnnouncementTarget        (clinic / doctor / queue / display_device)
AnnouncementSchedule      (recurrence windows)
AnnouncementTemplate      (system + clinic-defined)
CallAnnouncementSetting   (per clinic: voice on/off, language, template text, repeat, chime)
AnnouncementDeliveryLog   (optional, for broadcast/analytics; no patient PII)
```

Every table includes `clinic_id` (nullable only for `PLATFORM` scope), indexes on `(clinic_id, status, starts_at, ends_at)`, and proper foreign keys. Use soft delete and keep an audit trail.

## 51.10 API (add to Section 37)

```
# Admin (authenticated, clinic-scoped)
GET    /api/admin/announcements
POST   /api/admin/announcements
GET    /api/admin/announcements/{id}
PUT    /api/admin/announcements/{id}
POST   /api/admin/announcements/{id}/pause
POST   /api/admin/announcements/{id}/resume
POST   /api/admin/announcements/{id}/archive
POST   /api/admin/announcements/{id}/duplicate
POST   /api/admin/announcements/test-callout
GET    /api/admin/announcement-templates
GET    /api/admin/settings/callout
PUT    /api/admin/settings/callout

# Super admin
GET    /api/super/announcements
POST   /api/super/announcements

# Public, read-only, rate-limited, no PII
GET    /api/viewer/{displayToken}/snapshot        (queue + active announcements + ads config)
GET    /api/viewer/{displayToken}/events          (SSE) or WebSocket endpoint
GET    /api/queue/{publicToken}/announcements     (active announcements for that token's clinic/doctor/queue)
```

Use consistent response/error structures. Validate with DTOs. Display tokens are cryptographically random, revocable, rotatable, and scoped to one clinic (and optionally one queue).

## 51.11 Security and edge cases

- **Plain text only** (or a very restricted, sanitized subset). Never render announcement content as raw HTML; prevent XSS on TV and patient pages.
- Strict tenant isolation: Clinic A can never create, read, or influence announcements shown for Clinic B.
- Role checks server-side (receptionist, clinic admin, super admin). Emergency takeover requires a specific permission.
- Rate limit public viewer endpoints; revoke/rotate a leaked display token without affecting other displays.
- File uploads (announcement images): validate type/size, strip metadata, store in object storage, serve through safe URLs.
- Edge cases to handle and test: overlapping announcements, expired while displayed, two admins editing the same announcement (use versioning/optimistic locking), TV clock skew (rely on server time offset), timezone and daylight rules, very long text, missing translation (fall back to default language), voice unavailable, sound blocked by browser, TV browser crash/reload (auto-recover), burn-in prevention for always-on TVs (subtle periodic layout shift or screensaver-safe design), and a paused queue with an active takeover.

## 51.12 Acceptance criteria (Given / When / Then)

1. **Scheduled display:** Given an announcement scheduled 10:00–11:00, when the viewer is open at 10:30 it shows it; at 11:01 it disappears without a manual refresh.
2. **Targeting:** Given an announcement targeted to Dr. Sharma's queue, when a TV for Dr. Singh's queue is open, it does not show it.
3. **Tenant isolation:** Given Clinic A's admin token, when it calls any announcement endpoint with a Clinic B identifier, the API returns a forbidden/not-found response and writes an audit entry.
4. **Call-out:** Given sound is enabled, when the receptionist clicks **Call Next**, the TV highlights the token within about 2 seconds and speaks the configured message with the configured repeat count.
5. **Autoplay handling:** Given the TV has not been interacted with, the viewer shows an "Enable Sound" prompt and remains fully functional visually without sound.
6. **Priority:** Given a normal announcement and a token call happening simultaneously, the call-out takes priority and the announcement resumes afterward.
7. **Emergency takeover:** Given an emergency takeover, the current token stays visible and the takeover auto-dismisses at its end time or maximum duration.
8. **Reconnect:** Given the internet drops for 60 seconds, the TV shows a "Reconnecting…" indicator, then reconciles to the correct state with no duplicated or stale announcements.
9. **Patient page:** Given an active clinic announcement, the patient queue page shows it above the status card, without hiding token/position/ETA, and contains no patient PII.
10. **Security:** Given announcement text containing script tags, the content is rendered as inert text.
11. **Responsive/accessible:** The viewer remains readable at 1080p and 4K, the admin form works at 360px, and the patient banner meets contrast requirements.
12. **Tests:** Unit tests for scheduling/expiry logic and priority resolution, integration tests for tenant isolation and RBAC, and an end-to-end test for the call-out flow exist and pass.

## 51.13 Lessons from the FQM reference project (apply these to the design)

1. **Audio permission handling:** the display must never be blocked by the browser's autoplay restriction. Show a non-blocking "Enable Sound" prompt, keep working visually, and remember sound state (FQM had to fix a bug where this warning blocked the screen).
2. **No-internet TTS failure:** the browser's speech voices may be cloud-based on some TVs. Detect failure/timeouts and fall back to chime + visual highlight; never freeze the call-out queue because speech failed. Optionally support pre-recorded or server-generated audio files per language later.
3. **Audio queue control:** make call-out queuing configurable (play sequentially vs. replace with the newest call), with a maximum age so stale calls are dropped.
4. **Duck/mute other media:** if an advertisement or video is playing sound, mute or lower it while a call-out or voice announcement plays.
5. **Multiple displays:** support several viewer screens per clinic, each routed to specific doctors/queues/rooms (for example Waiting Hall TV vs Lab TV), each with its own display token and settings.
6. **Display templates:** offer layouts such as *Now serving + next list*, *Last 4 called tokens*, and *Single large token*. Add a setting to hide queue index numbers where clinics prefer more privacy.
7. **Low-spec device performance:** TVs and cheap Android boxes are slow. Avoid heavy animation, large images and continuous repaints; provide a "Reduce effects" option and test on a throttled CPU. Keep CPU usage low during long unattended runs.
8. **Race conditions in audio caching:** if any generated audio is cached, key the cache by language + text and write files atomically; prefer browser speech to avoid this entirely in MVP.
9. **Easy language expansion:** keep call-out phrases and announcement templates in per-language message catalogs, so adding a language never needs code changes.
10. **Operational actions seen in FQM worth considering:** put-on-hold, recall, and a "time spent waiting" metric (these map to our `SKIPPED`/recall states and ETA data). Touch-screen ticket kiosks and receipt printing are **Phase 2/3**, not MVP.

## 51.14 Ideas from QueueLess for announcements

- Follow its pattern of per-queue WebSocket topics, using topics such as `/topic/clinics/{clinicId}/announcements` and `/topic/displays/{displayId}`. **Public viewer screens must not need a user login**: use read-only subscriptions authenticated by the revocable display token (Section 51.10), never a user JWT.
- Follow its notification-preference model for optional patient alerts about delays, and its audit-log approach for announcement actions.
- Follow its role-annotation pattern for new permissions such as `ANNOUNCEMENT_CREATE` and `ANNOUNCEMENT_EMERGENCY_TAKEOVER`.

---

# 52. Reference Repository Learnings (fill in after Phase 0)

**Preliminary decisions (pending approval of the M0 analysis):**

- Adopt the *ideas* of FQM's display-screen behaviours listed in Section 51.13; do **not** copy FQM code (MPL-2.0 is file-level copyleft and the architecture is single-tenant Flask/SQLite, which does not fit our multi-tenant React + API design).
- Take inspiration from QueueLess for the token model, WebSocket topics, notification preferences, analytics/export and audit-log ideas; do not copy its code.
- Adopt Repo 2's *router → orchestrator → handler* pattern only for optional AI features (Phase 2/3), with strict safeguards in Section 53.
- Do not copy code from Repo 2 (no visible licence).

After completing `docs/00-reference-analysis.md`, update this section with only the **approved** decisions, for example:

- Which announcement behaviours from Repo 1 we adopted/adapted (and which we rejected, with reasons)
- Which conversation-design patterns from Repo 2 we adopted for the WhatsApp bot (state machine, menu structure, fallbacks, session timeout), keeping the **official WhatsApp Business Platform only**
- Licence decisions and any attribution requirements

Do not copy code from either repository unless its licence clearly permits it and I have approved it.

---

# 53. WhatsApp Chatbot Design Notes (extends Sections 14–19)

Apply these on top of the original WhatsApp requirements:

- Model the conversation as an explicit **state machine** per user and clinic context (for example `MAIN_MENU → SELECT_CLINIC → SELECT_DOCTOR → SELECT_DATE → SELECT_SLOT → CONFIRM → PAYMENT_PENDING`), stored in the database with expiry (for example, session timeout after 15–30 minutes of inactivity).
- Always support global commands: `0`/`menu`, `back`, `cancel`, `help`, plus a human-handoff/support fallback.
- Verify the webhook signature, make processing **idempotent** by message ID, acknowledge quickly (return 200 fast) and process asynchronously.
- Handle the 24-hour customer-service window: outside it, only pre-approved **template messages** may be sent.
- Support English and Hindi from the start via message catalogs, not hard-coded strings.
- Use interactive messages (buttons/lists) where the official API supports them; fall back to numbered text menus.
- Log every inbound/outbound message and delivery status without storing unnecessary sensitive data.
- Never expose another patient's information; require OTP verification before showing personal appointment data.

## 53.1 Optional AI assistant layer (Phase 2/3, inspired by Repo 2)

The MVP bot must be **deterministic** (menus, buttons, keywords) so it is reliable and cheap. If we later add natural-language understanding:

- Use the *router → orchestrator → handler* pattern: an LLM classifies intent into a fixed set (for example `CHECK_QUEUE`, `BOOK`, `CANCEL`, `FAQ`, `HUMAN`) and returns **validated structured JSON** (reject anything that does not match the schema).
- **The LLM never writes to the database or books anything directly.** All bookings, cancellations and payments go through the same validated service layer, authorization checks, and idempotent transactions as the web app.
- Slot availability checks **fail closed**: on any error treat the slot as unavailable.
- Use retrieval (RAG) only for non-sensitive clinic FAQs (timings, services, preparation instructions, location), scoped per clinic so one clinic's knowledge never leaks into another's answers.
- Do not send patient personal or medical data to an external LLM unless necessary, and document what is sent. Defend against prompt injection (treat user text as data, never as instructions).
- Store conversation history in the database (with expiry), not in local files.
- Our database is the **source of truth** for appointments; calendar sync (Google Calendar) can be an optional one-way export for doctors in a later phase.
- Note that Repo 2 targets Telegram and web chat; take WhatsApp specifics (templates, 24-hour window, interactive messages, webhooks) from the official WhatsApp Business Platform docs.

---

# 54. Updated Project Conventions (supplements Section 47)

- Repository layout: monorepo with `apps/web` (React + TypeScript + Vite + Tailwind), `apps/api` (backend), `packages/shared` (shared types), `docs/`, `scripts/`, and `docker-compose.yml` for local database.
- Provide scripts: `dev`, `test`, `lint`, `typecheck`, `build`, `migrate`, `seed`.
- Provide a `README.md` that lets a non-expert run the project locally in under 10 minutes.
- Create `docs/` files: `00-reference-analysis.md`, `01-architecture.md`, `02-schema.md`, `03-api.md`, `04-flows.md`, `05-security.md`, `06-deployment.md`, `PROGRESS.md`.
- Add `.env.example`, a seed script with demo clinics, and a mock payment provider and mock WhatsApp provider so the app can be demoed without real credentials.
- Add a `/health` endpoint and structured JSON logging with request IDs.

---

# FIRST TASK

You are starting at **Phase 0 / Milestone M0 and M1**. Follow Part 0 working rules.

Step 1 — **Reference analysis (M0):** read the three reference repositories on GitHub as described in Part 0.4 (no cloning or running) and write `docs/00-reference-analysis.md`. Stop and wait for approval.

Step 2 — **Architecture (M1):** analyse the complete requirements in this file and produce, in `docs/`:

1. Recommended technology stack
2. Why each technology was selected
3. High-level architecture diagram in Mermaid
4. Multi-tenant strategy
5. Complete database schema/ERD (including announcement tables)
6. User-role permission matrix (including announcement permissions)
7. Queue state machine
8. Complete user flows
9. API endpoint specification (including announcement and viewer endpoints)
10. Payment architecture
11. WhatsApp architecture
12. QR architecture
13. TV viewer architecture (including call-out and announcement rendering)
14. Announcement system architecture (Section 51)
15. Advertisement architecture
16. Security architecture
17. Deployment architecture
18. MVP vs Phase 2 feature breakdown
19. Estimated development complexity
20. Estimated monthly infrastructure/API costs for an initial Indian startup deployment
21. Recommended implementation order (aligned to Part 0.5)

Do NOT start writing application code yet.

First validate the architecture and identify potential problems, security issues, scalability concerns, and unnecessary complexity. List open questions for me.

After I approve the architecture, implement the project **one milestone at a time** (Part 0.5), following the 10 Best Practices in Part 0.2, ensuring every feature works and is tested before moving to the next module. After each milestone, give me the plain-language summary format from Part 0.1.
