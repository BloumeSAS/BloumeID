import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { paginateArray, parsePaginationParams } from "@/lib/pagination";
import { parseSafeJsonBody } from "@/lib/security";
import {
  createSecurityRule,
  deleteSecurityRule,
  listSecurityRules,
  updateSecurityRule,
} from "@/lib/engine/repository";

const ConditionSchema = z.object({
  field: z.enum([
    "isTor",
    "isVpn",
    "isDatacenter",
    "isBot",
    "isSpoofed",
    "dangerLevel",
    "country",
    "asnNumber",
    "visitorId",
    "ipSubnet",
  ]),
  operator: z.enum(["eq", "neq", "gte", "in", "not_in"]),
  value: z.union([
    z.string().max(256),
    z.number().finite(),
    z.boolean(),
    z.array(z.string().max(128)).max(200),
  ]),
});

const CreateRuleSchema = z.object({
  sitePublicId: z.string().nullable().optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(400).nullable().optional(),
  action: z.enum(["allow", "challenge", "block", "flag"]),
  conditions: z.array(ConditionSchema).min(1).max(20),
  priority: z.number().int().min(1).max(1000).optional(),
});

const UpdateRuleSchema = z.object({
  publicId: z.string().regex(/^rule_/),
  isEnabled: z.boolean().optional(),
  action: z.enum(["allow", "challenge", "block", "flag"]).optional(),
  priority: z.number().int().min(1).max(1000).optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const sitePublicId = url.searchParams.get("siteId") ?? "all";
  const allRules = await listSecurityRules(sitePublicId);
  const { page, pageSize, hasExplicitPage } = parsePaginationParams(url.searchParams, 15);
  const paginated = hasExplicitPage
    ? paginateArray(allRules, page, pageSize)
    : { items: allRules, pagination: paginateArray(allRules, 1, Math.max(15, allRules.length)).pagination };
  return NextResponse.json(
    { items: paginated.items, rules: paginated.items, pagination: paginated.pagination },
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
  const parsed = CreateRuleSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const rule = await createSecurityRule(parsed.data);
  return NextResponse.json({ rule }, { status: 201 });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bodyResult = await parseSafeJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }
  const parsed = UpdateRuleSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const updated = await updateSecurityRule(parsed.data.publicId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
  return NextResponse.json({ rule: updated }, { status: 200 });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const publicId = url.searchParams.get("publicId") ?? "";
  if (!publicId.startsWith("rule_")) {
    return NextResponse.json({ error: "Invalid rule publicId" }, { status: 400 });
  }
  const deleted = await deleteSecurityRule(publicId);
  return NextResponse.json({ deleted }, { status: deleted ? 200 : 404 });
}

