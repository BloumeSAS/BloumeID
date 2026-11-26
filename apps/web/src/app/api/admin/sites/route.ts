import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import {
  createSiteRecord,
  deleteSiteRecord,
  listSites,
  updateSiteRecord,
} from "@/lib/engine/repository";
import { dispatchSignedWebhook } from "@/lib/engine/webhooks";

const CollectorsSchema = z
  .object({
    webrtc: z.boolean().optional(),
    audio: z.boolean().optional(),
    canvas: z.boolean().optional(),
    webgl: z.boolean().optional(),
    fonts: z.boolean().optional(),
  })
  .optional();

const CreateSiteSchema = z.object({
  name: z.string().min(1).max(120),
  domains: z.array(z.string().min(1)).min(1),
  webhookUrl: z.string().url().nullable().optional(),
  riskThreshold: z.number().int().min(0).max(5).optional(),
  config: CollectorsSchema,
});

const UpdateSiteSchema = z.object({
  publicId: z.string().regex(/^site_/),
  name: z.string().min(1).max(120).optional(),
  domains: z.array(z.string().min(1)).min(1).optional(),
  webhookUrl: z.string().nullable().optional(),
  riskThreshold: z.number().int().min(0).max(5).optional(),
  config: CollectorsSchema,
  isActive: z.boolean().optional(),
  rotateKeys: z.boolean().optional(),
  testWebhook: z.boolean().optional(),
});

const DeleteSiteSchema = z.object({
  publicId: z.string().regex(/^site_/),
});

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sites = await listSites();
  return NextResponse.json({ sites }, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CreateSiteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const created = await createSiteRecord(parsed.data);
  return NextResponse.json({ site: created }, { status: 201 });
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
  const parsed = UpdateSiteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await updateSiteRecord(parsed.data.publicId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  let webhookTestResult: { delivered: boolean; attempts: number } | undefined;
  if (parsed.data.testWebhook && updated.webhookUrl && updated.webhookSecret) {
    webhookTestResult = await dispatchSignedWebhook({
      webhookUrl: updated.webhookUrl,
      webhookSecret: updated.webhookSecret,
      maxRetries: 1,
      payload: {
        event: "webhook.test",
        timestamp: new Date().toISOString(),
        siteId: updated.publicId,
        requestId: "req_test_webhook_probe",
        visitorId: "vis_test_webhook_probe",
        thumbmark: "0".repeat(64),
        hardwareHash: "f".repeat(64),
        dangerLevel: updated.riskThreshold,
        confidence: 0.99,
        flags: {
          isBot: true,
          isSpoofed: false,
          isVpn: true,
          isTor: false,
          isDatacenter: true,
          isProxy: false,
          isIncognito: false,
          crossBrowserMatched: false,
        },
        network: {
          ipAddress: "185.220.101.1",
          asnNumber: 24940,
          asnOrg: "BloumeID Test Probe",
          country: "FR",
        },
      },
    });
  }

  return NextResponse.json({ site: updated, webhookTestResult }, { status: 200 });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const parsed = DeleteSiteSchema.safeParse({
    publicId: url.searchParams.get("publicId") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid site publicId" }, { status: 400 });
  }
  const deleted = await deleteSiteRecord(parsed.data.publicId);
  return NextResponse.json({ deleted }, { status: deleted ? 200 : 404 });
}

