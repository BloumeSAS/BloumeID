import type { FingerprintComponents } from "@bloumeid/sdk";

export type SnowflakePrefix = "site" | "vis" | "req" | "feed";
export type ApiKeyPrefix = "bid_pub" | "bid_sec";

export interface SiteCollectorsConfig {
  webrtc: boolean;
  audio: boolean;
  canvas: boolean;
  webgl: boolean;
  fonts: boolean;
}

export interface PublicSiteDTO {
  publicId: string;
  name: string;
  domains: string[];
  publicKey: string;
  secretKeyHint: string;
  secretKeyPlain?: string;
  webhookUrl: string | null;
  webhookSecret: string | null;
  riskThreshold: number;
  config: SiteCollectorsConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicVisitorDTO {
  publicId: string;
  sitePublicId: string;
  hardwareHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
  maxDangerLevel: number;
  tags: string[];
  notes: string | null;
}

export interface PublicFingerprintEventDTO {
  publicId: string;
  sitePublicId: string;
  visitorPublicId: string;
  fullHash: string;
  hardwareHash: string;
  ipAddress: string;
  ipSubnet: string;
  ja4Hash: string | null;
  asnNumber: number | null;
  asnOrg: string | null;
  country: string | null;
  city: string | null;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  isBot: boolean;
  isSpoofed: boolean;
  isIncognito: boolean;
  crossBrowserMatched: boolean;
  dangerLevel: number;
  confidence: number;
  browser: string | null;
  os: string | null;
  device: string | null;
  userAgent: string;
  origin: string | null;
  components: FingerprintComponents;
  createdAt: string;
}

export interface PublicThreatFeedDTO {
  publicId: string;
  feedName: string;
  recordCount: number;
  lastSyncedAt: string | null;
  status: string;
  errorMessage: string | null;
}

export interface DashboardMetricsDTO {
  period: "24h" | "7d" | "30d";
  totalEvents: number;
  totalEventsDelta: number;
  uniqueVisitors: number;
  uniqueVisitorsDelta: number;
  highRiskDetections: number;
  highRiskDelta: number;
  botSpoofRate: number;
  botSpoofDelta: number;
  trendSeries: Array<{
    bucket: string;
    total: number;
    highRisk: number;
    bots: number;
  }>;
  vectorDistribution: Array<{
    vector: string;
    count: number;
  }>;
  recentHighRiskEvents: PublicFingerprintEventDTO[];
}
