# syntax=docker/dockerfile:1.7

# ==============================================================================
# Stage 1: Base Node 22 Alpine with pnpm
# ==============================================================================
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
RUN apk add --no-cache libc6-compat openssl curl

# ==============================================================================
# Stage 2: Builder (cached pnpm store + SDK build + Prisma Client + Next.js 16 standalone)
# ==============================================================================
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json ./packages/config/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/prisma ./apps/web/prisma

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod=false

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 1. Generate Prisma Client
RUN pnpm --filter @bloumeid/web exec prisma generate

# 2. Build Next.js 16 standalone output
RUN pnpm --filter @bloumeid/web build

# ==============================================================================
# Stage 3: Production Runner (Non-root nextjs user, PID 1 clean entrypoint)
# ==============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache libc6-compat openssl curl postgresql-client \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Create persistent data directory for MaxMind GeoLite2 .mmdb files
RUN mkdir -p /app/data/geoip && chown -R nextjs:nodejs /app/data

# Copy Next.js standalone build, static assets, public folder (including /sdk/v1/bloumeid.js) and Prisma migrations
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder --chown=nextjs:nodejs /app/docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
