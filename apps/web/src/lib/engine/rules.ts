import type { SecurityRuleAction } from "@bloume/id";

export type RuleConditionField =
  | "isTor"
  | "isVpn"
  | "isDatacenter"
  | "isBot"
  | "isSpoofed"
  | "dangerLevel"
  | "country"
  | "asnNumber"
  | "visitorId"
  | "ipSubnet";

export type RuleConditionOperator = "eq" | "neq" | "gte" | "in" | "not_in";

export interface SecurityRuleCondition {
  field: RuleConditionField;
  operator: RuleConditionOperator;
  value: string | number | boolean | string[];
}

export interface EvaluableSecurityRule {
  publicId: string;
  sitePublicId: string | null;
  name: string;
  action: SecurityRuleAction;
  conditions: SecurityRuleCondition[];
  priority: number;
  isEnabled: boolean;
  hitCount: number;
}

export interface RuleEvaluationContext {
  sitePublicId: string;
  visitorPublicId: string;
  visitorTrustStatus?: "neutral" | "trusted" | "blocked";
  isTor: boolean;
  isVpn: boolean;
  isDatacenter: boolean;
  isBot: boolean;
  isSpoofed: boolean;
  dangerLevel: number;
  country: string | null;
  asnNumber: number | null;
  ipSubnet: string;
}

function evaluateSingleCondition(
  cond: SecurityRuleCondition,
  ctx: RuleEvaluationContext
): boolean {
  const actual = (() => {
    switch (cond.field) {
      case "isTor":
        return ctx.isTor;
      case "isVpn":
        return ctx.isVpn;
      case "isDatacenter":
        return ctx.isDatacenter;
      case "isBot":
        return ctx.isBot;
      case "isSpoofed":
        return ctx.isSpoofed;
      case "dangerLevel":
        return ctx.dangerLevel;
      case "country":
        return (ctx.country ?? "").toUpperCase();
      case "asnNumber":
        return ctx.asnNumber ?? 0;
      case "visitorId":
        return ctx.visitorPublicId;
      case "ipSubnet":
        return ctx.ipSubnet;
    }
  })();

  if (cond.operator === "eq") {
    return String(actual).toLowerCase() === String(cond.value).toLowerCase();
  }
  if (cond.operator === "neq") {
    return String(actual).toLowerCase() !== String(cond.value).toLowerCase();
  }
  if (cond.operator === "gte") {
    return Number(actual) >= Number(cond.value);
  }

  const list = Array.isArray(cond.value)
    ? cond.value.map((x) => String(x).trim().toLowerCase())
    : String(cond.value)
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);

  if (cond.operator === "in") {
    return list.includes(String(actual).toLowerCase());
  }
  if (cond.operator === "not_in") {
    return !list.includes(String(actual).toLowerCase());
  }
  return false;
}

/**
 * Evaluates visitor trust overrides (`trusted` -> allow, `blocked` -> block)
 * followed by active security rules ordered by ascending priority.
 */
export function evaluateSecurityRules(
  rules: EvaluableSecurityRule[],
  ctx: RuleEvaluationContext
): { action: SecurityRuleAction; matchedRuleId: string | null } {
  if (ctx.visitorTrustStatus === "blocked") {
    return { action: "block", matchedRuleId: "visitor_policy_blocked" };
  }
  if (ctx.visitorTrustStatus === "trusted") {
    return { action: "allow", matchedRuleId: "visitor_policy_trusted" };
  }

  const applicable = rules
    .filter(
      (r) =>
        r.isEnabled &&
        (r.sitePublicId === null || r.sitePublicId === ctx.sitePublicId)
    )
    .sort((a, b) => a.priority - b.priority);

  for (const rule of applicable) {
    if (
      rule.conditions.length > 0 &&
      rule.conditions.every((cond) => evaluateSingleCondition(cond, ctx))
    ) {
      return {
        action: rule.action,
        matchedRuleId: rule.publicId,
      };
    }
  }

  if (ctx.dangerLevel >= 4 || ctx.isBot) {
    return { action: "challenge", matchedRuleId: null };
  }

  return { action: "allow", matchedRuleId: null };
}

