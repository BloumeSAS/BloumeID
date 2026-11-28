import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";
import { NO_STORE_HEADERS, extractServerApiSecretKey } from "@/lib/security";
import { paginateArray, parsePaginationParams } from "@/lib/pagination";
import { z } from "zod";
import { getVisitorByPublicId, verifySiteSecretKey } from "@/lib/engine/repository";

const VisitorIdParamSchema = z.string().regex(/^vis_[0-9a-zA-Z_]+$/);

const VisitsQuerySchema = z.object({
  request_id: z.string().trim().regex(/^req_[0-9a-zA-Z_]+$/).max(128).optional(),
  linked_id: z.string().trim().max(256).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * Fingerprint.com Server API (`GET /api/v1/visitors/[visitorId]/visits`) compatible endpoint
 * with `request_id`, `linked_id`, and `limit` query filtering.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ visitorId: string }> }
): Promise<NextResponse> {
  const secretKey = extractServerApiSecretKey(request, true);
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

  const url = new URL(request.url);
  const parsedQuery = VisitsQuerySchema.safeParse({
    request_id: url.searchParams.get("request_id") ?? undefined,
    linked_id: url.searchParams.get("linked_id") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query parameters" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const requestIdFilter = parsedQuery.data.request_id;
  const linkedIdFilter = parsedQuery.data.linked_id;
  const limit = parsedQuery.data.limit ?? 50;
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
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

