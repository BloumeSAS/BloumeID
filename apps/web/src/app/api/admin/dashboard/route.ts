import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { DatabaseUnavailableError, getDashboardMetrics } from "@/lib/engine/repository";

const PeriodSchema = z.enum(["1h", "24h", "7d", "30d", "90d"]).default("24h");

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = PeriodSchema.safeParse(url.searchParams.get("period") ?? "24h");
  const period = parsed.success ? parsed.data : "24h";
  const siteId = url.searchParams.get("siteId") ?? undefined;

  try {
    const metrics = await getDashboardMetrics(period, siteId);
    return NextResponse.json(metrics, { status: 200 });
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
}
