import { NextResponse } from "next/server";
import { z } from "zod";
import { getVisitorByPublicId, verifySiteSecretKey } from "@/lib/engine/repository";

const VisitorIdParamSchema = z.string().regex(/^vis_[0-9a-zA-Z_]+$/);

function extractSecretKey(request: Request): string {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  return request.headers.get("x-bloumeid-secret") ?? "";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ visitorId: string }> }
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

  const { visitorId } = await context.params;
  const parsedId = VisitorIdParamSchema.safeParse(visitorId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid visitorId format" }, { status: 400 });
  }

  const data = await getVisitorByPublicId(parsedId.data);
  if (!data || data.visitor.sitePublicId !== site.publicId) {
    return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
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
    { status: 200 }
  );
}

