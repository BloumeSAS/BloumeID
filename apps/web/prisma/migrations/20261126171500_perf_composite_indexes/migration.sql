-- Additive performance indexes for FingerprintEvent dashboard, events, and usage queries
CREATE INDEX IF NOT EXISTS "FingerprintEvent_siteId_createdAt_idx" ON "FingerprintEvent"("siteId", "createdAt");
CREATE INDEX IF NOT EXISTS "FingerprintEvent_siteId_dangerLevel_createdAt_idx" ON "FingerprintEvent"("siteId", "dangerLevel", "createdAt");
