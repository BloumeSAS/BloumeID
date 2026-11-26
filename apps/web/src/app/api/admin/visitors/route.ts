import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import {
  getVisitorByPublicId,
  listVisitors,
  updateVisitorAnnotations,
} from "@/lib/engine/repository";

const UpdateVisitorSchema = z.object({
  publicId: z.string().regex(/^vis_/),
  tags: z.array(z.string().min(1).max(40)),
  notes: z.string().max(4000).nullable(),
});

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const visitorId = url.searchParams.get("visitorId");
  if (visitorId) {
    const profile = await getVisitorByPublicId(visitorId);
    if (!profile) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }
    return NextResponse.json(profile, { status: 200 });
  }

  const query = url.searchParams.get("q") ?? "";
  const onlyHighRisk = url.searchParams.get("highRisk") === "true";
  const visitors = await listVisitors({ query, onlyHighRisk });
  return NextResponse.json({ visitors }, { status: 200 });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateVisitorSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const updated = await updateVisitorAnnotations(parsed.data.publicId, {
    tags: parsed.data.tags,
    notes: parsed.data.notes,
  });

  if (!updated) {
    return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
  }

  return NextResponse.json({ visitor: updated }, { status: 200 });
}

