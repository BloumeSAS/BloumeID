import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { NO_STORE_HEADERS } from "@/lib/security";
import { DatabaseUnavailableError, getDashboardMetrics } from "@/lib/engine/repository";

const PeriodSchema = z.enum(["1h", "24h", "7d", "30d", "90d"]).default("24h");
const SiteIdFilterSchema = z.string().regex(/^site_[0-9a-zA-Z_]+$/).or(z.literal("all"));

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const url = new URL(request.url);
  const parsed = PeriodSchema.safeParse(url.searchParams.get("period") ?? "24h");
  const period = parsed.success ? parsed.data : "24h";
  const rawSiteId = url.searchParams.get("siteId");
  let siteId: string | undefined;
  if (rawSiteId && rawSiteId.trim().length > 0) {
    const parsedSiteId = SiteIdFilterSchema.safeParse(rawSiteId.trim());
    if (!parsedSiteId.success) {
      return NextResponse.json(
        { error: "Invalid siteId parameter" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    siteId = parsedSiteId.data;
  }

  try {
    const metrics = await getDashboardMetrics(period, siteId);
    return NextResponse.json(metrics, { status: 200, headers: NO_STORE_HEADERS });
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json(
      { error: "Unable to load dashboard metrics" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
