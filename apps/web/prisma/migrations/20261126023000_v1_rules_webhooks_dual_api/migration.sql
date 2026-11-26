-- AlterTable Visitor (Additive v1.0.0 upgrade)
ALTER TABLE "Visitor" ADD COLUMN IF NOT EXISTS "trustStatus" TEXT NOT NULL DEFAULT 'neutral';
ALTER TABLE "Visitor" ADD COLUMN IF NOT EXISTS "mergedIntoId" TEXT;
CREATE INDEX IF NOT EXISTS "Visitor_trustStatus_idx" ON "Visitor"("trustStatus");

-- AlterTable FingerprintEvent (Additive v1.0.0 upgrade)
ALTER TABLE "FingerprintEvent" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "FingerprintEvent" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "FingerprintEvent" ADD COLUMN IF NOT EXISTS "ruleAction" TEXT NOT NULL DEFAULT 'allow';
ALTER TABLE "FingerprintEvent" ADD COLUMN IF NOT EXISTS "matchedRuleId" TEXT;
ALTER TABLE "FingerprintEvent" ADD COLUMN IF NOT EXISTS "linkedId" TEXT;
ALTER TABLE "FingerprintEvent" ADD COLUMN IF NOT EXISTS "tag" JSONB;
CREATE INDEX IF NOT EXISTS "FingerprintEvent_linkedId_idx" ON "FingerprintEvent"("linkedId");

-- CreateTable SecurityRule
CREATE TABLE IF NOT EXISTS "SecurityRule" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "siteId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "action" TEXT NOT NULL DEFAULT 'block',
    "conditions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SecurityRule_publicId_key" ON "SecurityRule"("publicId");
CREATE INDEX IF NOT EXISTS "SecurityRule_siteId_isEnabled_priority_idx" ON "SecurityRule"("siteId", "isEnabled", "priority");

-- CreateTable WebhookDelivery
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "siteId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "statusCode" INTEGER,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "responseExcerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookDelivery_publicId_key" ON "WebhookDelivery"("publicId");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_siteId_createdAt_idx" ON "WebhookDelivery"("siteId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SecurityRule_siteId_fkey') THEN
        ALTER TABLE "SecurityRule" ADD CONSTRAINT "SecurityRule_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebhookDelivery_siteId_fkey') THEN
        ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

