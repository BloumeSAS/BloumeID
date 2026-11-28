import dns from "node:dns/promises";
import { isIP } from "node:net";
import { signHmacSha256 } from "./snowflake";

function isPrivateOrReservedIp(host: string): boolean {
  const clean = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (clean === "localhost" || clean.endsWith(".local") || clean.endsWith(".internal")) {
    return true;
  }
  const ipVersion = isIP(clean);
  if (ipVersion === 4) {
    const parts = clean.split(".").map(Number);
    const [a = 0, b = 0] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (ipVersion === 6) {
    if (clean === "::1" || clean === "::") return true;
    if (clean.startsWith("fe80:") || clean.startsWith("fc") || clean.startsWith("fd")) return true;
    if (clean.startsWith("::ffff:")) {
      return isPrivateOrReservedIp(clean.slice(7));
    }
    return false;
  }
  return false;
}

function parseSafeWebhookUrl(rawUrl: string): { valid: true; url: URL } | { valid: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: "Invalid webhook URL format" };
  }

  const isProd = process.env.NODE_ENV === "production";
  if (parsed.protocol !== "https:" && (isProd || parsed.protocol !== "http:")) {
    return {
      valid: false,
      reason: isProd ? "Webhook URL must use https:// in production" : "Unsupported URL protocol",
    };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: "Webhook URL must not contain embedded credentials" };
  }

  if (isPrivateOrReservedIp(parsed.hostname)) {
    return {
      valid: false,
      reason: `SSRF blocked: private or reserved webhook host (${parsed.hostname})`,
    };
  }

  const safeUrl = new URL(`${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`);
  return { valid: true, url: safeUrl };
}

export function validateWebhookUrl(rawUrl: string): { valid: boolean; reason?: string } {
  const res = parseSafeWebhookUrl(rawUrl);
  return res.valid ? { valid: true } : { valid: false, reason: res.reason };
}

export interface WebhookEventPayload {
  event: "threat.detected" | "webhook.test";
  timestamp: string;
  siteId: string;
  requestId: string;
  visitorId: string;
  thumbmark: string;
  hardwareHash: string;
  dangerLevel: number;
  confidence: number;
  flags: {
    isBot: boolean;
    isSpoofed: boolean;
    isVpn: boolean;
    isTor: boolean;
    isDatacenter: boolean;
    isProxy: boolean;
    isIncognito: boolean;
    crossBrowserMatched: boolean;
  };
  network: {
    ipAddress: string;
    asnNumber: number | null;
    asnOrg: string | null;
    country: string | null;
  };
}

export function shouldTriggerWebhook(params: {
  webhookUrl: string | null | undefined;
  dangerLevel: number;
  riskThreshold: number;
  isBot: boolean;
}): boolean {
  if (!params.webhookUrl || !params.webhookUrl.trim()) {
    return false;
  }
  return params.dangerLevel >= params.riskThreshold || params.isBot === true;
}

export async function dispatchSignedWebhook(params: {
  webhookUrl: string;
  webhookSecret: string;
  payload: WebhookEventPayload;
  maxRetries?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<{ delivered: boolean; attempts: number; statusCode?: number }> {
  const check = parseSafeWebhookUrl(params.webhookUrl);
  if (!check.valid) {
    return { delivered: false, attempts: 0 };
  }

  if (!params.fetchImpl && isIP(check.url.hostname) === 0) {
    try {
      const resolved = await dns.lookup(check.url.hostname, { all: true });
      if (resolved.some((entry) => isPrivateOrReservedIp(entry.address))) {
        return { delivered: false, attempts: 0 };
      }
    } catch {
      return { delivered: false, attempts: 0 };
    }
  }

  const maxRetries = params.maxRetries ?? 3;
  const baseDelayMs = params.baseDelayMs ?? 250;
  const fetchFn = params.fetchImpl ?? fetch;
  const targetEndpoint = new URL(check.url.pathname + check.url.search, check.url.origin);
  if (targetEndpoint.protocol !== "https:" && targetEndpoint.protocol !== "http:") {
    return { delivered: false, attempts: 0 };
  }
  const safeTargetUrl = targetEndpoint.href;

  const body = JSON.stringify(params.payload);
  const signature = signHmacSha256(params.webhookSecret, body);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetchFn(safeTargetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "BloumeID-Webhook/1.0",
          "X-BloumeID-Event": params.payload.event,
          "X-BloumeID-Signature": `sha256=${signature}`,
        },
        body,
        redirect: "manual",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return { delivered: true, attempts: attempt, statusCode: res.status };
      }
    } catch {
      // Retry with exponential backoff
    }

    if (attempt < maxRetries) {
      const waitMs = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  return { delivered: false, attempts: maxRetries };
}

export function enqueueWebhookAsync(params: {
  webhookUrl: string;
  webhookSecret: string;
  payload: WebhookEventPayload;
}): void {
  setTimeout(() => {
    void dispatchSignedWebhook(params);
  }, 0);
}

