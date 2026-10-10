# Multi-Clinic Queue, Appointment & Announcement Platform

A multi-tenant SaaS application designed for clinics, diagnostic centers, and individual doctors to manage physical patient queues, appointment scheduling, and real-time smart TV announcements.

---

## 🚀 Quickstart (< 5 Minutes)

### Prerequisites
- **Node.js**: v18+ (tested on v18.17.1 LTS)
- **npm**: v10+

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy example environment
cp .env.example .env
```

### 3. Initialize Database & Seed Demo Data
```bash
# Sync database schema (SQLite in local dev, PostgreSQL in Docker/Cloud)
npx prisma db push --schema=apps/api/prisma/schema.prisma

# Seed 2 demo clinics, staff, doctors, and sample queues
npx ts-node apps/api/prisma/seed.ts
```

### 4. Run Development Servers
```bash
npm run dev
```
- **Web App / Patient PWA**: [http://localhost:3000](http://localhost:3000)
- **REST API & Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

---

## 🧪 Verification & Testing

Run all automated checks in one command:
```bash
# Run unit & integration tests
npm test

# Type-check TypeScript across all workspaces
npm run typecheck

# Build all workspaces for production
npm run build
```

---

## 📁 Repository Structure

```
├── apps/
│   ├── api/            # NestJS Backend (REST API, STOMP WebSockets, Auth, Prisma ORM)
│   └── web/            # React + TypeScript + Vite + Tailwind CSS (Mobile Web / PWA / TV Display)
├── packages/
│   └── shared/         # Shared TypeScript DTOs, Enums (UserRole, QueueEntryStatus), Contracts
├── docs/               # System Architecture, Schemas, Security & Flow Specifications
├── docker-compose.yml  # Local PostgreSQL 16 & Redis 7 containers
└── CLAUDE.md           # Living project memory & Architecture Decision Records (ADRs)
```

---

## 🔐 Demo Credentials (Seeded)

| Role | Mobile Number | OTP Code | Notes |
|---|---|---|---|
| **Super Admin** | `+919999999999` | `123456` | Platform administration |
| **Clinic Receptionist** | `+919876500001` | `123456` | ABC Health Clinic staff |
| **Sample Patient** | `+919876511111` | `123456` | Pre-registered patient (Token A-01) |
| **New Walk-in Patient** | Any valid `+91XXXXXXXXXX` | `123456` | Auto-registers on first verification |
