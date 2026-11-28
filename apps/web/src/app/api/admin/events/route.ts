import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { parsePaginationParams } from "@/lib/pagination";
import { NO_STORE_HEADERS } from "@/lib/security";
import { listFingerprintEventsPaginated, resolvePeriodRange } from "@/lib/engine/repository";

const VectorSchema = z
  .enum(["all", "bot", "vpntor", "spoofed", "crossbrowser"])
  .default("all");
const SiteIdFilterSchema = z.string().regex(/^site_[0-9a-zA-Z_]+$/).or(z.literal("all"));
const ActionFilterSchema = z.enum(["all", "allow", "challenge", "block", "flag"]).default("all");

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const url = new URL(request.url);
  const rawSiteId = url.searchParams.get("siteId") ?? "all";
  const parsedSite = SiteIdFilterSchema.safeParse(rawSiteId);
  if (!parsedSite.success) {
    return NextResponse.json(
      { error: "Invalid siteId parameter" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const sitePublicId = parsedSite.data;
  const query = (url.searchParams.get("q") ?? "").slice(0, 256);
  const rawMinDanger = Number(url.searchParams.get("minDanger") ?? 0);
  const minDanger = Number.isFinite(rawMinDanger)
    ? Math.max(0, Math.min(5, Math.trunc(rawMinDanger)))
    : 0;
  const parsedVector = VectorSchema.safeParse(url.searchParams.get("vector") ?? "all");
  const vector = parsedVector.success ? parsedVector.data : "all";
  const rawLinkedId = url.searchParams.get("linkedId");
  const linkedId = rawLinkedId ? rawLinkedId.slice(0, 256) : undefined;
  const parsedAction = ActionFilterSchema.safeParse(url.searchParams.get("action") ?? "all");
  const action = parsedAction.success ? parsedAction.data : "all";
  const periodParam = url.searchParams.get("period");
  const since = periodParam ? resolvePeriodRange(periodParam).since : undefined;
  const { page, pageSize } = parsePaginationParams(url.searchParams, 25);

  const result = await listFingerprintEventsPaginated({
    sitePublicId,
    query,
    minDanger,
    vector,
    linkedId,
    action,
    since,
    page,
    pageSize,
  });

  return NextResponse.json(
    {
      items: result.items,
      events: result.items,
      pagination: result.pagination,
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}
