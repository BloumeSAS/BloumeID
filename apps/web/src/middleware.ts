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
  "/playground",
  "/settings",
];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

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
    "/dashboard/:path*",
    "/events/:path*",
    "/rules/:path*",
    "/sites/:path*",
    "/visitors/:path*",
    "/playground/:path*",
    "/settings/:path*",
  ],
};

