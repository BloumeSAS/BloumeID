import { NextResponse } from "next/server";
import { z } from "zod";
import type { FingerprintComponents } from "@bloume/id";
import { APP_VERSION, APP_VERSION_TAG } from "@/lib/version";
import { parseSafeJsonBody } from "@/lib/security";
import { generateSnowflakeId } from "@/lib/engine/snowflake";
import {
  detectTorBrowserFromComponents,
  evaluateClientHintsConsistency,
  evaluateJa4Consistency,
  extractRealClientIp,
  parseDetailedUserAgent,
  resolveOrSynthesizeJa4,
} from "@/lib/engine/network";
import { checkSlidingWindowRateLimit } from "@/lib/engine/redis";
import { evaluateIpThreatIntel } from "@/lib/engine/feeds";
import { computeDangerScore } from "@/lib/engine/scoring";

const PreviewPayloadSchema = z.object({
  fullHash: z.string().min(16).max(128),
  hardwareHash: z.string().min(16).max(128),
  durationMs: z.number().min(0).max(60000).optional().default(10),
  browserName: z.string().max(64).optional(),
  browserVersion: z.string().max(64).optional(),
  os: z.string().max(64).optional(),
  osVersion: z.string().max(64).optional(),
  device: z.string().max(64).optional(),
  tag: z.union([z.record(z.unknown()), z.string()]).optional(),
  components: z.record(z.unknown()).optional().default({}),
});

export async function POST(request: Request): Promise<NextResponse> {
  const ipAddress = extractRealClientIp(request.headers);

  const ipLimit = await checkSlidingWindowRateLimit({
    key: `ratelimit:preview:${ipAddress}`,
    windowSeconds: 60,
    maxRequests: 60,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const bodyResult = await parseSafeJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  const parsed = PreviewPayloadSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const payload = parsed.data;
  const comp = payload.components as unknown as FingerprintComponents;
  const userAgent = request.headers.get("user-agent") ?? "";
  const uaSummary = parseDetailedUserAgent(userAgent, request.headers, comp.userAgentData);
  const netIntel = await evaluateIpThreatIntel(ipAddress);

  const chEval = evaluateClientHintsConsistency(
    request.headers,
    comp.hardware?.platform ?? comp.userAgentData?.platform
  );
  const ja4Hash = resolveOrSynthesizeJa4(request.headers);
  const ja4Eval = evaluateJa4Consistency(ja4Hash, userAgent);
  const torBrowserSignal = detectTorBrowserFromComponents(comp, userAgent);

  const isBotClient = Boolean(comp.antiSpoof?.isBot);
  const isTorDetected = netIntel.isTor || torBrowserSignal.isTor;
  const isSpoofedClient =
    Boolean(comp.antiSpoof?.isSpoofed) ||
    ja4Eval.inconsistent ||
    chEval.inconsistent ||
    torBrowserSignal.isSpoofedFallback;
  const isIncognitoClient = Boolean(comp.antiSpoof?.isIncognito);

  const scoring = computeDangerScore({
    isBot: isBotClient,
    isSpoofed: isSpoofedClient,
    isVpn: netIntel.isVpn,
    isTor: isTorDetected,
    isProxy: netIntel.isProxy,
    isDatacenter: netIntel.isDatacenter,
    isIncognito: isIncognitoClient,
    ja4Inconsistent: ja4Eval.inconsistent || chEval.inconsistent,
    ipVelocityAnomaly: false,
    geoVelocityAnomaly: false,
  });

  const isoNow = new Date().toISOString();
  const requestId = generateSnowflakeId("req");
  const visitorId = `vis_preview_${payload.hardwareHash.slice(0, 16)}`;

  return NextResponse.json(
    {
      visitorId,
      thumbmark: payload.fullHash,
      hardwareHash: payload.hardwareHash,
      requestId,
      visitorFound: false,
      confidence: {
        score: 0.95,
        revision: APP_VERSION,
        comment: `Live inspector evaluation (${APP_VERSION_TAG})`,
      },
      incognito: isIncognitoClient,
      browserName: payload.browserName ?? uaSummary.browser,
      browserVersion: payload.browserVersion ?? uaSummary.browserVersion,
      os: payload.os ?? uaSummary.os,
      osVersion: payload.osVersion ?? uaSummary.osVersion,
      device: payload.device ?? uaSummary.device,
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
      firstSeenAt: { global: isoNow, subscription: isoNow },
      lastSeenAt: { global: isoNow, subscription: isoNow },
      linkedId: null,
      tag: payload.tag ?? null,
      components: comp,
      info: {
        dangerLevel: scoring.dangerLevel,
        action: "allow",
        isBot: isBotClient,
        isSpoofed: isSpoofedClient,
        isIncognito: isIncognitoClient,
        isVpn: netIntel.isVpn,
        isTor: isTorDetected,
        isDatacenter: netIntel.isDatacenter,
        isProxy: netIntel.isProxy,
        isVirtualMachine: Boolean(comp.antiSpoof?.isVirtualMachine),
        crossBrowserMatched: false,
        vpn: netIntel.isVpn,
        proxy: netIntel.isProxy,
        tor: isTorDetected,
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
        collectorCount: 104,
      },
    },
    { status: 200 }
  );
}
