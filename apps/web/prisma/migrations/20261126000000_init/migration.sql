-- CreateTable
CREATE TABLE "Site" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domains" TEXT[],
    "publicKey" TEXT NOT NULL,
    "secretKeyHash" TEXT NOT NULL,
    "secretKeyHint" TEXT NOT NULL DEFAULT 'bid_sec_***',
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "riskThreshold" INTEGER NOT NULL DEFAULT 3,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "siteId" INTEGER NOT NULL,
    "hardwareHash" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    "maxDangerLevel" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FingerprintEvent" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "siteId" INTEGER NOT NULL,
    "visitorId" INTEGER NOT NULL,
    "fullHash" TEXT NOT NULL,
    "hardwareHash" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "ipSubnet" TEXT NOT NULL,
    "ja4Hash" TEXT,
    "asnNumber" INTEGER,
    "asnOrg" TEXT,
    "country" TEXT,
    "city" TEXT,
    "isVpn" BOOLEAN NOT NULL DEFAULT false,
    "isProxy" BOOLEAN NOT NULL DEFAULT false,
    "isTor" BOOLEAN NOT NULL DEFAULT false,
    "isDatacenter" BOOLEAN NOT NULL DEFAULT false,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isSpoofed" BOOLEAN NOT NULL DEFAULT false,
    "isIncognito" BOOLEAN NOT NULL DEFAULT false,
    "crossBrowserMatched" BOOLEAN NOT NULL DEFAULT false,
    "dangerLevel" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "userAgent" TEXT NOT NULL,
    "origin" TEXT,
    "components" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FingerprintEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatFeedStatus" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "feedName" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'idle',
    "errorMessage" TEXT,

    CONSTRAINT "ThreatFeedStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_publicId_key" ON "Site"("publicId");
CREATE UNIQUE INDEX "Site_publicKey_key" ON "Site"("publicKey");
CREATE UNIQUE INDEX "Site_secretKeyHash_key" ON "Site"("secretKeyHash");
CREATE INDEX "Site_publicKey_idx" ON "Site"("publicKey");
CREATE INDEX "Site_secretKeyHash_idx" ON "Site"("secretKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_publicId_key" ON "Visitor"("publicId");
CREATE INDEX "Visitor_siteId_hardwareHash_idx" ON "Visitor"("siteId", "hardwareHash");
CREATE INDEX "Visitor_hardwareHash_idx" ON "Visitor"("hardwareHash");
CREATE INDEX "Visitor_lastSeenAt_idx" ON "Visitor"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "FingerprintEvent_publicId_key" ON "FingerprintEvent"("publicId");
CREATE INDEX "FingerprintEvent_siteId_fullHash_idx" ON "FingerprintEvent"("siteId", "fullHash");
CREATE INDEX "FingerprintEvent_siteId_hardwareHash_ipSubnet_createdAt_idx" ON "FingerprintEvent"("siteId", "hardwareHash", "ipSubnet", "createdAt");
CREATE INDEX "FingerprintEvent_ipAddress_idx" ON "FingerprintEvent"("ipAddress");
CREATE INDEX "FingerprintEvent_ipSubnet_idx" ON "FingerprintEvent"("ipSubnet");
CREATE INDEX "FingerprintEvent_createdAt_idx" ON "FingerprintEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatFeedStatus_publicId_key" ON "ThreatFeedStatus"("publicId");
CREATE UNIQUE INDEX "ThreatFeedStatus_feedName_key" ON "ThreatFeedStatus"("feedName");

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FingerprintEvent" ADD CONSTRAINT "FingerprintEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FingerprintEvent" ADD CONSTRAINT "FingerprintEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

