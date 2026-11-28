import { cookies } from "next/headers";
import { constantTimeEqual, signHmacSha256 } from "@/lib/engine/snowflake";
export { sanitizeInternalRedirect } from "@/lib/security";

export const ADMIN_SESSION_COOKIE = "bloumeid_admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getConfiguredMasterKey(): string {
  return (process.env.ADMIN_MASTER_KEY ?? "bloumeid_dev_master_key_2026").trim();
}

export function verifyMasterKey(candidateKey: string): boolean {
  const masterKey = getConfiguredMasterKey();
  if (!candidateKey || !masterKey) return false;
  return constantTimeEqual(candidateKey.trim(), masterKey);
}

export function createSignedAdminSessionToken(nowMs = Date.now()): string {
  const expiresAt = nowMs + SESSION_TTL_MS;
  const payload = `admin.${expiresAt}`;
  const sig = signHmacSha256(getConfiguredMasterKey(), payload);
  return `${payload}.${sig}`;
}

export function verifySignedAdminSessionToken(token: string | undefined | null, nowMs = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [role, expiresStr, signature] = parts;
  if (role !== "admin" || !expiresStr || !signature) return false;

  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || expiresAt < nowMs) {
    return false;
  }

  const payload = `${role}.${expiresStr}`;
  const expectedSig = signHmacSha256(getConfiguredMasterKey(), payload);
  return constantTimeEqual(expectedSig, signature);
}

export async function isAdminAuthenticatedFromCookies(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  return verifySignedAdminSessionToken(token);
}

export function isAdminAuthenticatedFromRequest(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = match ? decodeURIComponent(match.slice(ADMIN_SESSION_COOKIE.length + 1)) : null;
  if (verifySignedAdminSessionToken(token)) return true;

  // Also support X-Admin-Master-Key header for automated CLI / API admin operations
  const headerKey = request.headers.get("x-admin-master-key");
  if (headerKey && verifyMasterKey(headerKey)) return true;

  return false;
}

