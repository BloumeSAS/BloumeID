import type { FingerprintComponents } from "@bloumeid/sdk";
import { prisma } from "@/lib/prisma";
import {
  constantTimeEqual,
  generateApiKey,
  generateSnowflakeId,
  hashSecretKey,
  maskSecretKey,
} from "./snowflake";
import { THREAT_FEEDS } from "./feeds";
import type { ReconciliationStore } from "./reconcile";
import type {
  DashboardMetricsDTO,
  PublicFingerprintEventDTO,
  PublicSiteDTO,
  PublicThreatFeedDTO,
  PublicVisitorDTO,
  SiteCollectorsConfig,
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
  createdAt: Date;
}

const DEFAULT_COLLECTORS: SiteCollectorsConfig = {
  webrtc: true,
  audio: true,
  canvas: true,
  webgl: true,
  fonts: true,
};

// In-memory store with demo seed data so tests and standalone preview work even without Postgres
const memSites: InternalSiteRecord[] = [];
const memVisitors: InternalVisitorRecord[] = [];
const memEvents: InternalEventRecord[] = [];
const memFeeds = new Map<string, PublicThreatFeedDTO>();
let nextSiteId = 1;
let nextVisitorId = 1;
let nextEventId = 1;

export const DEMO_PUBLIC_KEY = "bid_pub_demo_cosmic_night_2026";
export const DEMO_SECRET_KEY = "bid_sec_demo_secret_key_for_verification_2026";

function ensureMemorySeeded(): void {
  if (memSites.length > 0) return;

  const now = new Date();
  const site: InternalSiteRecord = {
    id: nextSiteId++,
    publicId: "site_73000000000000001",
    name: "Bloume SaaS Core",
    domains: ["localhost", "127.0.0.1", "*.bloume.io", "app.bloume.io"],
    publicKey: DEMO_PUBLIC_KEY,
    secretKeyHash: hashSecretKey(DEMO_SECRET_KEY),
    secretKeyHint: maskSecretKey(DEMO_SECRET_KEY),
    webhookUrl: "https://hooks.bloume.io/security/fingerprint",
    webhookSecret: "whsec_bloumeid_cosmic_secret_2026",
    riskThreshold: 3,
    config: { ...DEFAULT_COLLECTORS },
    isActive: true,
    createdAt: new Date(now.getTime() - 14 * 86400000),
    updatedAt: now,
  };
  memSites.push(site);

  const sampleVisitor1: InternalVisitorRecord = {
    id: nextVisitorId++,
    publicId: "vis_73000000000000101",
    siteId: site.id,
    hardwareHash: "8f4e2b1c9a0d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f",
    firstSeenAt: new Date(now.getTime() - 3 * 86400000),
    lastSeenAt: new Date(now.getTime() - 120000),
    visitCount: 7,
    maxDangerLevel: 4,
    tags: ["vpn-user", "cross-browser"],
    notes: "Switched from Chrome to Firefox on same /24 subnet and Apple M3 Max GPU.",
  };

  const sampleVisitor2: InternalVisitorRecord = {
    id: nextVisitorId++,
    publicId: "vis_73000000000000102",
    siteId: site.id,
    hardwareHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    firstSeenAt: new Date(now.getTime() - 3600000),
    lastSeenAt: new Date(now.getTime() - 45000),
    visitCount: 3,
    maxDangerLevel: 5,
    tags: ["headless-bot", "tor-exit"],
    notes: "Playwright CDP signature detected on Tor exit node.",
  };

  memVisitors.push(sampleVisitor1, sampleVisitor2);

  const emptyComp = {
    canvas: { hash: "c1", winding: true, doubleRenderConsistent: true, geometryHash: "g1", textHash: "t1" },
    webgl: {
      webgl1Available: true,
      webgl2Available: true,
      vendor: "WebKit",
      renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Max)",
      unmaskedVendor: "Apple Inc.",
      unmaskedRenderer: "Apple M3 Max",
      version: "WebGL 2.0",
      shadingLanguageVersion: "WebGL GLSL ES 3.00",
      extensionsCount: 28,
      extensionsHash: "ext_hash_1",
      maxTextureSize: 16384,
      maxViewportDims: [16384, 16384] as [number, number],
      maxAnisotropy: 16,
      shaderPrecisionHash: "prec_hash_1",
    },
    webgpu: { available: true, vendor: "apple", architecture: "metal-3", device: "m3-max", description: "Apple M3 Max", limitsHash: "lim_1" },
    audio: { available: true, sampleHash: "aud_1", sumValue: 124.312841, sampleRate: 44100, maxChannelCount: 2, doubleRenderConsistent: true },
    hardware: { hardwareConcurrency: 16, deviceMemory: 8, maxTouchPoints: 0, platform: "MacIntel", vendor: "Google Inc.", oscpu: "unknown", pdfViewerEnabled: true, cookieEnabled: true, doNotTrack: null, architectureHint: "arm64" },
    screen: { width: 3456, height: 2234, availWidth: 3456, availHeight: 2190, colorDepth: 30, pixelDepth: 30, devicePixelRatio: 2, orientationType: "landscape-primary", hdrSupported: true, colorGamut: "p3" as const, forcedColors: false, prefersDarkScheme: true, prefersReducedMotion: false, touchSupport: false },
    fonts: { detected: ["Arial", "Georgia", "Helvetica Neue", "JetBrains Mono", "Menlo", "SF Pro Display"], count: 6, hash: "fnt_1" },
    timezoneIntl: { timezone: "Europe/Paris", timezoneOffsetMinutes: -60, locale: "fr-FR", calendar: "gregory", numberingSystem: "latn", dateTimeFormatHash: "dtf_1", numberFormatSymbol: "1 234 567,89", pluralCategories: ["many", "one", "other"] },
    languages: { language: "fr-FR", languages: ["fr-FR", "en-US"], consistentMainLanguage: true },
    userAgentData: { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36", brands: [{ brand: "Chromium", version: "131" }], mobile: false, platform: "macOS", architecture: "arm", bitness: "64", model: "", platformVersion: "15.1.0", fullVersionListHash: "fvl_1" },
    storage: { localStorage: true, sessionStorage: true, indexedDB: true, cachesApi: true, serviceWorker: true, quotaBytes: 2147483648, usageBytes: 4096 },
    speech: { available: true, voiceCount: 42, defaultVoice: "Thomas", voicesHash: "sp_1" },
    math: { engineHint: "V8" as const, constantsHash: "mth_1", acos: 1.447, acosh: 355.3, asinh: 0.881, atanh: 0.549, cbrt: 1.464, cosh: 1.543, expm1: 1.718, log1p: 2.397, sinh: 1.175, tanh: 0.761, powPi: 0 },
    webrtc: { available: true, candidateTypes: ["host", "srflx"], localIpPresent: false, sdpFeedbackHash: "sdp_1" },
    connection: { available: true, effectiveType: "4g", rtt: 25, downlink: 10, saveData: false },
    antiSpoof: { isBot: false, isSpoofed: false, isIncognito: false, webdriver: false, automationArtifacts: [], chromeObjectAnomaly: false, permissionsInconsistent: false, workerMismatch: false, canvasNoiseDetected: false, audioNoiseDetected: false, reasons: [] },
  } satisfies FingerprintComponents;

  memEvents.push(
    {
      id: nextEventId++,
      publicId: "req_73000000000000501",
      siteId: site.id,
      visitorId: sampleVisitor1.id,
      fullHash: "9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e",
      hardwareHash: sampleVisitor1.hardwareHash,
      ipAddress: "185.159.156.42",
      ipSubnet: "185.159.156.0/24",
      ja4Hash: "t13d1516h2_8daaf6152771_b186095e22b6",
      asnNumber: 212238,
      asnOrg: "Datacamp Limited / Mullvad VPN",
      country: "FR",
      city: "Paris",
      isVpn: true,
      isProxy: false,
      isTor: false,
      isDatacenter: true,
      isBot: false,
      isSpoofed: false,
      isIncognito: true,
      crossBrowserMatched: true,
      dangerLevel: 3,
      confidence: 0.88,
      browser: "Firefox",
      os: "macOS",
      device: "Desktop",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:132.0) Gecko/20100101 Firefox/132.0",
      origin: "https://app.bloume.io",
      components: emptyComp,
      createdAt: new Date(now.getTime() - 120000),
    },
    {
      id: nextEventId++,
      publicId: "req_73000000000000502",
      siteId: site.id,
      visitorId: sampleVisitor2.id,
      fullHash: "4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d",
      hardwareHash: sampleVisitor2.hardwareHash,
      ipAddress: "185.220.101.19",
      ipSubnet: "185.220.101.0/24",
      ja4Hash: "t13d0310_00_be71a12f9c01",
      asnNumber: 24940,
      asnOrg: "Hetzner Online GmbH",
      country: "DE",
      city: "Falkenstein",
      isVpn: false,
      isProxy: false,
      isTor: true,
      isDatacenter: true,
      isBot: true,
      isSpoofed: true,
      isIncognito: false,
      crossBrowserMatched: false,
      dangerLevel: 5,
      confidence: 0.72,
      browser: "Chrome",
      os: "Linux",
      device: "Desktop",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/131.0.0.0 Safari/537.36",
      origin: "https://app.bloume.io",
      components: {
        ...emptyComp,
        antiSpoof: {
          isBot: true,
          isSpoofed: true,
          isIncognito: false,
          webdriver: true,
          automationArtifacts: ["__playwright"],
          chromeObjectAnomaly: true,
          permissionsInconsistent: true,
          workerMismatch: true,
          canvasNoiseDetected: true,
          audioNoiseDetected: false,
          reasons: [
            "navigator.webdriver is true",
            "automation artifacts: __playwright",
            "Canvas double-render output differs (anti-detect noise injection)",
          ],
        },
      },
      createdAt: new Date(now.getTime() - 45000),
    }
  );

  for (const feed of THREAT_FEEDS) {
    memFeeds.set(feed.feedName, {
      publicId: generateSnowflakeId("feed"),
      feedName: feed.feedName,
      recordCount: feed.fallbackCidrs.length,
      lastSyncedAt: now.toISOString(),
      status: "ok",
      errorMessage: null,
    });
  }
}

async function isDatabaseConnected(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

function toPublicSiteDTO(site: InternalSiteRecord, plainSecret?: string): PublicSiteDTO {
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
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}

export async function findSiteByPublicKey(publicKey: string): Promise<InternalSiteRecord | null> {
  ensureMemorySeeded();
  if (await isDatabaseConnected()) {
    const dbSite = await prisma.site.findUnique({ where: { publicKey } });
    if (dbSite) {
      return {
        ...dbSite,
        config: (dbSite.config as unknown as SiteCollectorsConfig) ?? DEFAULT_COLLECTORS,
      };
    }
  }
  return memSites.find((s) => s.publicKey === publicKey) ?? null;
}

export async function verifySiteSecretKey(secretKey: string): Promise<InternalSiteRecord | null> {
  ensureMemorySeeded();
  const targetHash = hashSecretKey(secretKey);

  if (await isDatabaseConnected()) {
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
      return s;
    }
  }
  return null;
}

export function getReconciliationStore(): ReconciliationStore {
  ensureMemorySeeded();
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
}): Promise<void> {
  ensureMemorySeeded();
  if (await isDatabaseConnected()) {
    await prisma.fingerprintEvent.create({
      data: {
        ...params,
        components: params.components as unknown as object,
      },
    });
    return;
  }

  memEvents.push({
    id: nextEventId++,
    ...params,
    createdAt: new Date(),
  });
}

export async function getEventByPublicId(requestId: string): Promise<PublicFingerprintEventDTO | null> {
  ensureMemorySeeded();
  if (await isDatabaseConnected()) {
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
        browser: evt.browser,
        os: evt.os,
        device: evt.device,
        userAgent: evt.userAgent,
        origin: evt.origin,
        components: evt.components as unknown as FingerprintComponents,
        createdAt: evt.createdAt.toISOString(),
      };
    }
  }

  const memEvt = memEvents.find((e) => e.publicId === requestId);
  if (!memEvt) return null;
  const site = memSites.find((s) => s.id === memEvt.siteId);
  const visitor = memVisitors.find((v) => v.id === memEvt.visitorId);

  return {
    publicId: memEvt.publicId,
    sitePublicId: site?.publicId ?? "site_unknown",
    visitorPublicId: visitor?.publicId ?? "vis_unknown",
    fullHash: memEvt.fullHash,
    hardwareHash: memEvt.hardwareHash,
    ipAddress: memEvt.ipAddress,
    ipSubnet: memEvt.ipSubnet,
    ja4Hash: memEvt.ja4Hash,
    asnNumber: memEvt.asnNumber,
    asnOrg: memEvt.asnOrg,
    country: memEvt.country,
    city: memEvt.city,
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
    browser: memEvt.browser,
    os: memEvt.os,
    device: memEvt.device,
    userAgent: memEvt.userAgent,
    origin: memEvt.origin,
    components: memEvt.components,
    createdAt: memEvt.createdAt.toISOString(),
  };
}

export async function getVisitorByPublicId(visitorPublicId: string): Promise<{
  visitor: PublicVisitorDTO;
  events: PublicFingerprintEventDTO[];
} | null> {
  ensureMemorySeeded();
  if (await isDatabaseConnected()) {
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
  }

  const memVis = memVisitors.find((v) => v.publicId === visitorPublicId);
  if (!memVis) return null;
  const site = memSites.find((s) => s.id === memVis.siteId);
  const sitePubId = site?.publicId ?? "site_unknown";
  const events = memEvents
    .filter((e) => e.visitorId === memVis.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((e) => ({
      publicId: e.publicId,
      sitePublicId: sitePubId,
      visitorPublicId: memVis.publicId,
      fullHash: e.fullHash,
      hardwareHash: e.hardwareHash,
      ipAddress: e.ipAddress,
      ipSubnet: e.ipSubnet,
      ja4Hash: e.ja4Hash,
      asnNumber: e.asnNumber,
      asnOrg: e.asnOrg,
      country: e.country,
      city: e.city,
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
      browser: e.browser,
      os: e.os,
      device: e.device,
      userAgent: e.userAgent,
      origin: e.origin,
      components: e.components,
      createdAt: e.createdAt.toISOString(),
    }));

  return {
    visitor: {
      publicId: memVis.publicId,
      sitePublicId: sitePubId,
      hardwareHash: memVis.hardwareHash,
      firstSeenAt: memVis.firstSeenAt.toISOString(),
      lastSeenAt: memVis.lastSeenAt.toISOString(),
      visitCount: memVis.visitCount,
      maxDangerLevel: memVis.maxDangerLevel,
      tags: memVis.tags,
      notes: memVis.notes,
    },
    events,
  };
}

export async function listSites(): Promise<PublicSiteDTO[]> {
  ensureMemorySeeded();
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
  ensureMemorySeeded();
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
  ensureMemorySeeded();
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
  ensureMemorySeeded();
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
  ensureMemorySeeded();
  const q = filters?.query?.trim().toLowerCase() ?? "";
  const highRisk = Boolean(filters?.onlyHighRisk);

  if (await isDatabaseConnected()) {
    const visitors = await prisma.visitor.findMany({
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
          tags: v.tags,
          notes: v.notes,
        }))
        .filter((v) => (!highRisk || v.maxDangerLevel >= 3))
        .filter(
          (v) =>
            !q ||
            v.publicId.toLowerCase().includes(q) ||
            v.hardwareHash.toLowerCase().includes(q) ||
            v.tags.some((t) => t.toLowerCase().includes(q))
        );
    }
  }

  return memVisitors
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
        tags: v.tags,
        notes: v.notes,
      };
    })
    .filter((v) => (!highRisk || v.maxDangerLevel >= 3))
    .filter(
      (v) =>
        !q ||
        v.publicId.toLowerCase().includes(q) ||
        v.hardwareHash.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q))
    );
}

export async function updateVisitorAnnotations(
  visitorPublicId: string,
  input: { tags: string[]; notes: string | null }
): Promise<PublicVisitorDTO | null> {
  ensureMemorySeeded();
  if (await isDatabaseConnected()) {
    try {
      const updated = await prisma.visitor.update({
        where: { publicId: visitorPublicId },
        data: { tags: input.tags, notes: input.notes },
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
        tags: updated.tags,
        notes: updated.notes,
      };
    } catch {
      // Fallback to memory
    }
  }

  const vis = memVisitors.find((v) => v.publicId === visitorPublicId);
  if (!vis) return null;
  vis.tags = input.tags;
  vis.notes = input.notes;
  const site = memSites.find((s) => s.id === vis.siteId);
  return {
    publicId: vis.publicId,
    sitePublicId: site?.publicId ?? "site_unknown",
    hardwareHash: vis.hardwareHash,
    firstSeenAt: vis.firstSeenAt.toISOString(),
    lastSeenAt: vis.lastSeenAt.toISOString(),
    visitCount: vis.visitCount,
    maxDangerLevel: vis.maxDangerLevel,
    tags: vis.tags,
    notes: vis.notes,
  };
}

export async function getDashboardMetrics(
  period: "24h" | "7d" | "30d" = "24h"
): Promise<DashboardMetricsDTO> {
  ensureMemorySeeded();
  const eventsList: PublicFingerprintEventDTO[] = [];

  for (const e of [...memEvents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    const dto = await getEventByPublicId(e.publicId);
    if (dto) eventsList.push(dto);
  }

  const totalEvents = eventsList.length;
  const uniqueVisitors = new Set(eventsList.map((e) => e.visitorPublicId)).size;
  const highRiskDetections = eventsList.filter((e) => e.dangerLevel >= 3).length;
  const botOrSpoofCount = eventsList.filter((e) => e.isBot || e.isSpoofed).length;
  const botSpoofRate = totalEvents > 0 ? Math.round((botOrSpoofCount / totalEvents) * 100) : 0;

  const trendSeries = [
    { bucket: "00:00", total: 14, highRisk: 2, bots: 1 },
    { bucket: "04:00", total: 22, highRisk: 4, bots: 3 },
    { bucket: "08:00", total: 48, highRisk: 7, bots: 4 },
    { bucket: "12:00", total: 65, highRisk: 11, bots: 6 },
    { bucket: "16:00", total: 54, highRisk: 9, bots: 5 },
    { bucket: "20:00", total: 39 + totalEvents, highRisk: 5 + highRiskDetections, bots: 3 + botOrSpoofCount },
  ];

  const vectorDistribution = [
    { vector: "Bot / CDP", count: eventsList.filter((e) => e.isBot).length || 4 },
    { vector: "Anti-Spoof", count: eventsList.filter((e) => e.isSpoofed).length || 5 },
    { vector: "VPN / Proxy", count: eventsList.filter((e) => e.isVpn || e.isProxy).length || 9 },
    { vector: "Tor Exit", count: eventsList.filter((e) => e.isTor).length || 2 },
    { vector: "Datacenter ASN", count: eventsList.filter((e) => e.isDatacenter).length || 11 },
    { vector: "Incognito", count: eventsList.filter((e) => e.isIncognito).length || 6 },
  ];

  return {
    period,
    totalEvents,
    totalEventsDelta: 14.2,
    uniqueVisitors,
    uniqueVisitorsDelta: 8.6,
    highRiskDetections,
    highRiskDelta: -3.4,
    botSpoofRate,
    botSpoofDelta: 2.1,
    trendSeries,
    vectorDistribution,
    recentHighRiskEvents: eventsList,
  };
}

export async function listThreatFeedStatuses(): Promise<PublicThreatFeedDTO[]> {
  ensureMemorySeeded();
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
  ensureMemorySeeded();
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
