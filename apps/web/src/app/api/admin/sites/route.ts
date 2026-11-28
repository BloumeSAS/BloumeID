import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { paginateArray, parsePaginationParams } from "@/lib/pagination";
import { parseSafeJsonBody } from "@/lib/security";
import {
  createSiteRecord,
  deleteSiteRecord,
  listSites,
  listWebhookDeliveries,
  recordWebhookDelivery,
  updateSiteRecord,
} from "@/lib/engine/repository";
import { dispatchSignedWebhook, validateWebhookUrl } from "@/lib/engine/webhooks";

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
  const url = new URL(request.url);
  const fetchAll = url.searchParams.get("all") === "true";
  const [allSites, allDeliveries] = await Promise.all([
    listSites(),
    listWebhookDeliveries(),
  ]);
  const { page, pageSize, hasExplicitPage } = parsePaginationParams(url.searchParams, 10);
  const paginatedSites =
    hasExplicitPage && !fetchAll
      ? paginateArray(allSites, page, pageSize)
      : { items: allSites, pagination: paginateArray(allSites, 1, Math.max(10, allSites.length)).pagination };
  const paginatedDeliveries =
    hasExplicitPage && !fetchAll
      ? paginateArray(allDeliveries, page, pageSize)
      : { items: allDeliveries, pagination: paginateArray(allDeliveries, 1, Math.max(10, allDeliveries.length)).pagination };

  return NextResponse.json(
    {
      items: paginatedSites.items,
      sites: paginatedSites.items,
      pagination: paginatedSites.pagination,
      webhookDeliveries: paginatedDeliveries.items,
      deliveriesPagination: paginatedDeliveries.pagination,
    },
    { status: 200 }
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bodyResult = await parseSafeJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }
  const parsed = CreateSiteSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  if (parsed.data.webhookUrl) {
    const check = validateWebhookUrl(parsed.data.webhookUrl);
    if (!check.valid) {
      return NextResponse.json({ error: check.reason ?? "Invalid webhookUrl" }, { status: 400 });
    }
  }
  const created = await createSiteRecord(parsed.data);
  return NextResponse.json({ site: created }, { status: 201 });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bodyResult = await parseSafeJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }
  const parsed = UpdateSiteSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.webhookUrl && parsed.data.webhookUrl.trim().length > 0) {
    const check = validateWebhookUrl(parsed.data.webhookUrl);
    if (!check.valid) {
      return NextResponse.json({ error: check.reason ?? "Invalid webhookUrl" }, { status: 400 });
    }
  }

  const updated = await updateSiteRecord(parsed.data.publicId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  let webhookTestResult: { delivered: boolean; attempts: number } | undefined;
  if (parsed.data.testWebhook && updated.webhookUrl && updated.webhookSecret) {
    const startMs = Date.now();
    const testPayload = {
      event: "webhook.test" as const,
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
    };
    const delivery = await dispatchSignedWebhook({
      webhookUrl: updated.webhookUrl,
      webhookSecret: updated.webhookSecret,
      maxRetries: 1,
      payload: testPayload,
    });
    webhookTestResult = delivery;
    await recordWebhookDelivery({
      sitePublicId: updated.publicId,
      eventType: "webhook.test",
      requestId: "req_test_webhook_probe",
      targetUrl: updated.webhookUrl,
      statusCode: delivery.statusCode ?? null,
      durationMs: Date.now() - startMs,
      delivered: delivery.delivered,
      attempts: delivery.attempts,
      payload: testPayload as unknown as Record<string, unknown>,
    });
  }

  const webhookDeliveries = await listWebhookDeliveries();
  return NextResponse.json(
    { site: updated, webhookTestResult, webhookDeliveries },
    { status: 200 }
  );
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
