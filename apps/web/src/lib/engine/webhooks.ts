import { signHmacSha256 } from "./snowflake";

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
  const maxRetries = params.maxRetries ?? 3;
  const baseDelayMs = params.baseDelayMs ?? 250;
  const fetchFn = params.fetchImpl ?? fetch;

  const body = JSON.stringify(params.payload);
  const signature = signHmacSha256(params.webhookSecret, body);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetchFn(params.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "BloumeID-Webhook/1.0",
          "X-BloumeID-Event": params.payload.event,
          "X-BloumeID-Signature": `sha256=${signature}`,
        },
        body,
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

