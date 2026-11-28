export const MAX_PUBLIC_JSON_BYTES = 64 * 1024;
export const MAX_JSON_DEPTH = 6;
export const MAX_TOP_LEVEL_KEYS = 64;

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Recursively detects prototype-pollution keys and excessive object nesting.
 */
export function isJsonPayloadSafe(
  value: unknown,
  depth = 0,
  maxDepth = MAX_JSON_DEPTH,
  maxTopKeys = MAX_TOP_LEVEL_KEYS
): boolean {
  if (depth > maxDepth) return false;
  if (value === null || typeof value !== "object") return true;
  if (Array.isArray(value)) {
    if (value.length > 256) return false;
    return value.every((item) => isJsonPayloadSafe(item, depth + 1, maxDepth, maxTopKeys));
  }
  const keys = Object.keys(value as Record<string, unknown>);
  if (depth === 0 && keys.length > maxTopKeys) return false;
  for (const key of keys) {
    if (DANGEROUS_KEYS.has(key)) return false;
    const child = (value as Record<string, unknown>)[key];
    if (!isJsonPayloadSafe(child, depth + 1, maxDepth, maxTopKeys)) {
      return false;
    }
  }
  return true;
}

/**
 * Parses a JSON HTTP request body safely, enforcing byte size limit and prototype-pollution guards.
 */
export async function parseSafeJsonBody(
  request: Request,
  maxBytes = MAX_PUBLIC_JSON_BYTES
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413; error: string }
> {
  const contentLen = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLen) && contentLen > maxBytes) {
    return { ok: false, status: 413, error: `Payload exceeds ${Math.round(maxBytes / 1024)} KB limit` };
  }

  let rawText = "";
  try {
    rawText = await request.text();
  } catch {
    return { ok: false, status: 400, error: "Unable to read request body" };
  }

  if (Buffer.byteLength(rawText, "utf8") > maxBytes) {
    return { ok: false, status: 413, error: `Payload exceeds ${Math.round(maxBytes / 1024)} KB limit` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON payload" };
  }

  if (!isJsonPayloadSafe(parsed)) {
    return { ok: false, status: 400, error: "Unsafe or malformed JSON structure" };
  }

  return { ok: true, data: parsed };
}

/**
 * Neutralizes spreadsheet formula injection prefixes and applies RFC-4180 CSV quoting.
 */
export function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const formulaSafe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replaceAll('"', '""')}"`;
  }
  return formulaSafe;
}

/**
 * Prevents Open Redirects by accepting only strict relative internal paths.
 */
export function sanitizeInternalRedirect(target?: string | null): string {
  if (!target) return "/dashboard";
  const trimmed = target.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/dashboard";
  }
  if (/^\/[a-zA-Z0-9\-_/]*$/.test(trimmed)) {
    return trimmed;
  }
  return "/dashboard";
}

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

/**
 * Extracts `bid_sec_` credentials from Authorization Bearer, X-BloumeID-Secret,
 * or Fingerprint.com-compatible headers/query parameters.
 */
export function extractServerApiSecretKey(
  request: Request,
  allowLegacyApiKeyParam = false
): string {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const headerKey =
    request.headers.get("x-bloumeid-secret") ??
    (allowLegacyApiKeyParam ? request.headers.get("auth-api-key") : null);
  if (headerKey) {
    return headerKey.trim();
  }
  if (allowLegacyApiKeyParam) {
    return (new URL(request.url).searchParams.get("api_key") ?? "").trim();
  }
  return "";
}
