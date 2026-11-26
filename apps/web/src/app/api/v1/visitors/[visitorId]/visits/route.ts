import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";
import { paginateArray, parsePaginationParams } from "@/lib/pagination";
import { z } from "zod";
import { getVisitorByPublicId, verifySiteSecretKey } from "@/lib/engine/repository";

const VisitorIdParamSchema = z.string().regex(/^vis_[0-9a-zA-Z_]+$/);

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
 * Fingerprint.com Server API (`GET /api/v1/visitors/[visitorId]/visits`) compatible endpoint
 * with `request_id`, `linked_id`, and `limit` query filtering.
 */
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

  const url = new URL(request.url);
  const requestIdFilter = url.searchParams.get("request_id");
  const linkedIdFilter = url.searchParams.get("linked_id");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const { page, pageSize, hasExplicitPage } = parsePaginationParams(url.searchParams, limit);

  const filteredVisits = data.events
    .filter((e) => !requestIdFilter || e.publicId === requestIdFilter)
    .filter((e) => !linkedIdFilter || e.linkedId === linkedIdFilter);
  const paginated = hasExplicitPage
    ? paginateArray(filteredVisits, page, pageSize)
    : paginateArray(filteredVisits, 1, limit);

  const visits = paginated.items.map((e) => ({
      requestId: e.publicId,
      browserDetails: {
        browserName: e.browser ?? "Unknown",
        os: e.os ?? "Unknown",
        device: e.device ?? "Desktop",
        userAgent: e.userAgent,
      },
      incognito: e.isIncognito,
      ip: e.ipAddress,
      ipLocation: {
        city: { name: e.city },
        country: { code: e.country, name: e.country },
        latitude: e.latitude,
        longitude: e.longitude,
        asn: {
          asn: e.asnNumber ? `AS${e.asnNumber}` : null,
          name: e.asnOrg,
        },
      },
      timestamp: new Date(e.createdAt).getTime(),
      time: e.createdAt,
      url: e.origin ?? "",
      tag: e.tag ?? {},
      linkedId: e.linkedId ?? "",
      confidence: { score: e.confidence, revision: APP_VERSION },
      visitorFound: true,
      dangerLevel: e.dangerLevel,
      action: e.ruleAction,
    }));

  return NextResponse.json(
    {
      visitorId: data.visitor.publicId,
      visits,
      pagination: paginated.pagination,
      lastTimestamp: visits[visits.length - 1]?.timestamp ?? null,
    },
    { status: 200 }
  );
}

