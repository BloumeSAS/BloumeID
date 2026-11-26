import { NextResponse, type NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "bloumeid_admin_session";

function getConfiguredMasterKey(): string {
  return process.env.ADMIN_MASTER_KEY ?? "bloumeid_dev_master_key_2026";
}

async function hmacSha256WebCrypto(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const bytes = new Uint8Array(sigBuf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, "0");
  }
  return hex;
}

function constantTimeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifySessionTokenEdge(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [role, expiresStr, sig] = parts;
  if (role !== "admin" || !expiresStr || !sig) return false;

  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const expected = await hmacSha256WebCrypto(
    getConfiguredMasterKey().trim(),
    `${role}.${expiresStr}`
  );
  return constantTimeHexEqual(expected, sig);
}

const PROTECTED_PATHS = [
  "/dashboard",
  "/events",
  "/rules",
  "/sites",
  "/visitors",
  "/settings",
  "/get-started",
  "/webhooks",
  "/releases",
  "/smart-signals",
  "/health",
  "/security",
  "/usage",
  "/migrate",
];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/admin/") &&
    pathname !== "/api/admin/auth/login" &&
    pathname !== "/api/admin/auth/logout"
  ) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const validCookie = await verifySessionTokenEdge(token);
    const headerKey = request.headers.get("x-admin-master-key")?.trim();
    const validHeader =
      Boolean(headerKey) && constantTimeHexEqual(headerKey ?? "", getConfiguredMasterKey().trim());

    if (!validCookie && !validHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isProtectedPage = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!isProtectedPage) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const valid = await verifySessionTokenEdge(token);

  if (!valid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/events/:path*",
    "/rules/:path*",
    "/sites/:path*",
    "/visitors/:path*",
    "/settings/:path*",
    "/get-started/:path*",
    "/webhooks/:path*",
    "/releases/:path*",
    "/smart-signals/:path*",
    "/health/:path*",
    "/security/:path*",
    "/usage/:path*",
    "/migrate/:path*",
  ],
};

