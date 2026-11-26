#!/bin/sh
set -e

echo "[BloumeID] Starting container entrypoint..."

# 1. Wait for PostgreSQL availability when DATABASE_URL is configured
if [ -n "$DATABASE_URL" ]; then
  CLEAN_DB_URL=$(echo "$DATABASE_URL" | sed 's/?schema=.*//')
  echo "[BloumeID] Waiting for PostgreSQL database..."
  MAX_RETRIES=30
  COUNT=0
  until pg_isready -d "$CLEAN_DB_URL" >/dev/null 2>&1 || [ $COUNT -eq $MAX_RETRIES ]; do
    COUNT=$((COUNT + 1))
    echo "[BloumeID] Database not ready yet ($COUNT/$MAX_RETRIES), waiting 2s..."
    sleep 2
  done

  # 2. Run versioned Prisma migrations (never prisma db push in production)
  echo "[BloumeID] Applying versioned Prisma migrations (prisma migrate deploy)..."
  npx --yes prisma@6.19.3 migrate deploy --schema=/app/apps/web/prisma/schema.prisma || echo "[BloumeID] Warning: prisma migrate deploy skipped or handled externally"
fi

# 3. Trigger non-blocking background threat feed synchronization once server is up
(
  sleep 5
  if [ -n "$ADMIN_MASTER_KEY" ]; then
    curl -fsS -X POST "http://127.0.0.1:${PORT:-3000}/api/admin/settings" \
      -H "Content-Type: application/json" \
      -H "X-Admin-Master-Key: ${ADMIN_MASTER_KEY}" \
      -d '{"action":"sync_feeds"}' >/dev/null 2>&1 || true
  fi
) &

# 4. Exec Next.js standalone server as PID 1 so SIGTERM/SIGINT signals propagate cleanly
echo "[BloumeID] Launching Next.js standalone server on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}..."
if [ -f "/app/apps/web/server.js" ]; then
  exec node /app/apps/web/server.js
else
  exec node /app/server.js
fi
