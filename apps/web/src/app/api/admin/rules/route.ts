import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { paginateArray, parsePaginationParams } from "@/lib/pagination";
import { NO_STORE_HEADERS, parseSafeJsonBody } from "@/lib/security";
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

const RuleIdSchema = z.string().regex(/^rule_[0-9a-zA-Z_]+$/);
const SiteIdFilterSchema = z.string().regex(/^site_[0-9a-zA-Z_]+$/).or(z.literal("all"));

const UpdateRuleSchema = z.object({
  publicId: RuleIdSchema,
  isEnabled: z.boolean().optional(),
  action: z.enum(["allow", "challenge", "block", "flag"]).optional(),
  priority: z.number().int().min(1).max(1000).optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  const url = new URL(request.url);
  const parsedSite = SiteIdFilterSchema.safeParse(url.searchParams.get("siteId") ?? "all");
  if (!parsedSite.success) {
    return NextResponse.json(
      { error: "Invalid siteId parameter" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const allRules = await listSecurityRules(parsedSite.data);
  const { page, pageSize, hasExplicitPage } = parsePaginationParams(url.searchParams, 15);
  const paginated = hasExplicitPage
    ? paginateArray(allRules, page, pageSize)
    : { items: allRules, pagination: paginateArray(allRules, 1, Math.max(15, allRules.length)).pagination };
  return NextResponse.json(
    { items: paginated.items, rules: paginated.items, pagination: paginated.pagination },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  const bodyResult = await parseSafeJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error },
      { status: bodyResult.status, headers: NO_STORE_HEADERS }
    );
  }
  const parsed = CreateRuleSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const rule = await createSecurityRule(parsed.data);
  return NextResponse.json({ rule }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  const bodyResult = await parseSafeJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error },
      { status: bodyResult.status, headers: NO_STORE_HEADERS }
    );
  }
  const parsed = UpdateRuleSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const updated = await updateSecurityRule(parsed.data.publicId, parsed.data);
  if (!updated) {
    return NextResponse.json(
      { error: "Rule not found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }
  return NextResponse.json({ rule: updated }, { status: 200, headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  const url = new URL(request.url);
  const parsedId = RuleIdSchema.safeParse(url.searchParams.get("publicId") ?? "");
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Invalid rule publicId" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const deleted = await deleteSecurityRule(parsedId.data);
  return NextResponse.json({ deleted }, { status: deleted ? 200 : 404, headers: NO_STORE_HEADERS });
}

