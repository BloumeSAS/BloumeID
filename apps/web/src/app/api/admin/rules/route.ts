import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
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
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

const CreateRuleSchema = z.object({
  sitePublicId: z.string().nullable().optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(400).nullable().optional(),
  action: z.enum(["allow", "challenge", "block", "flag"]),
  conditions: z.array(ConditionSchema).min(1),
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
  const rules = await listSecurityRules(sitePublicId);
  return NextResponse.json({ rules }, { status: 200 });
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
  const parsed = CreateRuleSchema.safeParse(raw);
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
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = UpdateRuleSchema.safeParse(raw);
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

