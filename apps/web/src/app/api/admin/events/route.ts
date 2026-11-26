import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { listFingerprintEvents } from "@/lib/engine/repository";

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
  const minDanger = Math.max(0, Math.min(5, Number(url.searchParams.get("minDanger") ?? 0)));
  const parsedVector = VectorSchema.safeParse(url.searchParams.get("vector") ?? "all");
  const vector = parsedVector.success ? parsedVector.data : "all";
  const linkedId = url.searchParams.get("linkedId") ?? undefined;

  const events = await listFingerprintEvents({
    sitePublicId,
    query,
    minDanger,
    vector,
    linkedId,
    limit: 100,
  });

  return NextResponse.json({ events }, { status: 200 });
}

