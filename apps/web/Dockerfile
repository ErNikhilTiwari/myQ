# ==============================================================================
# Production Dockerfile for @queueapp/web (React + Vite + Nginx)
# Multi-stage build for ultra-small, secure production image
# ==============================================================================

# Stage 1: Build Static Assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo configuration
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy shared package and build contracts
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=@queueapp/shared

# Copy web source and assets
COPY apps/web/ ./apps/web/

# Build production bundle with Vite
WORKDIR /app/apps/web
RUN npm run build

# Stage 2: High Performance Nginx Server
FROM nginx:1.25-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static output from Stage 1
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom Nginx SPA and reverse proxy configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Security: Run Nginx with basic unprivileged parameters
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
