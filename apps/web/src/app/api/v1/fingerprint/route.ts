import { NextResponse } from "next/server";
import { z } from "zod";
import { APP_VERSION } from "@/lib/version";
import { NO_STORE_HEADERS, parseSafeJsonBody, isJsonPayloadSafe } from "@/lib/security";
import { computeAntiReplaySignature, type FingerprintComponents } from "@bloume/id";
import {
  constantTimeEqual,
  decryptTransportEnvelopeV2,
  generateSnowflakeId,
  sealVerificationResult,
  unwrapSiteSecretKey,
} from "@/lib/engine/snowflake";
import {
  detectTorBrowserFromComponents,
  evaluateClientHintsConsistency,
  evaluateJa4Consistency,
  extractIpSubnet,
  extractRealClientIp,
  isOriginAllowedForSite,
  parseDetailedUserAgent,
  resolveOrSynthesizeJa4,
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

const EncryptedEnvelopeV2Schema = z.object({
  v: z.literal(2),
  ts: z.number().int(),
  nonce: z.string().min(8).max(128),
  iv: z.string().min(12).max(64),
  ciphertext: z.string().min(16).max(64 * 1024),
});

const InnerFingerprintPayloadSchema = z.object({
  fullHash: z.string().min(16).max(128),
  hardwareHash: z.string().min(16).max(128),
  durationMs: z.number().min(0).max(60000).optional().default(10),
  linkedId: z.string().max(256).optional(),
  tag: z.union([z.record(z.unknown()), z.string()]).optional(),
  components: z.record(z.unknown()),
});

const LegacyFingerprintPayloadSchema = z.object({
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

const REJECTED_CORS_HEADERS: Record<string, string> = {
  ...NO_STORE_HEADERS,
  Vary: "Origin",
};

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && origin !== "null" ? origin : "*";
  return {
    ...NO_STORE_HEADERS,
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-BloumeID-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request): Promise<NextResponse> {
  const origin = request.headers.get("origin");
  if (origin === "null") {
    return new NextResponse(null, {
      status: 204,
      headers: REJECTED_CORS_HEADERS,
    });
  }
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get("origin");

  const apiKey =
    request.headers.get("x-bloumeid-key") ??
    new URL(request.url).searchParams.get("apiKey") ??
    "";

  if (!apiKey || !apiKey.startsWith("bid_pub_")) {
    return NextResponse.json(
      { error: "Missing or invalid public key (must start with bid_pub_)" },
      { status: 401, headers: REJECTED_CORS_HEADERS }
    );
  }

  const site = await findSiteByPublicKey(apiKey);
  if (!site || !site.isActive) {
    return NextResponse.json(
      { error: "Unknown or inactive site public key" },
      { status: 401, headers: REJECTED_CORS_HEADERS }
    );
  }

  if (!isOriginAllowedForSite(origin, site.domains)) {
    return NextResponse.json(
      { error: `Origin '${origin ?? "none"}' is not allowed for site ${site.publicId}` },
      { status: 403, headers: REJECTED_CORS_HEADERS }
    );
  }

  const corsHeaders = buildCorsHeaders(origin);

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

  const bodyResult = await parseSafeJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error },
      { status: bodyResult.status, headers: corsHeaders }
    );
  }

  let payload: z.infer<typeof InnerFingerprintPayloadSchema>;
  const now = Date.now();
  const resolvedOrigin = origin && origin !== "null" ? origin : "";

  const v2Parsed = EncryptedEnvelopeV2Schema.safeParse(bodyResult.data);
  if (v2Parsed.success) {
    const v2 = v2Parsed.data;
    if (Math.abs(now - v2.ts) > 60 * 1000) {
      return NextResponse.json(
        { error: "Encrypted request timestamp outside allowed ±60s anti-replay window" },
        { status: 400, headers: corsHeaders }
      );
    }

    const decrypted = decryptTransportEnvelopeV2({
      publicKey: apiKey,
      ts: v2.ts,
      nonce: v2.nonce,
      origin: resolvedOrigin,
      ivB64u: v2.iv,
      ciphertextB64u: v2.ciphertext,
    });
    if (!decrypted || !isJsonPayloadSafe(decrypted)) {
      return NextResponse.json(
        { error: "Failed to decrypt or authenticate encrypted transport envelope" },
        { status: 401, headers: corsHeaders }
      );
    }

    const innerParsed = InnerFingerprintPayloadSchema.safeParse(decrypted);
    if (!innerParsed.success || !isJsonPayloadSafe(innerParsed.data.components)) {
      return NextResponse.json(
        { error: "Decrypted payload validation failed" },
        { status: 400, headers: corsHeaders }
      );
    }

    const isFreshNonce = await consumeAntiReplayNonce(site.publicId, v2.nonce, 120);
    if (!isFreshNonce) {
      return NextResponse.json(
        { error: "Replay detected: nonce already consumed" },
        { status: 409, headers: corsHeaders }
      );
    }
    payload = innerParsed.data;
  } else {
    const parsed = LegacyFingerprintPayloadSchema.safeParse(bodyResult.data);
    if (!parsed.success || !isJsonPayloadSafe(parsed.data.components)) {
      return NextResponse.json(
        { error: "Payload validation failed" },
        { status: 400, headers: corsHeaders }
      );
    }

    const legacy = parsed.data;
    if (Math.abs(now - legacy.timestamp) > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: "Request timestamp outside allowed ±5 minute anti-replay window" },
        { status: 400, headers: corsHeaders }
      );
    }

    const expectedSig = computeAntiReplaySignature(
      apiKey,
      legacy.timestamp,
      legacy.nonce,
      legacy.fullHash,
      legacy.hardwareHash
    );

    if (!constantTimeEqual(expectedSig, legacy.signature)) {
      return NextResponse.json(
        { error: "Invalid anti-replay payload signature" },
        { status: 401, headers: corsHeaders }
      );
    }

    const isFreshNonce = await consumeAntiReplayNonce(site.publicId, legacy.nonce, 600);
    if (!isFreshNonce) {
      return NextResponse.json(
        { error: "Replay detected: nonce already consumed" },
        { status: 409, headers: corsHeaders }
      );
    }
    payload = {
      fullHash: legacy.fullHash,
      hardwareHash: legacy.hardwareHash,
      durationMs: legacy.durationMs,
      linkedId: legacy.linkedId,
      tag: legacy.tag,
      components: legacy.components,
    };
  }

  const ipSubnet = extractIpSubnet(ipAddress);
  const ja4Hash = resolveOrSynthesizeJa4(request.headers);
  const userAgent = request.headers.get("user-agent") ?? "";
  const comp = payload.components as unknown as FingerprintComponents;
  const uaSummary = parseDetailedUserAgent(userAgent, request.headers, comp.userAgentData);
  const ja4Eval = evaluateJa4Consistency(ja4Hash, userAgent);
  const torBrowserSignal = detectTorBrowserFromComponents(comp, userAgent);

  const chEval = evaluateClientHintsConsistency(
    request.headers,
    comp.hardware?.platform ?? comp.userAgentData?.platform
  );

  const [netIntel, siteRules] = await Promise.all([
    evaluateIpThreatIntel(ipAddress),
    listSecurityRules(site.publicId),
  ]);

  const isBotClient = Boolean(comp.antiSpoof?.isBot);
  const isTorDetected = netIntel.isTor || torBrowserSignal.isTor;
  const isSpoofedClient =
    Boolean(comp.antiSpoof?.isSpoofed) ||
    ja4Eval.inconsistent ||
    chEval.inconsistent ||
    torBrowserSignal.isSpoofedFallback;
  const isIncognitoClient = Boolean(comp.antiSpoof?.isIncognito);

  const store = getReconciliationStore();
  const initialDangerScore = computeDangerScore({
    isBot: isBotClient,
    isSpoofed: isSpoofedClient,
    isTor: isTorDetected,
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
    isTor: isTorDetected,
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
  const ruleVerdict = evaluateSecurityRules(siteRules, {
    sitePublicId: site.publicId,
    visitorPublicId: reconciled.visitorPublicId,
    visitorTrustStatus: visitorProfile?.visitor.trustStatus ?? "neutral",
    isTor: isTorDetected,
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
    isTor: isTorDetected,
    isDatacenter: netIntel.isDatacenter,
    isBot: isBotClient,
    isSpoofed: isSpoofedClient,
    isIncognito: isIncognitoClient,
    crossBrowserMatched: reconciled.crossBrowserMatched,
    dangerLevel: finalScoring.dangerLevel,
    confidence: reconciled.confidence,
    durationMs: payload.durationMs,
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
        isTor: isTorDetected,
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
  const plainSiteSecret = unwrapSiteSecretKey(site.encryptedSecretKey);
  const sealedResult = plainSiteSecret
    ? sealVerificationResult(plainSiteSecret, {
        verified: true,
        requestId,
        visitorId: reconciled.visitorPublicId,
        siteId: site.publicId,
        thumbmark: payload.fullHash,
        hardwareHash: payload.hardwareHash,
        dangerLevel: finalScoring.dangerLevel,
        action: ruleVerdict.action,
        matchedRuleId: ruleVerdict.matchedRuleId,
        confidence: reconciled.confidence,
        flags: {
          isBot: isBotClient,
          isSpoofed: isSpoofedClient,
          isVpn: netIntel.isVpn,
          isTor: isTorDetected,
          isDatacenter: netIntel.isDatacenter,
          isProxy: netIntel.isProxy,
          isIncognito: isIncognitoClient,
          crossBrowserMatched: reconciled.crossBrowserMatched,
        },
        network: {
          ipAddress,
          ipSubnet,
          ja4Hash,
          asnNumber: netIntel.asnNumber,
          asnOrg: netIntel.asnOrg,
          country: netIntel.country,
          city: netIntel.city,
        },
        browser: {
          name: uaSummary.browser,
          version: uaSummary.browserVersion,
          os: uaSummary.os,
          osVersion: uaSummary.osVersion,
          device: uaSummary.device,
        },
        createdAt: isoNow,
      })
    : null;

  // Strictly minimal, non-leaking public browser response (zero raw signals, IP, ASN, geo, dangerLevel or reasons).
  return NextResponse.json(
    {
      visitorId: reconciled.visitorPublicId,
      requestId,
      visitorFound: reconciled.matchType !== "new_visitor",
      thumbmark: payload.fullHash,
      confidence: {
        score: reconciled.confidence,
        revision: APP_VERSION,
      },
      sealedResult,
    },
    { status: 200, headers: corsHeaders }
  );
}
