import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { parsePaginationParams } from "@/lib/pagination";
import { listFingerprintEventsPaginated, resolvePeriodRange } from "@/lib/engine/repository";

const VectorSchema = z
  .enum(["all", "bot", "vpntor", "spoofed", "crossbrowser"])
  .default("all");

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sitePublicId = url.searchParams.get("siteId") ?? "all";
  const query = url.searchParams.get("q") ?? "";
  const rawMinDanger = Number(url.searchParams.get("minDanger") ?? 0);
  const minDanger = Number.isFinite(rawMinDanger)
    ? Math.max(0, Math.min(5, Math.trunc(rawMinDanger)))
    : 0;
  const parsedVector = VectorSchema.safeParse(url.searchParams.get("vector") ?? "all");
  const vector = parsedVector.success ? parsedVector.data : "all";
  const linkedId = url.searchParams.get("linkedId") ?? undefined;
  const action = url.searchParams.get("action") ?? "all";
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
    { status: 200 }
  );
}
