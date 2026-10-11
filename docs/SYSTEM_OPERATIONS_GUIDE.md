# QueueApp — Complete System Architecture, Operations & Deployment Guide

> **Release Version:** `v1.0.0-enterprise`  
> **Platform Target:** Multi-Clinic Healthcare SaaS (Queue Management, Appointments, Announcements, WhatsApp AI Chatbot)  
> **Documentation Scope:** Local Folder Structure, Git Repository Layout, Local Runbook, Cloud Deployment, and Third-Party API Integrations.

---

## 1. Local Filesystem Folder Structure

The project is structured as a **Turborepo/npm-workspaces monorepo** with strict boundary separation between backend services, frontend web applications, and shared contract packages.

```
c:\Users\vvipn\OneDrive\Desktop\queue app\
├── apps/
│   ├── api/                                # Backend REST API, WebSocket & Background Services (NestJS)
│   │   ├── prisma/
│   │   │   ├── dev.db                      # Local SQLite development database
│   │   │   ├── schema.prisma               # Local/test Prisma schema (SQLite)
│   │   │   ├── schema.postgresql.prisma    # Production Prisma schema (PostgreSQL)
│   │   │   └── seed.ts                     # Multi-clinic seed script with demo doctors & queues
│   │   ├── src/
│   │   │   ├── ads/                        # Advertisement management & impression tracking
│   │   │   ├── announcements/              # Multilingual TV tickers, takeovers & synthetic TTS
│   │   │   ├── appointments/               # Time-slot bookings & fail-closed availability
│   │   │   ├── auth/                       # Passwordless OTP auth & JWT strategies
│   │   │   ├── clinics/                    # Multi-tenant clinic & HospitalChain network APIs
│   │   │   ├── common/                     # RBAC RolesGuard, TenantGuard & Exception filters
│   │   │   ├── doctors/                    # Doctor profiles, room numbers & specialty management
│   │   │   ├── payments/                   # Multi-provider payments (Razorpay, Cashfree, PhonePe)
│   │   │   ├── prisma/                     # Prisma ORM client service wrapper
│   │   │   ├── push/                       # Web Push notification subscriptions & alerts
│   │   │   ├── queues/                     # Concurrency-safe atomic tokens & rolling dynamic ETA
│   │   │   ├── receptionist/               # Receptionist walk-ins & counter simulation
│   │   │   ├── reports/                    # Hourly traffic (08:00–20:00), CSV export & AI Insights
│   │   │   ├── services/                   # Clinic medical consultation services
│   │   │   ├── subscriptions/              # SaaS tiers (Free, Basic, Pro, Enterprise) & quotas
│   │   │   ├── viewer/                     # TV display snapshots, heartbeat & auto-rotation
│   │   │   ├── whatsapp/                   # Official Cloud API, NLU Intent Router & FAQ RAG
│   │   │   ├── app.module.ts               # Root NestJS module wiring all 18 domains
│   │   │   └── main.ts                     # Application entry point (port 4000)
│   │   ├── test/                           # 22 End-to-End Jest Integration Test Suites (108 tests)
│   │   │   ├── advanced-analytics.e2e.spec.ts
│   │   │   ├── ai-chatbot-rag.e2e.spec.ts
│   │   │   ├── ai-insights-targeting.e2e.spec.ts
│   │   │   ├── announcements.e2e.spec.ts
│   │   │   ├── appointments-payments.e2e.spec.ts
│   │   │   ├── auth.e2e.spec.ts
│   │   │   ├── dynamic-eta.e2e.spec.ts
│   │   │   ├── hospital-chains.e2e.spec.ts
│   │   │   ├── multiprovider-payments.e2e.spec.ts
│   │   │   ├── public-qr-token.e2e.spec.ts
│   │   │   ├── push-notifications.e2e.spec.ts
│   │   │   ├── queue-state-machine.e2e.spec.ts
│   │   │   ├── receptionist-dashboard.e2e.spec.ts
│   │   │   ├── reports.e2e.spec.ts
│   │   │   ├── security-audit.e2e.spec.ts
│   │   │   ├── subscriptions.e2e.spec.ts
│   │   │   ├── tenant-isolation.e2e.spec.ts
│   │   │   ├── tv-viewer.e2e.spec.ts
│   │   │   ├── whatsapp.e2e.spec.ts
│   │   │   └── whatsapp-chatbot.e2e.spec.ts
│   │   ├── Dockerfile                      # Multi-stage production container for API
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                                # Frontend Single Page Application (React + Vite + Tailwind)
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   │   ├── MobileTokenTracker.tsx  # Mobile-first QR tracker with live telemetry & Web Push
│       │   │   ├── ReceptionistConsole.tsx # Interactive counter desk (call next, hold, walk-in)
│       │   │   └── TVViewerKiosk.tsx       # Smart TV Kiosk (3 templates, dual-frequency chimes)
│       │   ├── App.tsx                     # Top navbar and view switcher
│       │   ├── index.css                   # Tailwind CSS styling
│       │   └── main.tsx                    # React DOM 18 root
│       ├── Dockerfile                      # Multi-stage production container (Nginx Alpine)
│       ├── nginx.conf                      # Production Nginx reverse-proxy & SPA fallback routing
│       ├── package.json
│       ├── tailwind.config.js
│       └── vite.config.ts
│
├── packages/
│   └── shared/                             # Shared TypeScript Contracts & DTOs
│       ├── src/
│       │   ├── ad.dto.ts
│       │   ├── announcement.dto.ts
│       │   ├── api-response.ts
│       │   ├── appointment.dto.ts
│       │   ├── auth.dto.ts
│       │   ├── clinic.dto.ts               # Includes ClinicDto and HospitalChainDto
│       │   ├── doctor.dto.ts
│       │   ├── push.dto.ts                 # Web Push keys & payload DTOs
│       │   ├── queue.dto.ts
│       │   ├── queue-status.enum.ts
│       │   ├── receptionist.dto.ts
│       │   ├── report.dto.ts               # HourlyTrafficDto, AIClinicInsightDto, Export DTOs
│       │   ├── roles.enum.ts               # SUPER_ADMIN, CLINIC_ADMIN, RECEPTIONIST, DOCTOR, PATIENT
│       │   ├── service.dto.ts
│       │   ├── subscription.dto.ts         # Plan limits, tier pricing & quota types
│       │   ├── viewer.dto.ts
│       │   ├── whatsapp.dto.ts
│       │   └── index.ts                    # Barrel export
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                                   # Architectural & Milestone Specifications
│   ├── 00-reference-analysis.md
│   ├── 01-architecture.md
│   ├── 02-schema.md
│   ├── 03-api.md
│   ├── 04-flows.md
│   ├── 05-security.md
│   ├── 06-deployment.md
│   ├── MASTER_PROMPT.md
│   └── PROGRESS.md
│
├── .env.example                            # Local development environment template
├── .env.production                         # Production deployment secrets template
├── docker-compose.yml                      # Local development compose (Postgres + Redis)
├── docker-compose.prod.yml                 # Production full-stack topology (API + Web + DB + Cache)
├── package.json                            # Monorepo root workspaces manifest
└── README.md
```

---

## 2. Git Repository & Branch Structure

The git repository enforces milestone traceability and release management:

```
[ Git Branches & Tags Topology ]

  main  (Tagged: v1.0.0-enterprise)  <--- Primary Production Branch (108/108 Tests Pass)
   │
   ├── feat/docker-production-topology       (Dockerfiles, Nginx, Compose, PostgreSQL schema)
   ├── feat/frontend-consoles-kiosk-tracker  (Receptionist Console, TV Kiosk, Mobile Tracker)
   ├── feat/phase3-push-notifications-wrap   (Web Push Notifications & Enterprise Wrap)
   ├── feat/phase3-ai-chatbot-rag-nlu        (AI NLU Router, FAQ RAG for Timings & Fees)
   ├── feat/phase3-ai-insights-targeting     (Bottleneck detection, Load Forecast, Ad Targeting)
   ├── feat/phase3-multi-location-chains     (HospitalChain networks & Multi-branch discovery)
   ├── feat/phase2-advanced-analytics-...    (Hourly distribution 08:00–20:00, Peak hour)
   ├── feat/phase2-multiprovider-payments    (Razorpay, Cashfree, PhonePe abstraction)
   ├── feat/phase2-advanced-eta-prediction   (Rolling historical consultation duration)
   ├── feat/phase2-subscriptions-...         (Free, Basic, Pro, Enterprise tiers & limits)
   ├── feat/phase2-chatbot-conversations     (WhatsApp multi-turn booking state machine)
   └── feat/m2-scaffold-auth ... feat/m13    (Phase 1 MVP Milestone Commits)
```

---

## 3. Local Development Guide (How to Run Locally)

### Prerequisites
- **Node.js:** `v20.x` or higher
- **npm:** `v10.x` or higher
- **Git**

### Step-by-Step Local Setup

#### Step 1: Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd "queue app"

# Install all monorepo dependencies across apps and shared packages
npm install
```

#### Step 2: Build the Shared Package
```bash
# Must be built first so apps/api and apps/web can reference compiled contracts
npm run build --workspace=@queueapp/shared
```

#### Step 3: Setup Local SQLite Database & Seed Data
```bash
cd apps/api

# Sync schema to local SQLite (creates apps/api/prisma/dev.db)
npx prisma db push

# Seed the database with demo clinics, doctors, queues, services, and staff
npm run db:seed
cd ../..
```

#### Step 4: Run Automated Tests
```bash
# Executes all 22 test suites (108 tests) sequentially
npm test --workspace=@queueapp/api
```

#### Step 5: Start Local Development Servers
Open two terminal windows:

- **Terminal 1 (Backend API on `http://localhost:4000`):**
  ```bash
  cd apps/api
  npm run dev
  ```
- **Terminal 2 (Frontend Client on `http://localhost:5173` or `http://localhost:3000`):**
  ```bash
  cd apps/web
  npm run dev
  ```

---

## 4. Production Cloud Deployment Guide

The platform uses a containerized multi-tier architecture capable of running on any cloud provider (AWS EC2, DigitalOcean Droplet, Hetzner, GCP Compute Engine, or Azure VM).

```
[ Production Topology ]
Internet (Clients, TV Screens, WhatsApp Webhooks)
         │  Port 80 / 443
         ▼
┌────────────────────────────────────────────────────────┐
│  Nginx Reverse Proxy & Static SPA Server (queueapp-web)│
│  - Serves React bundle with gzip & 1-year caching      │
│  - Reverse-proxies /api/ to NestJS                     │
│  - Reverse-proxies /socket.io/ (WebSockets)            │
└───────────────────────┬────────────────────────────────┘
                        │ Port 4000
                        ▼
┌────────────────────────────────────────────────────────┐
│  NestJS Backend API (queueapp-api)                     │
│  - Unprivileged user (nestjs:nodejs UID 1001)          │
│  - Multi-tenant RBAC & Queue State Machine             │
│  - Health-checked at /api/health                       │
└───────────────┬────────────────────────┬───────────────┘
                │ Port 5432              │ Port 6379
                ▼                        ▼
┌─────────────────────────┐  ┌───────────────────────────┐
│ PostgreSQL 16 (DB)      │  │ Redis 7 (Cache & PubSub)  │
│ Volume: pgdata_prod     │  │ Volume: redisdata_prod    │
└─────────────────────────┘  └───────────────────────────┘
```

### Production Deployment Steps

#### Step 1: Prepare Environment Secrets
Copy the production environment template on your remote server:
```bash
cp .env.production .env
```
Populate `.env` with strong passwords, database credentials, and production secret keys.

#### Step 2: Build & Start Containers
Run Docker Compose in detached mode:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

#### Step 3: Execute PostgreSQL Database Migrations
Once the database container is healthy, deploy the production PostgreSQL schema:
```bash
docker compose -f docker-compose.prod.yml exec api npm run db:deploy:pg
```

#### Step 4: Seed Initial Super Admin & Demo Clinics (Optional)
```bash
docker compose -f docker-compose.prod.yml exec api npm run db:seed
```

#### Step 5: Verify Deployment Health
Check service health status:
```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Test backend health check
curl -I http://localhost/api/health
```

---

## 5. Third-Party API Integration Guide

### 1. Official WhatsApp Business Cloud API (Meta)
The platform is integrated with the official Meta WhatsApp Graph API.

#### Prerequisites
1. Create a Meta Developer account at [developers.facebook.com](https://developers.facebook.com).
2. Set up a **WhatsApp Business App** in the Meta Developer Console.
3. Obtain a verified phone number and create a **System User** with `whatsapp_business_messaging` permissions to get a permanent token.

#### Configuration (`.env.production`)
```env
WHATSAPP_PHONE_NUMBER_ID="your_meta_phone_number_id"
WHATSAPP_ACCESS_TOKEN="your_permanent_system_user_token"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="create_a_random_verification_string"
META_APP_SECRET="your_meta_app_secret_from_app_settings"
```

#### Configuring the Webhook in Meta Console
1. In Meta Developer Portal $\rightarrow$ WhatsApp $\rightarrow$ **Configuration** $\rightarrow$ **Webhook**:
   - **Callback URL:** `https://your-domain.com/api/webhooks/whatsapp`
   - **Verify Token:** Enter the value set in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
2. Subscribe to the `messages` webhook field.
3. Every incoming user message automatically routes through:
   - HMAC-SHA256 signature verification (`x-hub-signature-256`)
   - Intent classification (`CHECK_QUEUE`, `BOOK_APPOINTMENT`, `FAQ`, `CANCEL`)
   - Multi-turn conversation state machine in [`whatsapp.service.ts`](file:///c:/Users/vvipn/OneDrive/Desktop/queue%20app/apps/api/src/whatsapp/whatsapp.service.ts).

---

### 2. Multi-Provider Payment Gateways (Razorpay / Cashfree / PhonePe)

The platform supports plug-and-play Indian payment processors via [`payments.service.ts`](file:///c:/Users/vvipn/OneDrive/Desktop/queue%20app/apps/api/src/payments/payments.service.ts).

#### A. Razorpay Integration
1. Register on [dashboard.razorpay.com](https://dashboard.razorpay.com) and generate API Keys.
2. In **Settings** $\rightarrow$ **Webhooks**, create a webhook pointing to:
   - **Webhook URL:** `https://your-domain.com/api/webhooks/razorpay`
   - **Secret:** Match with `RAZORPAY_WEBHOOK_SECRET`
   - **Events to subscribe:** `payment.captured`, `payment.failed`, `order.paid`
3. Configure environment variables:
   ```env
   RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
   RAZORPAY_KEY_SECRET="your_razorpay_secret"
   RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
   ```

#### B. Cashfree & PhonePe Integration
When creating payment orders via `POST /api/payments/orders`, specify the provider in the request body:
```json
{
  "appointmentId": "uuid-here",
  "amount": 500,
  "provider": "CASHFREE"  // or "PHONEPE" or "RAZORPAY"
}
```

---

### 3. Web Push Notifications (VAPID / Browser Notifications)
Enables patients and clinics to receive instant push alerts without third-party app installations.

#### Step 1: Generate VAPID Keys
Run the standard web-push generator:
```bash
npx web-push generate-vapid-keys
```
Output will contain:
- Public Key
- Private Key

#### Step 2: Configure Environment Variables
```env
VAPID_PUBLIC_KEY="BC7...generated_public_key..."
VAPID_PRIVATE_KEY="generated_private_key..."
VAPID_SUBJECT="mailto:support@your-domain.com"
```

#### Step 3: Frontend Subscription
When a patient taps *"Notify me on browser"* on the Mobile Token Tracker ([`MobileTokenTracker.tsx`](file:///c:/Users/vvipn/OneDrive/Desktop/queue%20app/apps/web/src/components/MobileTokenTracker.tsx)), the browser generates an endpoint and cryptographic keys (`p256dh`, `auth`) which are posted to `POST /api/push/subscribe`.

---

### 4. SMS OTP Gateway (MSG91 / Indian DLT Compliance)

#### Configuration
```env
OTP_PROVIDER=msg91
MSG91_AUTH_KEY="your_msg91_auth_key"
MSG91_TEMPLATE_ID="your_dlt_approved_template_id"
```
- In development, setting `OTP_PROVIDER=mock` allows passwordless OTP logins with fixed test OTPs (`123456`) without incurring SMS charges.
- In production with `OTP_PROVIDER=msg91`, [`auth.service.ts`](file:///c:/Users/vvipn/OneDrive/Desktop/queue%20app/apps/api/src/auth/auth.service.ts) dispatches DLT-compliant OTP tokens via MSG91 SendOTP API.

---

### 5. S3 / Cloudflare R2 Object Storage (Ads & Clinic Logos)
For storing TV advertisements and doctor image assets:
```env
STORAGE_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY="your_r2_access_key"
STORAGE_SECRET_KEY="your_r2_secret_key"
STORAGE_BUCKET="queueapp-production"
STORAGE_PUBLIC_URL="https://cdn.your-domain.com"
```

---

## 6. System Verification & Test Command Summary

| Purpose | Command | Expected Output |
|---|---|---|
| **Full API Test Suite** | `npm test --workspace=@queueapp/api` | `22 passed, 22 total` (108 tests) |
| **Monorepo Production Build** | `npm run build` | Zero TypeScript/Vite errors |
| **PostgreSQL Schema Push** | `npm run db:deploy:pg --workspace=@queueapp/api` | DB synchronized with Postgres |
| **Docker Production Up** | `docker compose -f docker-compose.prod.yml up -d` | All 4 containers healthy |
