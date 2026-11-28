import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { parsePaginationParams } from "@/lib/pagination";
import { NO_STORE_HEADERS, parseSafeJsonBody } from "@/lib/security";
import {
  getVisitorByPublicId,
  listVisitorsPaginated,
  resolvePeriodRange,
  updateVisitorAnnotations,
} from "@/lib/engine/repository";

const VisitorIdSchema = z.string().regex(/^vis_[0-9a-zA-Z_]+$/);
const SiteIdFilterSchema = z.string().regex(/^site_[0-9a-zA-Z_]+$/).or(z.literal("all"));
const TrustStatusFilterSchema = z.enum(["all", "neutral", "trusted", "blocked"]).default("all");

const UpdateVisitorSchema = z.object({
  publicId: VisitorIdSchema,
  tags: z.array(z.string().min(1).max(40)).max(32).optional(),
  notes: z.string().max(4000).nullable().optional(),
  trustStatus: z.enum(["neutral", "trusted", "blocked"]).optional(),
  mergeSourceVisitorId: VisitorIdSchema.optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const url = new URL(request.url);
  const visitorId = url.searchParams.get("visitorId");
  if (visitorId) {
    const parsedVisitorId = VisitorIdSchema.safeParse(visitorId);
    if (!parsedVisitorId.success) {
      return NextResponse.json(
        { error: "Invalid visitorId parameter" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    const profile = await getVisitorByPublicId(parsedVisitorId.data);
    if (!profile) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json(profile, { status: 200, headers: NO_STORE_HEADERS });
  }

  const query = (url.searchParams.get("q") ?? "").slice(0, 256);
  const onlyHighRisk = url.searchParams.get("highRisk") === "true";
  const parsedSite = SiteIdFilterSchema.safeParse(url.searchParams.get("siteId") ?? "all");
  if (!parsedSite.success) {
    return NextResponse.json(
      { error: "Invalid siteId parameter" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const sitePublicId = parsedSite.data;
  const parsedTrust = TrustStatusFilterSchema.safeParse(
    url.searchParams.get("trustStatus") ?? "all"
  );
  const trustStatus = parsedTrust.success ? parsedTrust.data : "all";
  const periodParam = url.searchParams.get("period");
  const since = periodParam ? resolvePeriodRange(periodParam).since : undefined;
  const { page, pageSize } = parsePaginationParams(url.searchParams, 25);
  const result = await listVisitorsPaginated({
    sitePublicId,
    query,
    onlyHighRisk,
    trustStatus,
    since,
    page,
    pageSize,
  });
  return NextResponse.json(
    { items: result.items, visitors: result.items, pagination: result.pagination },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

export async function PATCH(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const bodyResult = await parseSafeJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error },
      { status: bodyResult.status, headers: NO_STORE_HEADERS }
    );
  }

  const parsed = UpdateVisitorSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  if (
    parsed.data.mergeSourceVisitorId &&
    parsed.data.mergeSourceVisitorId === parsed.data.publicId
  ) {
    return NextResponse.json(
      { error: "Cannot merge a visitor profile into itself" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const updated = await updateVisitorAnnotations(parsed.data.publicId, {
    tags: parsed.data.tags,
    notes: parsed.data.notes,
    trustStatus: parsed.data.trustStatus,
    mergeSourceVisitorId: parsed.data.mergeSourceVisitorId,
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Visitor not found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json({ visitor: updated }, { status: 200, headers: NO_STORE_HEADERS });
}
