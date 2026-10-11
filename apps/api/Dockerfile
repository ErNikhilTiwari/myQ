# ==============================================================================
# Production Dockerfile for @queueapp/api (NestJS + Prisma)
# Multi-stage build for optimal image size and security
# ==============================================================================

# Stage 1: Build & Prune
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma engine binary compatibility
RUN apk add --no-cache openssl

# Copy monorepo configuration and lockfiles
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all dependencies across monorepo workspaces
RUN npm ci

# Copy shared package source and build it first
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=@queueapp/shared

# Copy API source and Prisma schema
COPY apps/api/ ./apps/api/

# Generate Prisma Client binary
WORKDIR /app/apps/api
RUN npx prisma generate

# Compile TypeScript backend to dist/
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl curl

ENV NODE_ENV=production
ENV PORT=4000

# Create unprivileged user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy root node_modules and built dist packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api

# Health check endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main.js"]
