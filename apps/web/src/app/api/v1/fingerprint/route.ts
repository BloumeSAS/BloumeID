import { NextResponse } from "next/server";
import { z } from "zod";
import { APP_VERSION, APP_VERSION_TAG } from "@/lib/version";
import { computeAntiReplaySignature, type FingerprintComponents } from "@bloume/id";
import { constantTimeEqual, generateSnowflakeId } from "@/lib/engine/snowflake";
import {
  evaluateClientHintsConsistency,
  evaluateJa4Consistency,
  extractIpSubnet,
  extractRealClientIp,
  isOriginAllowedForSite,
  parseUserAgentSummary,
} from "@/lib/engine/network";
import {
  checkSlidingWindowRateLimit,
  consumeAntiReplayNonce,
  recordAndCheckVelocity,
} from "@/lib/engine/redis";
import { evaluateIpThreatIntel } from "@/lib/engine/feeds";
import { computeDangerScore } from "@/lib/engine/scoring";
import { reconcileVisitorIdentity } from "@/lib/engine/reconcile";
import { evaluateSecurityRules } from "@/lib/engine/rules";
import {
  findSiteByPublicKey,
  getReconciliationStore,
  getVisitorByPublicId,
  listSecurityRules,
  recordFingerprintEvent,
  recordWebhookDelivery,
  updateSecurityRule,
} from "@/lib/engine/repository";
import { dispatchSignedWebhook, shouldTriggerWebhook } from "@/lib/engine/webhooks";

const MAX_COMPONENTS_DEPTH = 6;
const MAX_COMPONENTS_KEYS = 64;

function isJsonDepthSafe(value: unknown, depth = 0): boolean {
  if (depth > MAX_COMPONENTS_DEPTH) return false;
  if (value === null || typeof value !== "object") return true;
  if (Array.isArray(value)) {
    return value.every((item) => isJsonDepthSafe(item, depth + 1));
  }
  const keys = Object.keys(value as Record<string, unknown>);
  if (depth === 0 && keys.length > MAX_COMPONENTS_KEYS) return false;
  return keys.every((k) => isJsonDepthSafe((value as Record<string, unknown>)[k], depth + 1));
}

const FingerprintPayloadSchema = z.object({
  timestamp: z.number().int(),
  nonce: z.string().min(8).max(128),
  signature: z.string().min(32).max(128),
  fullHash: z.string().min(16).max(128),
  hardwareHash: z.string().min(16).max(128),
  durationMs: z.number().min(0).max(60000).optional().default(10),
  linkedId: z.string().max(256).optional(),
  tag: z.union([z.record(z.unknown()), z.string()]).optional(),
  components: z.record(z.unknown()),
});

function buildCorsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-BloumeID-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  const apiKey =
    request.headers.get("x-bloumeid-key") ??
    new URL(request.url).searchParams.get("apiKey") ??
    "";

  if (!apiKey || !apiKey.startsWith("bid_pub_")) {
    return NextResponse.json(
      { error: "Missing or invalid public key (must start with bid_pub_)" },
      { status: 401, headers: corsHeaders }
    );
  }

  const site = await findSiteByPublicKey(apiKey);
  if (!site || !site.isActive) {
    return NextResponse.json(
      { error: "Unknown or inactive site public key" },
      { status: 401, headers: corsHeaders }
    );
  }

  if (!isOriginAllowedForSite(origin, site.domains)) {
    return NextResponse.json(
      { error: `Origin '${origin ?? "none"}' is not allowed for site ${site.publicId}` },
      { status: 403, headers: corsHeaders }
    );
  }

  const ipAddress = extractRealClientIp(request.headers);

  const rateLimit = await checkSlidingWindowRateLimit({
    key: `fp:${site.publicId}:${ipAddress}`,
    windowSeconds: 60,
    maxRequests: 120,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: corsHeaders }
    );
  }

  const MAX_BODY_BYTES = 64 * 1024;
  const contentLen = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLen) && contentLen > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload exceeds 64 KB limit" },
      { status: 413, headers: corsHeaders }
    );
  }

  let rawJson: unknown;
  try {
    const rawText = await request.text();
    if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload exceeds 64 KB limit" },
        { status: 413, headers: corsHeaders }
      );
    }
    rawJson = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400, headers: corsHeaders }
    );
  }

  const parsed = FingerprintPayloadSchema.safeParse(rawJson);
  if (!parsed.success || !isJsonDepthSafe(parsed.data.components)) {
    return NextResponse.json(
      { error: "Payload validation failed" },
      { status: 400, headers: corsHeaders }
    );
  }

  const payload = parsed.data;

  const now = Date.now();
  if (Math.abs(now - payload.timestamp) > 5 * 60 * 1000) {
    return NextResponse.json(
      { error: "Request timestamp outside allowed ±5 minute anti-replay window" },
      { status: 400, headers: corsHeaders }
    );
  }

  const expectedSig = computeAntiReplaySignature(
    apiKey,
    payload.timestamp,
    payload.nonce,
    payload.fullHash,
    payload.hardwareHash
  );

  if (!constantTimeEqual(expectedSig, payload.signature)) {
    return NextResponse.json(
      { error: "Invalid anti-replay payload signature" },
      { status: 401, headers: corsHeaders }
    );
  }

  const isFreshNonce = await consumeAntiReplayNonce(site.publicId, payload.nonce);
  if (!isFreshNonce) {
    return NextResponse.json(
      { error: "Replay detected: nonce already consumed" },
      { status: 409, headers: corsHeaders }
    );
  }

  const ipSubnet = extractIpSubnet(ipAddress);
  const ja4Hash = request.headers.get("x-ja4-fingerprint");
  const userAgent = request.headers.get("user-agent") ?? "";
  const uaSummary = parseUserAgentSummary(userAgent);
  const ja4Eval = evaluateJa4Consistency(ja4Hash, userAgent);

  const comp = payload.components as unknown as FingerprintComponents;
  const chEval = evaluateClientHintsConsistency(
    request.headers,
    comp.hardware?.platform ?? comp.userAgentData?.platform
  );

  const netIntel = await evaluateIpThreatIntel(ipAddress);

  const isBotClient = Boolean(comp.antiSpoof?.isBot);
  const isSpoofedClient =
    Boolean(comp.antiSpoof?.isSpoofed) || ja4Eval.inconsistent || chEval.inconsistent;
  const isIncognitoClient = Boolean(comp.antiSpoof?.isIncognito);

  const store = getReconciliationStore();
  const initialDangerScore = computeDangerScore({
    isBot: isBotClient,
    isSpoofed: isSpoofedClient,
    isTor: netIntel.isTor,
    isVpn: netIntel.isVpn,
    isDatacenter: netIntel.isDatacenter,
    isProxy: netIntel.isProxy,
    isIncognito: isIncognitoClient,
    ja4Inconsistent: ja4Eval.inconsistent || chEval.inconsistent,
    ipVelocityAnomaly: false,
    geoVelocityAnomaly: false,
  });

  const reconciled = await reconcileVisitorIdentity(store, {
    siteInternalId: site.id,
    fullHash: payload.fullHash,
    hardwareHash: payload.hardwareHash,
    ipSubnet,
    dangerLevel: initialDangerScore.dangerLevel,
    isSpoofed: isSpoofedClient,
  });

  const velocity = await recordAndCheckVelocity({
    ipAddress,
    visitorPublicId: reconciled.visitorPublicId,
    country: netIntel.country,
  });

  const finalScoring = computeDangerScore({
    isBot: isBotClient,
    isSpoofed: isSpoofedClient,
    isTor: netIntel.isTor,
    isVpn: netIntel.isVpn,
    isDatacenter: netIntel.isDatacenter,
    isProxy: netIntel.isProxy,
    isIncognito: isIncognitoClient,
    ja4Inconsistent: ja4Eval.inconsistent || chEval.inconsistent,
    ipVelocityAnomaly: velocity.ipVelocityAnomaly,
    geoVelocityAnomaly: velocity.geoVelocityAnomaly,
  });

  // Evaluate Custom Security Rules Engine
  const visitorProfile = await getVisitorByPublicId(reconciled.visitorPublicId);
  const siteRules = await listSecurityRules(site.publicId);
  const ruleVerdict = evaluateSecurityRules(siteRules, {
    sitePublicId: site.publicId,
    visitorPublicId: reconciled.visitorPublicId,
    visitorTrustStatus: visitorProfile?.visitor.trustStatus ?? "neutral",
    isTor: netIntel.isTor,
    isVpn: netIntel.isVpn,
    isDatacenter: netIntel.isDatacenter,
    isBot: isBotClient,
    isSpoofed: isSpoofedClient,
    dangerLevel: finalScoring.dangerLevel,
    country: netIntel.country,
    asnNumber: netIntel.asnNumber,
    ipSubnet,
  });

  if (ruleVerdict.matchedRuleId && ruleVerdict.matchedRuleId.startsWith("rule_")) {
    await updateSecurityRule(ruleVerdict.matchedRuleId, { incrementHit: true });
  }

  const requestId = generateSnowflakeId("req");

  await recordFingerprintEvent({
    publicId: requestId,
    siteId: site.id,
    visitorId: reconciled.visitorInternalId,
    fullHash: payload.fullHash,
    hardwareHash: payload.hardwareHash,
    ipAddress,
    ipSubnet,
    ja4Hash,
    asnNumber: netIntel.asnNumber,
    asnOrg: netIntel.asnOrg,
    country: netIntel.country,
    city: netIntel.city,
    latitude: netIntel.latitude,
    longitude: netIntel.longitude,
    isVpn: netIntel.isVpn,
    isProxy: netIntel.isProxy,
    isTor: netIntel.isTor,
    isDatacenter: netIntel.isDatacenter,
    isBot: isBotClient,
    isSpoofed: isSpoofedClient,
    isIncognito: isIncognitoClient,
    crossBrowserMatched: reconciled.crossBrowserMatched,
    dangerLevel: finalScoring.dangerLevel,
    confidence: reconciled.confidence,
    ruleAction: ruleVerdict.action,
    matchedRuleId: ruleVerdict.matchedRuleId,
    linkedId: payload.linkedId ?? null,
    tag: payload.tag ?? null,
    browser: uaSummary.browser,
    os: uaSummary.os,
    device: uaSummary.device,
    userAgent,
    origin,
    components: comp,
  });

  if (
    site.webhookUrl &&
    site.webhookSecret &&
    shouldTriggerWebhook({
      webhookUrl: site.webhookUrl,
      dangerLevel: finalScoring.dangerLevel,
      riskThreshold: site.riskThreshold,
      isBot: isBotClient,
    })
  ) {
    const whPayload = {
      event: "threat.detected" as const,
      timestamp: new Date().toISOString(),
      siteId: site.publicId,
      requestId,
      visitorId: reconciled.visitorPublicId,
      thumbmark: payload.fullHash,
      hardwareHash: payload.hardwareHash,
      dangerLevel: finalScoring.dangerLevel,
      confidence: reconciled.confidence,
      flags: {
        isBot: isBotClient,
        isSpoofed: isSpoofedClient,
        isVpn: netIntel.isVpn,
        isTor: netIntel.isTor,
        isDatacenter: netIntel.isDatacenter,
        isProxy: netIntel.isProxy,
        isIncognito: isIncognitoClient,
        crossBrowserMatched: reconciled.crossBrowserMatched,
      },
      network: {
        ipAddress,
        asnNumber: netIntel.asnNumber,
        asnOrg: netIntel.asnOrg,
        country: netIntel.country,
      },
    };

    const webhookUrl = site.webhookUrl;
    const webhookSecret = site.webhookSecret;
    setTimeout(() => {
      const startMs = Date.now();
      void dispatchSignedWebhook({
        webhookUrl,
        webhookSecret,
        payload: whPayload,
      }).then((res) =>
        recordWebhookDelivery({
          sitePublicId: site.publicId,
          eventType: "threat.detected",
          requestId,
          targetUrl: webhookUrl,
          statusCode: res.statusCode ?? null,
          durationMs: Date.now() - startMs,
          delivered: res.delivered,
          attempts: res.attempts,
          payload: whPayload as unknown as Record<string, unknown>,
        })
      );
    }, 0);
  }

  const isoNow = new Date().toISOString();
  const firstSeen = visitorProfile?.visitor.firstSeenAt ?? isoNow;
  const lastSeen = visitorProfile?.visitor.lastSeenAt ?? isoNow;

  return NextResponse.json(
    {
      visitorId: reconciled.visitorPublicId,
      thumbmark: payload.fullHash,
      hardwareHash: payload.hardwareHash,
      requestId,
      visitorFound: reconciled.matchType !== "new_visitor",
      confidence: {
        score: reconciled.confidence,
        revision: APP_VERSION,
        comment:
          reconciled.matchType === "cross_browser_hardware_subnet"
            ? "Reconciled across browsers via hardwareHash + IP subnet"
            : `Deterministic fingerprint evaluation (${APP_VERSION_TAG})`,
      },
      incognito: isIncognitoClient,
      browserName: uaSummary.browser,
      browserVersion: "131.0",
      os: uaSummary.os,
      osVersion: "",
      device: uaSummary.device,
      ip: ipAddress,
      ipLocation: {
        city: { name: netIntel.city },
        country: { code: netIntel.country, name: netIntel.countryName },
        latitude: netIntel.latitude,
        longitude: netIntel.longitude,
        asn: {
          asn: netIntel.asnNumber ? `AS${netIntel.asnNumber}` : null,
          name: netIntel.asnOrg,
        },
      },
      firstSeenAt: { global: firstSeen, subscription: firstSeen },
      lastSeenAt: { global: lastSeen, subscription: lastSeen },
      linkedId: payload.linkedId ?? null,
      tag: payload.tag ?? null,
      components: comp,
      info: {
        dangerLevel: finalScoring.dangerLevel,
        action: ruleVerdict.action,
        matchedRuleId: ruleVerdict.matchedRuleId,
        isBot: isBotClient,
        isSpoofed: isSpoofedClient,
        isIncognito: isIncognitoClient,
        isVpn: netIntel.isVpn,
        isTor: netIntel.isTor,
        isDatacenter: netIntel.isDatacenter,
        isProxy: netIntel.isProxy,
        isVirtualMachine: Boolean(comp.antiSpoof?.isVirtualMachine),
        crossBrowserMatched: reconciled.crossBrowserMatched,
        vpn: netIntel.isVpn,
        proxy: netIntel.isProxy,
        tor: netIntel.isTor,
        datacenter: netIntel.isDatacenter,
        bot: isBotClient,
        spoofed: isSpoofedClient,
        ipAddress,
        asnNumber: netIntel.asnNumber,
        asnOrg: netIntel.asnOrg,
        country: netIntel.country,
        city: netIntel.city,
        latitude: netIntel.latitude,
        longitude: netIntel.longitude,
        durationMs: payload.durationMs,
        collectorCount: 72,
      },
    },
    { status: 200, headers: corsHeaders }
  );
}
