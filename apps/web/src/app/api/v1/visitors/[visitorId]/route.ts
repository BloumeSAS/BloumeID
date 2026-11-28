import { NextResponse } from "next/server";
import { z } from "zod";
import { NO_STORE_HEADERS, extractServerApiSecretKey } from "@/lib/security";
import { getVisitorByPublicId, verifySiteSecretKey } from "@/lib/engine/repository";

const VisitorIdParamSchema = z.string().regex(/^vis_[0-9a-zA-Z_]+$/);

export async function GET(
  request: Request,
  context: { params: Promise<{ visitorId: string }> }
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

  const { visitorId } = await context.params;
  const parsedId = VisitorIdParamSchema.safeParse(visitorId);
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Invalid visitorId format" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const data = await getVisitorByPublicId(parsedId.data, { includeEventComponents: false });
  if (!data || data.visitor.sitePublicId !== site.publicId) {
    return NextResponse.json(
      { error: "Visitor not found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      visitorId: data.visitor.publicId,
      siteId: data.visitor.sitePublicId,
      hardwareHash: data.visitor.hardwareHash,
      firstSeenAt: data.visitor.firstSeenAt,
      lastSeenAt: data.visitor.lastSeenAt,
      visitCount: data.visitor.visitCount,
      maxDangerLevel: data.visitor.maxDangerLevel,
      tags: data.visitor.tags,
      notes: data.visitor.notes,
      recentEvents: data.events.map((e) => ({
        requestId: e.publicId,
        fullHash: e.fullHash,
        ipAddress: e.ipAddress,
        dangerLevel: e.dangerLevel,
        confidence: e.confidence,
        crossBrowserMatched: e.crossBrowserMatched,
        createdAt: e.createdAt,
      })),
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

