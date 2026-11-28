import type { FingerprintComponents, SecurityRuleAction } from "@bloume/id";
import type { SecurityRuleCondition } from "@/lib/engine/rules";

export type SnowflakePrefix = "site" | "vis" | "req" | "feed" | "rule" | "whd";
export type ApiKeyPrefix = "bid_pub" | "bid_sec";
export type VisitorTrustStatus = "neutral" | "trusted" | "blocked";

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
  requests24h?: number;
  requests30d?: number;
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
  trustStatus: VisitorTrustStatus;
  mergedIntoId: string | null;
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
  latitude: number | null;
  longitude: number | null;
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
  durationMs?: number;
  ruleAction: SecurityRuleAction;
  matchedRuleId: string | null;
  linkedId: string | null;
  tag: Record<string, unknown> | string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  userAgent: string;
  origin: string | null;
  components: FingerprintComponents;
  createdAt: string;
}

export interface PublicSecurityRuleDTO {
  publicId: string;
  sitePublicId: string | null;
  name: string;
  description: string | null;
  action: SecurityRuleAction;
  conditions: SecurityRuleCondition[];
  priority: number;
  isEnabled: boolean;
  hitCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicWebhookDeliveryDTO {
  publicId: string;
  sitePublicId: string;
  eventType: string;
  requestId: string;
  targetUrl: string;
  statusCode: number | null;
  durationMs: number;
  delivered: boolean;
  attempts: number;
  payload: Record<string, unknown>;
  responseExcerpt: string | null;
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
  period: "1h" | "24h" | "7d" | "30d" | "90d";
  totalEvents: number;
  totalEventsDelta: number;
  throughputPerMin: number;
  uniqueVisitors: number;
  uniqueVisitorsDelta: number;
  returnRatePercent: number;
  highRiskDetections: number;
  highRiskDelta: number;
  botSpoofRate: number;
  botSpoofDelta: number;
  crossBrowserMatches: number;
  vpnTorCount: number;
  vpnSharePercent: number;
  avgCollectionMs: number;
  activeTrieCidrs: number;
  trendSeries: Array<{
    bucket: string;
    total: number;
    clean: number;
    suspicious: number;
    highRisk: number;
    bots: number;
  }>;
  vectorDistribution: Array<{
    vector: string;
    count: number;
  }>;
  browserDistribution: Array<{
    name: string;
    count: number;
  }>;
  osDistribution: Array<{
    name: string;
    count: number;
    share?: number;
  }>;
  platformDistribution?: Array<{
    name: string;
    count: number;
    share: number;
  }>;
  topCountries: Array<{
    country: string;
    code?: string;
    flag?: string;
    asn: string;
    count: number;
    share?: number;
  }>;
  topAsns: Array<{
    asnNumber: number;
    asnOrg: string;
    count: number;
    share?: number;
    brandColor?: string;
    badgeText?: string;
    isRisk?: boolean;
  }>;
  recentHighRiskEvents: PublicFingerprintEventDTO[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
