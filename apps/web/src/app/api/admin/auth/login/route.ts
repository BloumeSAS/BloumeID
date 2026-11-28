import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  createSignedAdminSessionToken,
  verifyMasterKey,
} from "@/lib/auth";
import { NO_STORE_HEADERS, parseSafeJsonBody } from "@/lib/security";
import { extractRealClientIp } from "@/lib/engine/network";
import { checkSlidingWindowRateLimit } from "@/lib/engine/redis";

const LoginSchema = z.object({
  masterKey: z.string().min(1).max(512),
});

export async function POST(request: Request): Promise<NextResponse> {
  const ip = extractRealClientIp(request.headers);

  // Sliding-window rate limit on login attempts (10 attempts per 60 seconds per IP)
  const rl = await checkSlidingWindowRateLimit({
    key: `admin_login:${ip}`,
    windowSeconds: 60,
    maxRequests: 10,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many login attempts" },
      { status: 429, headers: NO_STORE_HEADERS }
    );
  }

  const bodyResult = await parseSafeJsonBody(request, 8 * 1024);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: bodyResult.status, headers: NO_STORE_HEADERS }
    );
  }

  const parsed = LoginSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const isValid = verifyMasterKey(parsed.data.masterKey);
  if (!isValid) {
    return NextResponse.json(
      { error: "invalid_key" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const sessionToken = createSignedAdminSessionToken();
  const response = NextResponse.json(
    { authenticated: true },
    { status: 200, headers: NO_STORE_HEADERS }
  );

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60,
  });

  return response;
}

