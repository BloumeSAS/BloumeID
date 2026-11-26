import { NextResponse } from "next/server";
import { z } from "zod";
import { getEventByPublicId, verifySiteSecretKey } from "@/lib/engine/repository";

const RequestIdParamSchema = z.string().regex(/^req_[0-9a-zA-Z_]+$/);

function extractSecretKey(request: Request): string {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  return request.headers.get("x-bloumeid-secret") ?? "";
}

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
    return NextResponse.json({ error: "Fingerprint request not found" }, { status: 404 });
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
    { status: 200 }
  );
}

