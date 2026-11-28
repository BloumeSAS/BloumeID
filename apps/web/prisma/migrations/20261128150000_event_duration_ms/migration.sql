-- Additive migration: persist client collection latency durationMs for real average collection time KPI
ALTER TABLE "FingerprintEvent" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER DEFAULT 0;
