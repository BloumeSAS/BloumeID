import { NextResponse } from "next/server";
import { z } from "zod";
import { NO_STORE_HEADERS, extractServerApiSecretKey } from "@/lib/security";
import { getEventByPublicId, verifySiteSecretKey } from "@/lib/engine/repository";

const RequestIdParamSchema = z.string().regex(/^req_[0-9a-zA-Z_]+$/);

export async function GET(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
): Promise<NextResponse> {
  const secretKey = extractServerApiSecretKey(request);
  if (!secretKey || !secretKey.startsWith("bid_sec_")) {
    return NextResponse.json(
      { error: "Missing or invalid secret key (must start with bid_sec_)" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const site = await verifySiteSecretKey(secretKey);
  if (!site) {
    return NextResponse.json(
      { error: "Unauthorized secret key" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const { requestId } = await context.params;
  const parsedId = RequestIdParamSchema.safeParse(requestId);
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Invalid requestId format" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const event = await getEventByPublicId(parsedId.data);
  if (!event || event.sitePublicId !== site.publicId) {
    return NextResponse.json(
      { error: "Fingerprint request not found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
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
      confidence: event.confidence,
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
      },
      createdAt: event.createdAt,
      components: event.components,
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

