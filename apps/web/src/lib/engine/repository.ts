import { computePaginationMeta, paginateArray } from "@/lib/pagination";
import type { FingerprintComponents, SecurityRuleAction } from "@bloume/id";
import { prisma } from "@/lib/prisma";
import {
  constantTimeEqual,
  generateApiKey,
  generateSnowflakeId,
  hashSecretKey,
  maskSecretKey,
} from "./snowflake";
import { THREAT_FEEDS } from "./feeds";
import { globalThreatTrie } from "./cidr-trie";

export class DatabaseUnavailableError extends Error {
  constructor(message = "PostgreSQL database is unavailable in production") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}
import type { ReconciliationStore } from "./reconcile";
import type { SecurityRuleCondition } from "./rules";
import type {
  PaginatedResponse,
  DashboardMetricsDTO,
  PublicFingerprintEventDTO,
  PublicSecurityRuleDTO,
  PublicSiteDTO,
  PublicThreatFeedDTO,
  PublicVisitorDTO,
  PublicWebhookDeliveryDTO,
  SiteCollectorsConfig,
  VisitorTrustStatus,
} from "@/types";

interface InternalSiteRecord {
  id: number;
  publicId: string;
  name: string;
  domains: string[];
  publicKey: string;
  secretKeyHash: string;
  secretKeyHint: string;
  webhookUrl: string | null;
  webhookSecret: string | null;
  riskThreshold: number;
  config: SiteCollectorsConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface InternalVisitorRecord {
  id: number;
  publicId: string;
  siteId: number;
  hardwareHash: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  visitCount: number;
  maxDangerLevel: number;
  trustStatus: VisitorTrustStatus;
  mergedIntoId: string | null;
  tags: string[];
  notes: string | null;
}

interface InternalEventRecord {
  id: number;
  publicId: string;
  siteId: number;
  visitorId: number;
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
  createdAt: Date;
}

interface InternalSecurityRuleRecord {
  id: number;
  publicId: string;
  siteId: number | null;
  name: string;
  description: string | null;
  action: SecurityRuleAction;
  conditions: SecurityRuleCondition[];
  priority: number;
  isEnabled: boolean;
  hitCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface InternalWebhookDeliveryRecord {
  id: number;
  publicId: string;
  siteId: number;
  eventType: string;
  requestId: string;
  targetUrl: string;
  statusCode: number | null;
  durationMs: number;
  delivered: boolean;
  attempts: number;
  payload: Record<string, unknown>;
  responseExcerpt: string | null;
  createdAt: Date;
}

const DEFAULT_COLLECTORS: SiteCollectorsConfig = {
  webrtc: true,
  audio: true,
  canvas: true,
  webgl: true,
  fonts: true,
};

const memSites: InternalSiteRecord[] = [];
const memVisitors: InternalVisitorRecord[] = [];
const memEvents: InternalEventRecord[] = [];
const memRules: InternalSecurityRuleRecord[] = [];
const memWebhookDeliveries: InternalWebhookDeliveryRecord[] = [];
const memFeeds = new Map<string, PublicThreatFeedDTO>();

let nextSiteId = 1;
let nextVisitorId = 1;
let nextEventId = 1;
let nextRuleId = 1;
let nextWebhookDeliveryId = 1;

function ensureFeedsInitialized(): void {
  if (memFeeds.size > 0) return;

  for (const feed of THREAT_FEEDS) {
    memFeeds.set(feed.feedName, {
      publicId: generateSnowflakeId("feed"),
      feedName: feed.feedName,
      recordCount: 0,
      lastSyncedAt: null,
      status: "ok",
      errorMessage: null,
    });
  }
}

async function isDatabaseConnected(): Promise<boolean> {
  const isProdRuntime =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build";

  if (!process.env.DATABASE_URL) {
    if (isProdRuntime) {
      console.error("[BloumeID] DATABASE_URL is missing in production.");
      throw new DatabaseUnavailableError("DATABASE_URL is missing in production");
    }
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    if (isProdRuntime) {
      console.error("[BloumeID] PostgreSQL connection failed in production:", err);
      throw new DatabaseUnavailableError(
        err instanceof Error ? err.message : "PostgreSQL connection failed in production"
      );
    }
    return false;
  }
}

function toPublicSiteDTO(site: InternalSiteRecord, plainSecret?: string): PublicSiteDTO {
  const nowMs = Date.now();
  const siteEvents = memEvents.filter((e) => e.siteId === site.id);
  const requests24h = siteEvents.filter((e) => nowMs - e.createdAt.getTime() <= 86400000).length;
  const requests30d = siteEvents.filter((e) => nowMs - e.createdAt.getTime() <= 30 * 86400000).length;
  return {
    publicId: site.publicId,
    name: site.name,
    domains: site.domains,
    publicKey: site.publicKey,
    secretKeyHint: site.secretKeyHint,
    secretKeyPlain: plainSecret,
    webhookUrl: site.webhookUrl,
    webhookSecret: site.webhookSecret,
    riskThreshold: site.riskThreshold,
    config: site.config,
    isActive: site.isActive,
    requests24h,
    requests30d,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}

async function ensureMemSiteInDatabase(memSite: InternalSiteRecord): Promise<InternalSiteRecord> {
  try {
    const dbSite = await prisma.site.upsert({
      where: { publicKey: memSite.publicKey },
      update: {},
      create: {
        publicId: memSite.publicId,
        name: memSite.name,
        domains: memSite.domains,
        publicKey: memSite.publicKey,
        secretKeyHash: memSite.secretKeyHash,
        secretKeyHint: memSite.secretKeyHint,
        webhookUrl: memSite.webhookUrl,
        webhookSecret: memSite.webhookSecret,
        riskThreshold: memSite.riskThreshold,
        config: { ...memSite.config },
        isActive: memSite.isActive,
      },
    });
    return {
      ...dbSite,
      config: (dbSite.config as unknown as SiteCollectorsConfig) ?? DEFAULT_COLLECTORS,
    };
  } catch {
    return memSite;
  }
}

export async function findSiteByPublicKey(publicKey: string): Promise<InternalSiteRecord | null> {
  ensureFeedsInitialized();
  const dbConnected = await isDatabaseConnected();
  if (dbConnected) {
    const dbSite = await prisma.site.findUnique({ where: { publicKey } });
    if (dbSite) {
      return {
        ...dbSite,
        config: (dbSite.config as unknown as SiteCollectorsConfig) ?? DEFAULT_COLLECTORS,
      };
    }
  }
  const memSite = memSites.find((s) => s.publicKey === publicKey) ?? null;
  if (memSite && dbConnected) {
    return ensureMemSiteInDatabase(memSite);
  }
  return memSite;
}

export async function verifySiteSecretKey(secretKey: string): Promise<InternalSiteRecord | null> {
  ensureFeedsInitialized();
  const targetHash = hashSecretKey(secretKey);
  const dbConnected = await isDatabaseConnected();

  if (dbConnected) {
    const allSites = await prisma.site.findMany({ where: { isActive: true } });
    for (const s of allSites) {
      if (constantTimeEqual(s.secretKeyHash, targetHash)) {
        return {
          ...s,
          config: (s.config as unknown as SiteCollectorsConfig) ?? DEFAULT_COLLECTORS,
        };
      }
    }
  }

  for (const s of memSites) {
    if (s.isActive && constantTimeEqual(s.secretKeyHash, targetHash)) {
      return dbConnected ? ensureMemSiteInDatabase(s) : s;
    }
  }
  return null;
}

export function getReconciliationStore(): ReconciliationStore {
  ensureFeedsInitialized();
  return {
    async findVisitorByExactFullHash({ siteInternalId, fullHash }) {
      if (await isDatabaseConnected()) {
        const evt = await prisma.fingerprintEvent.findFirst({
          where: { siteId: siteInternalId, fullHash },
          orderBy: { createdAt: "desc" },
          include: { visitor: true },
        });
        if (evt?.visitor) {
          return { id: evt.visitor.id, publicId: evt.visitor.publicId };
        }
      }
      const memEvt = [...memEvents]
        .reverse()
        .find((e) => e.siteId === siteInternalId && e.fullHash === fullHash);
      if (!memEvt) return null;
      const vis = memVisitors.find((v) => v.id === memEvt.visitorId);
      return vis ? { id: vis.id, publicId: vis.publicId } : null;
    },

    async findVisitorByHardwareAndSubnet({ siteInternalId, hardwareHash, ipSubnet, sinceDate }) {
      if (await isDatabaseConnected()) {
        const evt = await prisma.fingerprintEvent.findFirst({
          where: {
            siteId: siteInternalId,
            hardwareHash,
            ipSubnet,
            createdAt: { gte: sinceDate },
          },
          orderBy: { createdAt: "desc" },
          include: { visitor: true },
        });
        if (evt?.visitor) {
          return { id: evt.visitor.id, publicId: evt.visitor.publicId };
        }
      }
      const memEvt = [...memEvents]
        .reverse()
        .find(
          (e) =>
            e.siteId === siteInternalId &&
            e.hardwareHash === hardwareHash &&
            e.ipSubnet === ipSubnet &&
            e.createdAt >= sinceDate
        );
      if (!memEvt) return null;
      const vis = memVisitors.find((v) => v.id === memEvt.visitorId);
      return vis ? { id: vis.id, publicId: vis.publicId } : null;
    },

    async createOrUpdateVisitor({
      existingVisitorId,
      newVisitorPublicId,
      siteInternalId,
      hardwareHash,
      dangerLevel,
    }) {
      if (await isDatabaseConnected()) {
        if (existingVisitorId) {
          const current = await prisma.visitor.findUnique({ where: { id: existingVisitorId } });
          const updated = await prisma.visitor.update({
            where: { id: existingVisitorId },
            data: {
              lastSeenAt: new Date(),
              visitCount: { increment: 1 },
              maxDangerLevel: Math.max(current?.maxDangerLevel ?? 0, dangerLevel),
            },
          });
          return { id: updated.id, publicId: updated.publicId };
        }
        const created = await prisma.visitor.create({
          data: {
            publicId: newVisitorPublicId,
            siteId: siteInternalId,
            hardwareHash,
            maxDangerLevel: dangerLevel,
            tags: [],
          },
        });
        return { id: created.id, publicId: created.publicId };
      }

      if (existingVisitorId) {
        const vis = memVisitors.find((v) => v.id === existingVisitorId);
        if (vis) {
          vis.lastSeenAt = new Date();
          vis.visitCount += 1;
          vis.maxDangerLevel = Math.max(vis.maxDangerLevel, dangerLevel);
          return { id: vis.id, publicId: vis.publicId };
        }
      }

      const newVis: InternalVisitorRecord = {
        id: nextVisitorId++,
        publicId: newVisitorPublicId,
        siteId: siteInternalId,
        hardwareHash,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        visitCount: 1,
        maxDangerLevel: dangerLevel,
        trustStatus: "neutral",
        mergedIntoId: null,
        tags: [],
        notes: null,
      };
      memVisitors.push(newVis);
      return { id: newVis.id, publicId: newVis.publicId };
    },
  };
}

export async function recordFingerprintEvent(params: {
  publicId: string;
  siteId: number;
  visitorId: number;
  fullHash: string;
  hardwareHash: string;
  ipAddress: string;
  ipSubnet: string;
  ja4Hash: string | null;
  asnNumber: number | null;
  asnOrg: string | null;
  country: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  ruleAction?: SecurityRuleAction;
  matchedRuleId?: string | null;
  linkedId?: string | null;
  tag?: Record<string, unknown> | string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  userAgent: string;
  origin: string | null;
  components: FingerprintComponents;
}): Promise<void> {
  ensureFeedsInitialized();
  const latitude = params.latitude ?? null;
  const longitude = params.longitude ?? null;
  const ruleAction = params.ruleAction ?? "allow";
  const matchedRuleId = params.matchedRuleId ?? null;
  const linkedId = params.linkedId ?? null;
  const tag = params.tag ?? null;

  if (await isDatabaseConnected()) {
    try {
      await prisma.fingerprintEvent.create({
        data: {
          publicId: params.publicId,
          siteId: params.siteId,
          visitorId: params.visitorId,
          fullHash: params.fullHash,
          hardwareHash: params.hardwareHash,
          ipAddress: params.ipAddress,
          ipSubnet: params.ipSubnet,
          ja4Hash: params.ja4Hash,
          asnNumber: params.asnNumber,
          asnOrg: params.asnOrg,
          country: params.country,
          city: params.city,
          latitude,
          longitude,
          isVpn: params.isVpn,
          isProxy: params.isProxy,
          isTor: params.isTor,
          isDatacenter: params.isDatacenter,
          isBot: params.isBot,
          isSpoofed: params.isSpoofed,
          isIncognito: params.isIncognito,
          crossBrowserMatched: params.crossBrowserMatched,
          dangerLevel: params.dangerLevel,
          confidence: params.confidence,
          ruleAction,
          matchedRuleId,
          linkedId,
          tag: tag ? (tag as unknown as object) : undefined,
          browser: params.browser,
          os: params.os,
          device: params.device,
          userAgent: params.userAgent,
          origin: params.origin,
          components: params.components as unknown as object,
        },
      });
      return;
    } catch {
      // Fallback to memory if migration isn't applied yet
    }
  }

  memEvents.push({
    id: nextEventId++,
    ...params,
    latitude,
    longitude,
    ruleAction,
    matchedRuleId,
    linkedId,
    tag,
    createdAt: new Date(),
  });
}

function mapInternalEventToDTO(
  memEvt: InternalEventRecord,
  sitePublicId: string,
  visitorPublicId: string
): PublicFingerprintEventDTO {
  return {
    publicId: memEvt.publicId,
    sitePublicId,
    visitorPublicId,
    fullHash: memEvt.fullHash,
    hardwareHash: memEvt.hardwareHash,
    ipAddress: memEvt.ipAddress,
    ipSubnet: memEvt.ipSubnet,
    ja4Hash: memEvt.ja4Hash,
    asnNumber: memEvt.asnNumber,
    asnOrg: memEvt.asnOrg,
    country: memEvt.country,
    city: memEvt.city,
    latitude: memEvt.latitude,
    longitude: memEvt.longitude,
    isVpn: memEvt.isVpn,
    isProxy: memEvt.isProxy,
    isTor: memEvt.isTor,
    isDatacenter: memEvt.isDatacenter,
    isBot: memEvt.isBot,
    isSpoofed: memEvt.isSpoofed,
    isIncognito: memEvt.isIncognito,
    crossBrowserMatched: memEvt.crossBrowserMatched,
    dangerLevel: memEvt.dangerLevel,
    confidence: memEvt.confidence,
    ruleAction: memEvt.ruleAction,
    matchedRuleId: memEvt.matchedRuleId,
    linkedId: memEvt.linkedId,
    tag: memEvt.tag,
    browser: memEvt.browser,
    os: memEvt.os,
    device: memEvt.device,
    userAgent: memEvt.userAgent,
    origin: memEvt.origin,
    components: memEvt.components,
    createdAt: memEvt.createdAt.toISOString(),
  };
}

export async function getEventByPublicId(
  requestId: string
): Promise<PublicFingerprintEventDTO | null> {
  ensureFeedsInitialized();
  if (await isDatabaseConnected()) {
    try {
      const evt = await prisma.fingerprintEvent.findUnique({
        where: { publicId: requestId },
        include: { site: true, visitor: true },
      });
      if (evt) {
        return {
          publicId: evt.publicId,
          sitePublicId: evt.site.publicId,
          visitorPublicId: evt.visitor.publicId,
          fullHash: evt.fullHash,
          hardwareHash: evt.hardwareHash,
          ipAddress: evt.ipAddress,
          ipSubnet: evt.ipSubnet,
          ja4Hash: evt.ja4Hash,
          asnNumber: evt.asnNumber,
          asnOrg: evt.asnOrg,
          country: evt.country,
          city: evt.city,
          latitude: evt.latitude ?? null,
          longitude: evt.longitude ?? null,
          isVpn: evt.isVpn,
          isProxy: evt.isProxy,
          isTor: evt.isTor,
          isDatacenter: evt.isDatacenter,
          isBot: evt.isBot,
          isSpoofed: evt.isSpoofed,
          isIncognito: evt.isIncognito,
          crossBrowserMatched: evt.crossBrowserMatched,
          dangerLevel: evt.dangerLevel,
          confidence: evt.confidence,
          ruleAction: (evt.ruleAction as SecurityRuleAction) ?? "allow",
          matchedRuleId: evt.matchedRuleId ?? null,
          linkedId: evt.linkedId ?? null,
          tag: (evt.tag as Record<string, unknown> | string | null) ?? null,
          browser: evt.browser,
          os: evt.os,
          device: evt.device,
          userAgent: evt.userAgent,
          origin: evt.origin,
          components: evt.components as unknown as FingerprintComponents,
          createdAt: evt.createdAt.toISOString(),
        };
      }
    } catch {
      // Fallback to memory
    }
  }

  const memEvt = memEvents.find((e) => e.publicId === requestId);
  if (!memEvt) return null;
  const site = memSites.find((s) => s.id === memEvt.siteId);
  const visitor = memVisitors.find((v) => v.id === memEvt.visitorId);

  return mapInternalEventToDTO(
    memEvt,
    site?.publicId ?? "site_unknown",
    visitor?.publicId ?? "vis_unknown"
  );
}

export async function listFingerprintEvents(filters?: {
  sitePublicId?: string;
  query?: string;
  minDanger?: number;
  vector?: "all" | "bot" | "vpntor" | "spoofed" | "crossbrowser";
  linkedId?: string;
  limit?: number;
}): Promise<PublicFingerprintEventDTO[]> {
  ensureFeedsInitialized();
  const limit = filters?.limit ?? 100;
  const q = filters?.query?.trim().toLowerCase() ?? "";
  const minDanger = filters?.minDanger ?? 0;
  const vector = filters?.vector ?? "all";
  const allEvents: PublicFingerprintEventDTO[] = [];

  if (await isDatabaseConnected()) {
    try {
      const dbEvents = await prisma.fingerprintEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { site: true, visitor: true },
      });
      for (const evt of dbEvents) {
        allEvents.push({
          publicId: evt.publicId,
          sitePublicId: evt.site.publicId,
          visitorPublicId: evt.visitor.publicId,
          fullHash: evt.fullHash,
          hardwareHash: evt.hardwareHash,
          ipAddress: evt.ipAddress,
          ipSubnet: evt.ipSubnet,
          ja4Hash: evt.ja4Hash,
          asnNumber: evt.asnNumber,
          asnOrg: evt.asnOrg,
          country: evt.country,
          city: evt.city,
          latitude: evt.latitude ?? null,
          longitude: evt.longitude ?? null,
          isVpn: evt.isVpn,
          isProxy: evt.isProxy,
          isTor: evt.isTor,
          isDatacenter: evt.isDatacenter,
          isBot: evt.isBot,
          isSpoofed: evt.isSpoofed,
          isIncognito: evt.isIncognito,
          crossBrowserMatched: evt.crossBrowserMatched,
          dangerLevel: evt.dangerLevel,
          confidence: evt.confidence,
          ruleAction: (evt.ruleAction as SecurityRuleAction) ?? "allow",
          matchedRuleId: evt.matchedRuleId ?? null,
          linkedId: evt.linkedId ?? null,
          tag: (evt.tag as Record<string, unknown> | string | null) ?? null,
          browser: evt.browser,
          os: evt.os,
          device: evt.device,
          userAgent: evt.userAgent,
          origin: evt.origin,
          components: evt.components as unknown as FingerprintComponents,
          createdAt: evt.createdAt.toISOString(),
        });
      }
    } catch {
      // Fallback
    }
  }

  for (const e of [...memEvents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    if (!allEvents.some((x) => x.publicId === e.publicId)) {
      const site = memSites.find((s) => s.id === e.siteId);
      const visitor = memVisitors.find((v) => v.id === e.visitorId);
      allEvents.push(
        mapInternalEventToDTO(e, site?.publicId ?? "site_unknown", visitor?.publicId ?? "vis_unknown")
      );
    }
  }

  return allEvents
    .filter((e) => {
      if (
        filters?.sitePublicId &&
        filters.sitePublicId !== "all" &&
        e.sitePublicId !== filters.sitePublicId
      ) {
        return false;
      }
      if (e.dangerLevel < minDanger) return false;
      if (filters?.linkedId && e.linkedId !== filters.linkedId) return false;
      if (vector === "bot" && !e.isBot) return false;
      if (vector === "vpntor" && !e.isVpn && !e.isTor && !e.isProxy) return false;
      if (vector === "spoofed" && !e.isSpoofed) return false;
      if (vector === "crossbrowser" && !e.crossBrowserMatched) return false;
      if (q) {
        const hay = [
          e.publicId,
          e.visitorPublicId,
          e.ipAddress,
          e.ipSubnet,
          e.country ?? "",
          e.city ?? "",
          e.asnOrg ?? "",
          String(e.asnNumber ?? ""),
          e.linkedId ?? "",
          e.browser ?? "",
          e.os ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .slice(0, limit);
}

export async function listFingerprintEventsPaginated(filters?: {
  sitePublicId?: string;
  query?: string;
  minDanger?: number;
  vector?: "all" | "bot" | "vpntor" | "spoofed" | "crossbrowser";
  linkedId?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<PublicFingerprintEventDTO>> {
  ensureFeedsInitialized();
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 25));
  const q = filters?.query?.trim() ?? "";
  const minDanger = filters?.minDanger ?? 0;
  const vector = filters?.vector ?? "all";

  if (await isDatabaseConnected()) {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.sitePublicId && filters.sitePublicId !== "all") {
        where.site = { publicId: filters.sitePublicId };
      }
      if (minDanger > 0) {
        where.dangerLevel = { gte: minDanger };
      }
      if (filters?.linkedId) {
        where.linkedId = filters.linkedId;
      }
      if (filters?.action && filters.action !== "all") {
        where.ruleAction = filters.action;
      }
      if (vector === "bot") where.isBot = true;
      if (vector === "vpntor") where.OR = [{ isVpn: true }, { isTor: true }, { isProxy: true }];
      if (vector === "spoofed") where.isSpoofed = true;
      if (vector === "crossbrowser") where.crossBrowserMatched = true;
      if (q) {
        where.AND = [
          {
            OR: [
              { publicId: { contains: q, mode: "insensitive" } },
              { ipAddress: { contains: q, mode: "insensitive" } },
              { country: { contains: q, mode: "insensitive" } },
              { asnOrg: { contains: q, mode: "insensitive" } },
              { visitor: { publicId: { contains: q, mode: "insensitive" } } },
            ],
          },
        ];
      }

      const skip = (page - 1) * pageSize;
      const [dbEvents, totalItems] = await Promise.all([
        prisma.fingerprintEvent.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          include: { site: true, visitor: true },
        }),
        prisma.fingerprintEvent.count({ where }),
      ]);

      const items: PublicFingerprintEventDTO[] = dbEvents.map((evt) => ({
        publicId: evt.publicId,
        sitePublicId: evt.site.publicId,
        visitorPublicId: evt.visitor.publicId,
        fullHash: evt.fullHash,
        hardwareHash: evt.hardwareHash,
        ipAddress: evt.ipAddress,
        ipSubnet: evt.ipSubnet,
        ja4Hash: evt.ja4Hash,
        asnNumber: evt.asnNumber,
        asnOrg: evt.asnOrg,
        country: evt.country,
        city: evt.city,
        latitude: evt.latitude ?? null,
        longitude: evt.longitude ?? null,
        isVpn: evt.isVpn,
        isProxy: evt.isProxy,
        isTor: evt.isTor,
        isDatacenter: evt.isDatacenter,
        isBot: evt.isBot,
        isSpoofed: evt.isSpoofed,
        isIncognito: evt.isIncognito,
        crossBrowserMatched: evt.crossBrowserMatched,
        dangerLevel: evt.dangerLevel,
        confidence: evt.confidence,
        ruleAction: (evt.ruleAction as SecurityRuleAction) ?? "allow",
        matchedRuleId: evt.matchedRuleId ?? null,
        linkedId: evt.linkedId ?? null,
        tag: (evt.tag as Record<string, unknown> | string | null) ?? null,
        browser: evt.browser,
        os: evt.os,
        device: evt.device,
        userAgent: evt.userAgent,
        origin: evt.origin,
        components: evt.components as unknown as FingerprintComponents,
        createdAt: evt.createdAt.toISOString(),
      }));

      if (items.length > 0) {
        return { items, pagination: computePaginationMeta(page, pageSize, Math.max(totalItems, items.length)) };
      }
    } catch {
      // Fallback to memory
    }
  }

  const allFiltered = await listFingerprintEvents({
    ...filters,
    limit: 5000,
  });
  const actionFiltered =
    filters?.action && filters.action !== "all"
      ? allFiltered.filter((e) => e.ruleAction === filters.action)
      : allFiltered;
  return paginateArray(actionFiltered, page, pageSize);
}

export async function getVisitorByPublicId(visitorPublicId: string): Promise<{
  visitor: PublicVisitorDTO;
  events: PublicFingerprintEventDTO[];
} | null> {
  ensureFeedsInitialized();
  if (await isDatabaseConnected()) {
    try {
      const vis = await prisma.visitor.findUnique({
        where: { publicId: visitorPublicId },
        include: {
          site: true,
          events: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      });
      if (vis) {
        return {
          visitor: {
            publicId: vis.publicId,
            sitePublicId: vis.site.publicId,
            hardwareHash: vis.hardwareHash,
            firstSeenAt: vis.firstSeenAt.toISOString(),
            lastSeenAt: vis.lastSeenAt.toISOString(),
            visitCount: vis.visitCount,
            maxDangerLevel: vis.maxDangerLevel,
            trustStatus: (vis.trustStatus as VisitorTrustStatus) ?? "neutral",
            mergedIntoId: vis.mergedIntoId ?? null,
            tags: vis.tags,
            notes: vis.notes,
          },
          events: vis.events.map((e) => ({
            publicId: e.publicId,
            sitePublicId: vis.site.publicId,
            visitorPublicId: vis.publicId,
            fullHash: e.fullHash,
            hardwareHash: e.hardwareHash,
            ipAddress: e.ipAddress,
            ipSubnet: e.ipSubnet,
            ja4Hash: e.ja4Hash,
            asnNumber: e.asnNumber,
            asnOrg: e.asnOrg,
            country: e.country,
            city: e.city,
            latitude: e.latitude ?? null,
            longitude: e.longitude ?? null,
            isVpn: e.isVpn,
            isProxy: e.isProxy,
            isTor: e.isTor,
            isDatacenter: e.isDatacenter,
            isBot: e.isBot,
            isSpoofed: e.isSpoofed,
            isIncognito: e.isIncognito,
            crossBrowserMatched: e.crossBrowserMatched,
            dangerLevel: e.dangerLevel,
            confidence: e.confidence,
            ruleAction: (e.ruleAction as SecurityRuleAction) ?? "allow",
            matchedRuleId: e.matchedRuleId ?? null,
            linkedId: e.linkedId ?? null,
            tag: (e.tag as Record<string, unknown> | string | null) ?? null,
            browser: e.browser,
            os: e.os,
            device: e.device,
            userAgent: e.userAgent,
            origin: e.origin,
            components: e.components as unknown as FingerprintComponents,
            createdAt: e.createdAt.toISOString(),
          })),
        };
      }
    } catch {
      // Fallback
    }
  }

  const memVis = memVisitors.find((v) => v.publicId === visitorPublicId);
  if (!memVis) return null;
  const site = memSites.find((s) => s.id === memVis.siteId);
  const sitePubId = site?.publicId ?? "site_unknown";
  const events = memEvents
    .filter((e) => e.visitorId === memVis.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((e) => mapInternalEventToDTO(e, sitePubId, memVis.publicId));

  return {
    visitor: {
      publicId: memVis.publicId,
      sitePublicId: sitePubId,
      hardwareHash: memVis.hardwareHash,
      firstSeenAt: memVis.firstSeenAt.toISOString(),
      lastSeenAt: memVis.lastSeenAt.toISOString(),
      visitCount: memVis.visitCount,
      maxDangerLevel: memVis.maxDangerLevel,
      trustStatus: memVis.trustStatus,
      mergedIntoId: memVis.mergedIntoId,
      tags: memVis.tags,
      notes: memVis.notes,
    },
    events,
  };
}

export async function listSites(): Promise<PublicSiteDTO[]> {
  ensureFeedsInitialized();
  if (await isDatabaseConnected()) {
    const sites = await prisma.site.findMany({ orderBy: { createdAt: "desc" } });
    if (sites.length > 0) {
      return sites.map((s) =>
        toPublicSiteDTO({
          ...s,
          config: (s.config as unknown as SiteCollectorsConfig) ?? DEFAULT_COLLECTORS,
        })
      );
    }
  }
  return memSites.map((s) => toPublicSiteDTO(s));
}

export async function createSiteRecord(input: {
  name: string;
  domains: string[];
  webhookUrl?: string | null;
  riskThreshold?: number;
  config?: Partial<SiteCollectorsConfig>;
}): Promise<PublicSiteDTO> {
  ensureFeedsInitialized();
  const publicId = generateSnowflakeId("site");
  const publicKey = generateApiKey("bid_pub");
  const secretKeyPlain = generateApiKey("bid_sec");
  const secretKeyHash = hashSecretKey(secretKeyPlain);
  const secretKeyHint = maskSecretKey(secretKeyPlain);
  const webhookSecret = `whsec_${generateApiKey("bid_sec").slice(8)}`;
  const config: SiteCollectorsConfig = {
    ...DEFAULT_COLLECTORS,
    ...input.config,
  };

  if (await isDatabaseConnected()) {
    const created = await prisma.site.create({
      data: {
        publicId,
        name: input.name,
        domains: input.domains,
        publicKey,
        secretKeyHash,
        secretKeyHint,
        webhookUrl: input.webhookUrl ?? null,
        webhookSecret,
        riskThreshold: input.riskThreshold ?? 3,
        config: config as unknown as object,
        isActive: true,
      },
    });
    return toPublicSiteDTO(
      {
        ...created,
        config,
      },
      secretKeyPlain
    );
  }

  const now = new Date();
  const record: InternalSiteRecord = {
    id: nextSiteId++,
    publicId,
    name: input.name,
    domains: input.domains,
    publicKey,
    secretKeyHash,
    secretKeyHint,
    webhookUrl: input.webhookUrl ?? null,
    webhookSecret,
    riskThreshold: input.riskThreshold ?? 3,
    config,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  memSites.unshift(record);
  return toPublicSiteDTO(record, secretKeyPlain);
}

export async function updateSiteRecord(
  sitePublicId: string,
  input: {
    name?: string;
    domains?: string[];
    webhookUrl?: string | null;
    riskThreshold?: number;
    config?: Partial<SiteCollectorsConfig>;
    isActive?: boolean;
    rotateKeys?: boolean;
  }
): Promise<PublicSiteDTO | null> {
  ensureFeedsInitialized();
  let rotatedSecretPlain: string | undefined;
  let newPublicKey: string | undefined;
  let newSecretHash: string | undefined;
  let newSecretHint: string | undefined;

  if (input.rotateKeys) {
    newPublicKey = generateApiKey("bid_pub");
    rotatedSecretPlain = generateApiKey("bid_sec");
    newSecretHash = hashSecretKey(rotatedSecretPlain);
    newSecretHint = maskSecretKey(rotatedSecretPlain);
  }

  if (await isDatabaseConnected()) {
    const existing = await prisma.site.findUnique({ where: { publicId: sitePublicId } });
    if (existing) {
      const mergedConfig: SiteCollectorsConfig = {
        ...((existing.config as unknown as SiteCollectorsConfig) ?? DEFAULT_COLLECTORS),
        ...input.config,
      };
      const updated = await prisma.site.update({
        where: { publicId: sitePublicId },
        data: {
          name: input.name ?? existing.name,
          domains: input.domains ?? existing.domains,
          webhookUrl: input.webhookUrl !== undefined ? input.webhookUrl : existing.webhookUrl,
          riskThreshold: input.riskThreshold ?? existing.riskThreshold,
          isActive: input.isActive ?? existing.isActive,
          config: mergedConfig as unknown as object,
          ...(newPublicKey
            ? {
                publicKey: newPublicKey,
                secretKeyHash: newSecretHash,
                secretKeyHint: newSecretHint,
              }
            : {}),
        },
      });
      return toPublicSiteDTO({ ...updated, config: mergedConfig }, rotatedSecretPlain);
    }
  }

  const memSite = memSites.find((s) => s.publicId === sitePublicId);
  if (!memSite) return null;

  if (input.name !== undefined) memSite.name = input.name;
  if (input.domains !== undefined) memSite.domains = input.domains;
  if (input.webhookUrl !== undefined) memSite.webhookUrl = input.webhookUrl;
  if (input.riskThreshold !== undefined) memSite.riskThreshold = input.riskThreshold;
  if (input.isActive !== undefined) memSite.isActive = input.isActive;
  if (input.config !== undefined) {
    memSite.config = { ...memSite.config, ...input.config };
  }
  if (newPublicKey && newSecretHash && newSecretHint) {
    memSite.publicKey = newPublicKey;
    memSite.secretKeyHash = newSecretHash;
    memSite.secretKeyHint = newSecretHint;
  }
  memSite.updatedAt = new Date();
  return toPublicSiteDTO(memSite, rotatedSecretPlain);
}

export async function deleteSiteRecord(sitePublicId: string): Promise<boolean> {
  ensureFeedsInitialized();
  if (await isDatabaseConnected()) {
    try {
      await prisma.site.delete({ where: { publicId: sitePublicId } });
      return true;
    } catch {
      // Fallback to memory
    }
  }
  const idx = memSites.findIndex((s) => s.publicId === sitePublicId);
  if (idx === -1) return false;
  memSites.splice(idx, 1);
  return true;
}

export async function listVisitors(filters?: {
  query?: string;
  onlyHighRisk?: boolean;
}): Promise<PublicVisitorDTO[]> {
  ensureFeedsInitialized();
  const q = filters?.query?.trim().toLowerCase() ?? "";
  const highRisk = Boolean(filters?.onlyHighRisk);

  if (await isDatabaseConnected()) {
    try {
      const visitors = await prisma.visitor.findMany({
        where: { mergedIntoId: null },
        include: { site: true },
        orderBy: { lastSeenAt: "desc" },
        take: 100,
      });
      if (visitors.length > 0) {
        return visitors
          .map((v) => ({
            publicId: v.publicId,
            sitePublicId: v.site.publicId,
            hardwareHash: v.hardwareHash,
            firstSeenAt: v.firstSeenAt.toISOString(),
            lastSeenAt: v.lastSeenAt.toISOString(),
            visitCount: v.visitCount,
            maxDangerLevel: v.maxDangerLevel,
            trustStatus: (v.trustStatus as VisitorTrustStatus) ?? "neutral",
            mergedIntoId: v.mergedIntoId ?? null,
            tags: v.tags,
            notes: v.notes,
          }))
          .filter((v) => !highRisk || v.maxDangerLevel >= 3)
          .filter(
            (v) =>
              !q ||
              v.publicId.toLowerCase().includes(q) ||
              v.hardwareHash.toLowerCase().includes(q) ||
              v.tags.some((t) => t.toLowerCase().includes(q))
          );
      }
    } catch {
      // Fallback
    }
  }

  return memVisitors
    .filter((v) => !v.mergedIntoId)
    .map((v) => {
      const site = memSites.find((s) => s.id === v.siteId);
      return {
        publicId: v.publicId,
        sitePublicId: site?.publicId ?? "site_unknown",
        hardwareHash: v.hardwareHash,
        firstSeenAt: v.firstSeenAt.toISOString(),
        lastSeenAt: v.lastSeenAt.toISOString(),
        visitCount: v.visitCount,
        maxDangerLevel: v.maxDangerLevel,
        trustStatus: v.trustStatus,
        mergedIntoId: v.mergedIntoId,
        tags: v.tags,
        notes: v.notes,
      };
    })
    .filter((v) => !highRisk || v.maxDangerLevel >= 3)
    .filter(
      (v) =>
        !q ||
        v.publicId.toLowerCase().includes(q) ||
        v.hardwareHash.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q))
    );
}

export async function listVisitorsPaginated(filters?: {
  sitePublicId?: string;
  query?: string;
  onlyHighRisk?: boolean;
  trustStatus?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<PublicVisitorDTO>> {
  ensureFeedsInitialized();
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 25));
  const q = filters?.query?.trim() ?? "";

  if (await isDatabaseConnected()) {
    try {
      const where: Record<string, unknown> = { mergedIntoId: null };
      if (filters?.sitePublicId && filters.sitePublicId !== "all") {
        where.site = { publicId: filters.sitePublicId };
      }
      if (filters?.onlyHighRisk) {
        where.maxDangerLevel = { gte: 3 };
      }
      if (filters?.trustStatus && filters.trustStatus !== "all") {
        where.trustStatus = filters.trustStatus;
      }
      if (q) {
        where.OR = [
          { publicId: { contains: q, mode: "insensitive" } },
          { hardwareHash: { contains: q, mode: "insensitive" } },
        ];
      }

      const skip = (page - 1) * pageSize;
      const [dbVisitors, totalItems] = await Promise.all([
        prisma.visitor.findMany({
          where,
          include: { site: true },
          orderBy: { lastSeenAt: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.visitor.count({ where }),
      ]);

      const items: PublicVisitorDTO[] = dbVisitors.map((v) => ({
        publicId: v.publicId,
        sitePublicId: v.site.publicId,
        hardwareHash: v.hardwareHash,
        firstSeenAt: v.firstSeenAt.toISOString(),
        lastSeenAt: v.lastSeenAt.toISOString(),
        visitCount: v.visitCount,
        maxDangerLevel: v.maxDangerLevel,
        trustStatus: (v.trustStatus as VisitorTrustStatus) ?? "neutral",
        mergedIntoId: v.mergedIntoId ?? null,
        tags: v.tags,
        notes: v.notes,
      }));

      if (items.length > 0) {
        return { items, pagination: computePaginationMeta(page, pageSize, Math.max(totalItems, items.length)) };
      }
    } catch {
      // Fallback
    }
  }

  let items = await listVisitors(filters);
  if (filters?.sitePublicId && filters.sitePublicId !== "all") {
    items = items.filter((v) => v.sitePublicId === filters.sitePublicId);
  }
  if (filters?.trustStatus && filters.trustStatus !== "all") {
    items = items.filter((v) => v.trustStatus === filters.trustStatus);
  }
  return paginateArray(items, page, pageSize);
}

export async function updateVisitorAnnotations(
  visitorPublicId: string,
  input: {
    tags?: string[];
    notes?: string | null;
    trustStatus?: VisitorTrustStatus;
    mergeSourceVisitorId?: string;
  }
): Promise<PublicVisitorDTO | null> {
  ensureFeedsInitialized();

  if (input.mergeSourceVisitorId && input.mergeSourceVisitorId !== visitorPublicId) {
    const target = memVisitors.find((v) => v.publicId === visitorPublicId);
    const source = memVisitors.find((v) => v.publicId === input.mergeSourceVisitorId);
    if (target && source) {
      target.visitCount += source.visitCount;
      target.maxDangerLevel = Math.max(target.maxDangerLevel, source.maxDangerLevel);
      target.tags = Array.from(new Set([...target.tags, ...source.tags, "merged"]));
      source.mergedIntoId = target.publicId;
      for (const evt of memEvents) {
        if (evt.visitorId === source.id) {
          evt.visitorId = target.id;
        }
      }
    }
  }

  if (await isDatabaseConnected()) {
    try {
      const existing = await prisma.visitor.findUnique({ where: { publicId: visitorPublicId } });
      if (existing) {
        const updated = await prisma.visitor.update({
          where: { publicId: visitorPublicId },
          data: {
            tags: input.tags ?? existing.tags,
            notes: input.notes !== undefined ? input.notes : existing.notes,
            trustStatus: input.trustStatus ?? existing.trustStatus,
          },
          include: { site: true },
        });
        return {
          publicId: updated.publicId,
          sitePublicId: updated.site.publicId,
          hardwareHash: updated.hardwareHash,
          firstSeenAt: updated.firstSeenAt.toISOString(),
          lastSeenAt: updated.lastSeenAt.toISOString(),
          visitCount: updated.visitCount,
          maxDangerLevel: updated.maxDangerLevel,
          trustStatus: (updated.trustStatus as VisitorTrustStatus) ?? "neutral",
          mergedIntoId: updated.mergedIntoId ?? null,
          tags: updated.tags,
          notes: updated.notes,
        };
      }
    } catch {
      // Fallback to memory
    }
  }

  const vis = memVisitors.find((v) => v.publicId === visitorPublicId);
  if (!vis) return null;
  if (input.tags !== undefined) vis.tags = input.tags;
  if (input.notes !== undefined) vis.notes = input.notes;
  if (input.trustStatus !== undefined) vis.trustStatus = input.trustStatus;
  const site = memSites.find((s) => s.id === vis.siteId);
  return {
    publicId: vis.publicId,
    sitePublicId: site?.publicId ?? "site_unknown",
    hardwareHash: vis.hardwareHash,
    firstSeenAt: vis.firstSeenAt.toISOString(),
    lastSeenAt: vis.lastSeenAt.toISOString(),
    visitCount: vis.visitCount,
    maxDangerLevel: vis.maxDangerLevel,
    trustStatus: vis.trustStatus,
    mergedIntoId: vis.mergedIntoId,
    tags: vis.tags,
    notes: vis.notes,
  };
}

// ==============================================================================
// Security Rules CRUD
// ==============================================================================
export async function listSecurityRules(sitePublicId?: string): Promise<PublicSecurityRuleDTO[]> {
  ensureFeedsInitialized();
  return memRules
    .filter((r) => {
      if (!sitePublicId || sitePublicId === "all") return true;
      const site = memSites.find((s) => s.id === r.siteId);
      return r.siteId === null || site?.publicId === sitePublicId;
    })
    .sort((a, b) => a.priority - b.priority)
    .map((r) => {
      const site = memSites.find((s) => s.id === r.siteId);
      return {
        publicId: r.publicId,
        sitePublicId: site?.publicId ?? null,
        name: r.name,
        description: r.description,
        action: r.action,
        conditions: r.conditions,
        priority: r.priority,
        isEnabled: r.isEnabled,
        hitCount: r.hitCount,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
}

export async function createSecurityRule(input: {
  sitePublicId?: string | null;
  name: string;
  description?: string | null;
  action: SecurityRuleAction;
  conditions: SecurityRuleCondition[];
  priority?: number;
}): Promise<PublicSecurityRuleDTO> {
  ensureFeedsInitialized();
  const site = input.sitePublicId
    ? memSites.find((s) => s.publicId === input.sitePublicId)
    : null;
  const now = new Date();
  const rule: InternalSecurityRuleRecord = {
    id: nextRuleId++,
    publicId: generateSnowflakeId("rule"),
    siteId: site?.id ?? null,
    name: input.name,
    description: input.description ?? null,
    action: input.action,
    conditions: input.conditions,
    priority: input.priority ?? 50,
    isEnabled: true,
    hitCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  memRules.push(rule);
  return {
    publicId: rule.publicId,
    sitePublicId: site?.publicId ?? null,
    name: rule.name,
    description: rule.description,
    action: rule.action,
    conditions: rule.conditions,
    priority: rule.priority,
    isEnabled: rule.isEnabled,
    hitCount: rule.hitCount,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export async function updateSecurityRule(
  rulePublicId: string,
  input: {
    isEnabled?: boolean;
    action?: SecurityRuleAction;
    priority?: number;
    incrementHit?: boolean;
  }
): Promise<PublicSecurityRuleDTO | null> {
  ensureFeedsInitialized();
  const rule = memRules.find((r) => r.publicId === rulePublicId);
  if (!rule) return null;
  if (input.isEnabled !== undefined) rule.isEnabled = input.isEnabled;
  if (input.action !== undefined) rule.action = input.action;
  if (input.priority !== undefined) rule.priority = input.priority;
  if (input.incrementHit) rule.hitCount += 1;
  rule.updatedAt = new Date();
  const site = memSites.find((s) => s.id === rule.siteId);
  return {
    publicId: rule.publicId,
    sitePublicId: site?.publicId ?? null,
    name: rule.name,
    description: rule.description,
    action: rule.action,
    conditions: rule.conditions,
    priority: rule.priority,
    isEnabled: rule.isEnabled,
    hitCount: rule.hitCount,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export async function deleteSecurityRule(rulePublicId: string): Promise<boolean> {
  ensureFeedsInitialized();
  const idx = memRules.findIndex((r) => r.publicId === rulePublicId);
  if (idx === -1) return false;
  memRules.splice(idx, 1);
  return true;
}

// ==============================================================================
// Webhook Delivery Logs
// ==============================================================================
export async function recordWebhookDelivery(input: {
  sitePublicId: string;
  eventType: string;
  requestId: string;
  targetUrl: string;
  statusCode: number | null;
  durationMs: number;
  delivered: boolean;
  attempts: number;
  payload: Record<string, unknown>;
  responseExcerpt?: string | null;
}): Promise<PublicWebhookDeliveryDTO> {
  ensureFeedsInitialized();
  const site = memSites.find((s) => s.publicId === input.sitePublicId) ?? memSites[0]!;
  const item: InternalWebhookDeliveryRecord = {
    id: nextWebhookDeliveryId++,
    publicId: generateSnowflakeId("whd"),
    siteId: site.id,
    eventType: input.eventType,
    requestId: input.requestId,
    targetUrl: input.targetUrl,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
    delivered: input.delivered,
    attempts: input.attempts,
    payload: input.payload,
    responseExcerpt: input.responseExcerpt ?? null,
    createdAt: new Date(),
  };
  memWebhookDeliveries.unshift(item);
  return {
    publicId: item.publicId,
    sitePublicId: site.publicId,
    eventType: item.eventType,
    requestId: item.requestId,
    targetUrl: item.targetUrl,
    statusCode: item.statusCode,
    durationMs: item.durationMs,
    delivered: item.delivered,
    attempts: item.attempts,
    payload: item.payload,
    responseExcerpt: item.responseExcerpt,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function listWebhookDeliveries(
  sitePublicId?: string
): Promise<PublicWebhookDeliveryDTO[]> {
  ensureFeedsInitialized();
  return memWebhookDeliveries
    .filter((d) => {
      if (!sitePublicId) return true;
      const site = memSites.find((s) => s.id === d.siteId);
      return site?.publicId === sitePublicId;
    })
    .slice(0, 25)
    .map((d) => {
      const site = memSites.find((s) => s.id === d.siteId);
      return {
        publicId: d.publicId,
        sitePublicId: site?.publicId ?? "site_unknown",
        eventType: d.eventType,
        requestId: d.requestId,
        targetUrl: d.targetUrl,
        statusCode: d.statusCode,
        durationMs: d.durationMs,
        delivered: d.delivered,
        attempts: d.attempts,
        payload: d.payload,
        responseExcerpt: d.responseExcerpt,
        createdAt: d.createdAt.toISOString(),
      };
    });
}

export async function getDashboardMetrics(
  period: "1h" | "24h" | "7d" | "30d" | "90d" = "24h",
  sitePublicId?: string
): Promise<DashboardMetricsDTO> {
  ensureFeedsInitialized();
  const eventsList = await listFingerprintEvents({
    sitePublicId,
    limit: 50,
  });

  const totalEvents = eventsList.length;
  const uniqueVisitors = new Set(eventsList.map((e) => e.visitorPublicId)).size;
  const highRiskDetections = eventsList.filter((e) => e.dangerLevel >= 3).length;
  const botOrSpoofCount = eventsList.filter((e) => e.isBot || e.isSpoofed).length;
  const botSpoofRate = totalEvents > 0 ? Math.round((botOrSpoofCount / totalEvents) * 100) : 0;
  const crossBrowserMatches = eventsList.filter((e) => e.crossBrowserMatched).length;
  const vpnTorCount = eventsList.filter((e) => e.isVpn || e.isTor || e.isProxy).length;
  const vpnSharePercent = totalEvents > 0 ? Math.round((vpnTorCount / totalEvents) * 100) : 0;
  const returnRatePercent =
    totalEvents > uniqueVisitors && totalEvents > 0
      ? Math.round(((totalEvents - uniqueVisitors) / totalEvents) * 100)
      : 0;

  const bucketLabels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];
  const trendSeries = bucketLabels.map((bucket) => ({
    bucket,
    total: 0,
    clean: 0,
    suspicious: 0,
    highRisk: 0,
    bots: 0,
  }));
  for (const evt of eventsList) {
    const hour = new Date(evt.createdAt).getUTCHours();
    const bucketIdx = Math.min(5, Math.floor(hour / 4));
    const slot = trendSeries[bucketIdx];
    if (slot) {
      slot.total += 1;
      if (evt.isBot || evt.isSpoofed) slot.bots += 1;
      if (evt.dangerLevel >= 3) slot.highRisk += 1;
      else if (evt.crossBrowserMatched || evt.dangerLevel >= 2) slot.suspicious += 1;
      else slot.clean += 1;
    }
  }

  const vectorDistribution = [
    { vector: "Bot / CDP", count: eventsList.filter((e) => e.isBot).length },
    { vector: "Anti-Spoof", count: eventsList.filter((e) => e.isSpoofed).length },
    { vector: "VPN / Proxy", count: eventsList.filter((e) => e.isVpn || e.isProxy).length },
    { vector: "Tor Exit", count: eventsList.filter((e) => e.isTor).length },
    { vector: "Datacenter ASN", count: eventsList.filter((e) => e.isDatacenter).length },
    { vector: "Incognito", count: eventsList.filter((e) => e.isIncognito).length },
  ];

  const browserCounts = new Map<string, number>();
  const osCounts = new Map<string, number>();
  const platformCounts = new Map<string, number>();
  const countryMap = new Map<string, { code: string; asn: string; count: number }>();
  const asnMap = new Map<number, { asnNumber: number; asnOrg: string; count: number; isRisk: boolean }>();

  for (const evt of eventsList) {
    const browserName = evt.browser?.trim() || "Unknown";
    browserCounts.set(browserName, (browserCounts.get(browserName) ?? 0) + 1);

    const osName = evt.os?.trim() || "Unknown";
    osCounts.set(osName, (osCounts.get(osName) ?? 0) + 1);

    const deviceName = evt.device?.trim() || "Desktop";
    platformCounts.set(deviceName, (platformCounts.get(deviceName) ?? 0) + 1);

    if (evt.country) {
      const code = evt.country.toUpperCase();
      const existing = countryMap.get(code);
      const asnLabel = evt.asnNumber
        ? `AS${evt.asnNumber}${evt.asnOrg ? ` ${evt.asnOrg}` : ""}`
        : "Unknown";
      if (existing) {
        existing.count += 1;
      } else {
        countryMap.set(code, { code, asn: asnLabel, count: 1 });
      }
    }

    if (evt.asnNumber !== null) {
      const existingAsn = asnMap.get(evt.asnNumber);
      const isRisk = evt.isVpn || evt.isTor || evt.isProxy || evt.isDatacenter;
      if (existingAsn) {
        existingAsn.count += 1;
        existingAsn.isRisk = existingAsn.isRisk || isRisk;
      } else {
        asnMap.set(evt.asnNumber, {
          asnNumber: evt.asnNumber,
          asnOrg: evt.asnOrg ?? `AS${evt.asnNumber}`,
          count: 1,
          isRisk,
        });
      }
    }
  }

  const browserDistribution = Array.from(browserCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const osTotal = totalEvents || 1;
  const osDistribution = Array.from(osCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      share: totalEvents > 0 ? Math.max(1, Math.round((count / osTotal) * 100)) : 0,
    }));

  const platformTotal = totalEvents || 1;
  const platformDistribution = Array.from(platformCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      share: totalEvents > 0 ? Math.max(1, Math.round((count / platformTotal) * 100)) : 0,
    }));

  const countryTotal = Array.from(countryMap.values()).reduce((acc, c) => acc + c.count, 0) || 1;
  const topCountries = Array.from(countryMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((c) => ({
      country: c.code,
      code: c.code,
      flag: c.code,
      asn: c.asn,
      count: c.count,
      share: Math.max(1, Math.round((c.count / countryTotal) * 100)),
    }));

  const asnTotal = Array.from(asnMap.values()).reduce((acc, a) => acc + a.count, 0) || 1;
  const asnPalette = ["#f97316", "#ef4444", "#0ea5e9", "#eab308", "#6366f1", "#3b82f6"];
  const topAsns = Array.from(asnMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((a, idx) => ({
      asnNumber: a.asnNumber,
      asnOrg: a.asnOrg,
      count: a.count,
      share: Math.max(1, Math.round((a.count / asnTotal) * 100)),
      brandColor: asnPalette[idx % asnPalette.length] ?? "#6366f1",
      badgeText: a.asnOrg.slice(0, 2).toUpperCase(),
      isRisk: a.isRisk,
    }));

  return {
    period,
    totalEvents,
    totalEventsDelta: 0,
    throughputPerMin: totalEvents > 0 ? Number((totalEvents / 10).toFixed(1)) : 0,
    uniqueVisitors,
    uniqueVisitorsDelta: 0,
    returnRatePercent,
    highRiskDetections,
    highRiskDelta: 0,
    botSpoofRate,
    botSpoofDelta: 0,
    crossBrowserMatches,
    vpnTorCount,
    vpnSharePercent,
    avgCollectionMs: 0,
    activeTrieCidrs: globalThreatTrie.size(),
    trendSeries,
    vectorDistribution,
    browserDistribution,
    osDistribution,
    platformDistribution,
    topCountries,
    topAsns,
    recentHighRiskEvents: eventsList,
  };
}

export async function listThreatFeedStatuses(): Promise<PublicThreatFeedDTO[]> {
  ensureFeedsInitialized();
  if (await isDatabaseConnected()) {
    const rows = await prisma.threatFeedStatus.findMany({ orderBy: { feedName: "asc" } });
    if (rows.length > 0) {
      return rows.map((r) => ({
        publicId: r.publicId,
        feedName: r.feedName,
        recordCount: r.recordCount,
        lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null,
        status: r.status,
        errorMessage: r.errorMessage,
      }));
    }
  }
  return Array.from(memFeeds.values());
}

export async function purgeOldFingerprintEvents(retentionDays: number): Promise<number> {
  ensureFeedsInitialized();
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  if (await isDatabaseConnected()) {
    try {
      const res = await prisma.fingerprintEvent.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      return res.count;
    } catch {
      // Fallback to memory
    }
  }
  const before = memEvents.length;
  for (let i = memEvents.length - 1; i >= 0; i--) {
    const item = memEvents[i];
    if (item && item.createdAt < cutoff) {
      memEvents.splice(i, 1);
    }
  }
  return before - memEvents.length;
}
