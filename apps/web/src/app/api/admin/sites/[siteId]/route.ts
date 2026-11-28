import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import {
  deleteSiteRecord,
  listSites,
  updateSiteRecord,
} from "@/lib/engine/repository";
import { validateWebhookUrl } from "@/lib/engine/webhooks";

const SiteIdParamSchema = z.string().regex(/^site_[0-9a-zA-Z_]+$/);

const PatchSiteByIdSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  domains: z.array(z.string().min(1)).min(1).optional(),
  webhookUrl: z.string().nullable().optional(),
  riskThreshold: z.number().int().min(0).max(5).optional(),
  config: z
    .object({
      webrtc: z.boolean().optional(),
      audio: z.boolean().optional(),
      canvas: z.boolean().optional(),
      webgl: z.boolean().optional(),
      fonts: z.boolean().optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
  rotateKeys: z.boolean().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ siteId: string }> }
): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { siteId } = await context.params;
  const parsedId = SiteIdParamSchema.safeParse(siteId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid site publicId" }, { status: 400 });
  }
  const sites = await listSites();
  const site = sites.find((s) => s.publicId === parsedId.data);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }
  return NextResponse.json({ site }, { status: 200 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ siteId: string }> }
): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { siteId } = await context.params;
  const parsedId = SiteIdParamSchema.safeParse(siteId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid site publicId" }, { status: 400 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSiteByIdSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  if (parsed.data.webhookUrl && parsed.data.webhookUrl.trim().length > 0) {
    const check = validateWebhookUrl(parsed.data.webhookUrl);
    if (!check.valid) {
      return NextResponse.json({ error: check.reason ?? "Invalid webhookUrl" }, { status: 400 });
    }
  }
  const updated = await updateSiteRecord(parsedId.data, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }
  return NextResponse.json({ site: updated }, { status: 200 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ siteId: string }> }
): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { siteId } = await context.params;
  const parsedId = SiteIdParamSchema.safeParse(siteId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid site publicId" }, { status: 400 });
  }
  const deleted = await deleteSiteRecord(parsedId.data);
  return NextResponse.json({ deleted }, { status: deleted ? 200 : 404 });
}
