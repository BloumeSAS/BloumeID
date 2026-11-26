import { NextResponse } from "next/server";
import { z } from "zod";
import { getEventByPublicId, verifySiteSecretKey } from "@/lib/engine/repository";

const RequestIdParamSchema = z.string().regex(/^req_[0-9a-zA-Z_]+$/);

function extractSecretKey(request: Request): string {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  return (
    request.headers.get("x-bloumeid-secret") ??
    request.headers.get("auth-api-key") ??
    new URL(request.url).searchParams.get("api_key") ??
    ""
  );
}

/**
 * Fingerprint.com Server API (`GET /api/v1/events/[requestId]`) compatible endpoint.
 * Returns both Fingerprint.com `products` (`identification`, `botd`, `vpn`, `tor`, `ipInfo`, `tampering`, `incognito`)
 * and BloumeID/ThumbmarkJS verification fields.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
): Promise<NextResponse> {
  const secretKey = extractSecretKey(request);
  if (!secretKey || !secretKey.startsWith("bid_sec_")) {
    return NextResponse.json(
      { error: "Missing or invalid secret key (must start with bid_sec_)" },
      { status: 401 }
    );
  }

  const site = await verifySiteSecretKey(secretKey);
  if (!site) {
    return NextResponse.json({ error: "Unauthorized secret key" }, { status: 401 });
  }

  const { requestId } = await context.params;
  const parsedId = RequestIdParamSchema.safeParse(requestId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid requestId format" }, { status: 400 });
  }

  const event = await getEventByPublicId(parsedId.data);
  if (!event || event.sitePublicId !== site.publicId) {
    return NextResponse.json({ error: "Fingerprint event not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      verified: true,
      requestId: event.publicId,
      visitorId: event.visitorPublicId,
      siteId: event.sitePublicId,
      thumbmark: event.fullHash,
      hardwareHash: event.hardwareHash,
      dangerLevel: event.dangerLevel,
      action: event.ruleAction,
      confidence: event.confidence,
      linkedId: event.linkedId,
      tag: event.tag,
      products: {
        identification: {
          data: {
            visitorId: event.visitorPublicId,
            requestId: event.publicId,
            browserDetails: {
              browserName: event.browser ?? "Unknown",
              os: event.os ?? "Unknown",
              device: event.device ?? "Desktop",
              userAgent: event.userAgent,
            },
            incognito: event.isIncognito,
            ip: event.ipAddress,
            ipLocation: {
              city: { name: event.city },
              country: { code: event.country, name: event.country },
              latitude: event.latitude,
              longitude: event.longitude,
              asn: {
                asn: event.asnNumber ? `AS${event.asnNumber}` : null,
                name: event.asnOrg,
              },
            },
            timestamp: new Date(event.createdAt).getTime(),
            time: event.createdAt,
            url: event.origin ?? "",
            tag: event.tag ?? {},
            linkedId: event.linkedId ?? "",
            confidence: { score: event.confidence, revision: "1.0.0" },
            visitorFound: true,
          },
        },
        botd: {
          data: {
            bot: {
              result: event.isBot ? "bad" : "notDetected",
              type: event.isBot ? "automationTool" : undefined,
            },
          },
        },
        vpn: {
          data: {
            result: event.isVpn || event.isProxy,
            confidence: "high",
          },
        },
        tor: {
          data: {
            result: event.isTor,
          },
        },
        tampering: {
          data: {
            result: event.isSpoofed,
            anomalyScore: event.dangerLevel / 5,
          },
        },
        suspectScore: {
          data: {
            result: event.dangerLevel * 20,
          },
        },
      },
      flags: {
        isBot: event.isBot,
        isSpoofed: event.isSpoofed,
        isVpn: event.isVpn,
        isTor: event.isTor,
        isDatacenter: event.isDatacenter,
        isProxy: event.isProxy,
        isIncognito: event.isIncognito,
        crossBrowserMatched: event.crossBrowserMatched,
      },
      network: {
        ipAddress: event.ipAddress,
        ipSubnet: event.ipSubnet,
        ja4Hash: event.ja4Hash,
        asnNumber: event.asnNumber,
        asnOrg: event.asnOrg,
        country: event.country,
        city: event.city,
        latitude: event.latitude,
        longitude: event.longitude,
      },
      createdAt: event.createdAt,
      components: event.components,
    },
    { status: 200 }
  );
}

