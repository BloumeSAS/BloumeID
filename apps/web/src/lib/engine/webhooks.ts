import dns from "node:dns/promises";
import { isIP } from "node:net";
import { ipv6ToBigInt } from "./network";
import { signHmacSha256 } from "./snowflake";

function uint32ToIpv4String(ipNum: number): string {
  return `${(ipNum >>> 24) & 0xff}.${(ipNum >>> 16) & 0xff}.${(ipNum >>> 8) & 0xff}.${ipNum & 0xff}`;
}

function isPrivateOrReservedIp(host: string): boolean {
  const clean = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    clean === "localhost" ||
    clean.endsWith(".localhost") ||
    clean.endsWith(".local") ||
    clean.endsWith(".internal")
  ) {
    return true;
  }
  const ipVersion = isIP(clean);
  if (ipVersion === 4) {
    const parts = clean.split(".").map(Number);
    const [a = 0, b = 0, c = 0] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a >= 224) return true;
    return false;
  }
  if (ipVersion === 6) {
    const v6 = ipv6ToBigInt(clean);
    if (v6 === null) return true;
    if (v6 === 0n || v6 === 1n) return true; // :: and ::1
    if ((v6 >> 121n) === 0x7en) return true; // fc00::/7 ULA
    if ((v6 >> 118n) === 0x3fan) return true; // fe80::/10 link-local
    if ((v6 >> 120n) === 0xffn) return true; // ff00::/8 multicast
    if ((v6 >> 96n) === 0x20010db8n) return true; // 2001:db8::/32 documentation

    // IPv4-mapped (::ffff:0:0/96), IPv4-compatible (::/96), and NAT64 (64:ff9b::/96)
    const upper96 = v6 >> 32n;
    const isEmbeddedV4 =
      upper96 === 0xffffn ||
      upper96 === 0n ||
      ((v6 >> 96n) === 0x0064ff9bn && ((v6 >> 32n) & 0xffffffffffffffffn) === 0n);
    if (isEmbeddedV4) {
      return isPrivateOrReservedIp(uint32ToIpv4String(Number(v6 & 0xffffffffn) >>> 0));
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
      if (resolved.length === 0 || resolved.some((entry) => isPrivateOrReservedIp(entry.address))) {
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
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

      if (res.ok) {
        return { delivered: true, attempts: attempt, statusCode: res.status };
      }
      if (
        (res.status >= 300 && res.status < 500 && res.status !== 408 && res.status !== 429)
      ) {
        return { delivered: false, attempts: attempt, statusCode: res.status };
      }
    } catch {
      // Retry with exponential backoff
    } finally {
      clearTimeout(timer);
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

