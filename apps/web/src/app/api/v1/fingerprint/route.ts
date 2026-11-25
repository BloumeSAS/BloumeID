import { NextResponse } from "next/server";
import { z } from "zod";
import { computeAntiReplaySignature, type FingerprintComponents } from "@bloumeid/sdk";
import { constantTimeEqual, generateSnowflakeId } from "@/lib/engine/snowflake";
import {
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
import {
  findSiteByPublicKey,
  getReconciliationStore,
  recordFingerprintEvent,
} from "@/lib/engine/repository";
import { enqueueWebhookAsync, shouldTriggerWebhook } from "@/lib/engine/webhooks";

const FingerprintPayloadSchema = z.object({
  timestamp: z.number().int(),
  nonce: z.string().min(8).max(128),
  signature: z.string().min(32).max(128),
  fullHash: z.string().min(16).max(128),
  hardwareHash: z.string().min(16).max(128),
  durationMs: z.number().min(0).max(60000).optional().default(10),
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

  // Strict per-site CORS Origin validation
  if (!isOriginAllowedForSite(origin, site.domains)) {
    return NextResponse.json(
      { error: `Origin '${origin ?? "none"}' is not allowed for site ${site.publicId}` },
      { status: 403, headers: corsHeaders }
    );
  }

  const ipAddress = extractRealClientIp(request.headers);

  // Sliding-window rate limit per IP + Site (120 req / 60s)
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

  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400, headers: corsHeaders }
    );
  }

  const parsed = FingerprintPayloadSchema.safeParse(rawJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload validation failed", details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders }
    );
  }

  const payload = parsed.data;

  // Anti-replay timestamp window check (±5 minutes)
  const now = Date.now();
  if (Math.abs(now - payload.timestamp) > 5 * 60 * 1000) {
    return NextResponse.json(
      { error: "Request timestamp outside allowed ±5 minute anti-replay window" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Anti-replay HMAC integrity check
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

  // Single-use nonce deduplication in Redis
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

  // Network Threat Intel (Patricia/Radix CIDR Trie + ASN Classifier + MaxMind GeoLite2)
  const netIntel = await evaluateIpThreatIntel(ipAddress);

  const comp = payload.components as unknown as FingerprintComponents;
  const isBotClient = Boolean(comp.antiSpoof?.isBot);
  const isSpoofedClient = Boolean(comp.antiSpoof?.isSpoofed) || ja4Eval.inconsistent;
  const isIncognitoClient = Boolean(comp.antiSpoof?.isIncognito);

  // First reconcile visitor identity (3-level reconciliation)
  const store = getReconciliationStore();
  const initialDangerScore = computeDangerScore({
    isBot: isBotClient,
    isSpoofed: isSpoofedClient,
    isTor: netIntel.isTor,
    isVpn: netIntel.isVpn,
    isDatacenter: netIntel.isDatacenter,
    isProxy: netIntel.isProxy,
    isIncognito: isIncognitoClient,
    ja4Inconsistent: ja4Eval.inconsistent,
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

  // Check Redis velocity anomalies (>5 visitorIds per IP in 10m, >5 countries per visitor in 1h)
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
    ja4Inconsistent: ja4Eval.inconsistent,
    ipVelocityAnomaly: velocity.ipVelocityAnomaly,
    geoVelocityAnomaly: velocity.geoVelocityAnomaly,
  });

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
    enqueueWebhookAsync({
      webhookUrl: site.webhookUrl,
      webhookSecret: site.webhookSecret,
      payload: {
        event: "threat.detected",
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
      },
    });
  }

  return NextResponse.json(
    {
      visitorId: reconciled.visitorPublicId,
      thumbmark: payload.fullHash,
      hardwareHash: payload.hardwareHash,
      requestId,
      confidence: {
        score: reconciled.confidence,
        comment:
          reconciled.matchType === "cross_browser_hardware_subnet"
            ? "Reconciled across browsers via hardwareHash + IP subnet"
            : "Deterministic fingerprint evaluation",
      },
      components: comp,
      info: {
        dangerLevel: finalScoring.dangerLevel,
        isBot: isBotClient,
        isSpoofed: isSpoofedClient,
        isIncognito: isIncognitoClient,
        isVpn: netIntel.isVpn,
        isTor: netIntel.isTor,
        isDatacenter: netIntel.isDatacenter,
        isProxy: netIntel.isProxy,
        crossBrowserMatched: reconciled.crossBrowserMatched,
        ipAddress,
        asnNumber: netIntel.asnNumber,
        asnOrg: netIntel.asnOrg,
        country: netIntel.country,
        city: netIntel.city,
        durationMs: payload.durationMs,
        collectorCount: 48,
      },
    },
    { status: 200, headers: corsHeaders }
  );
}
