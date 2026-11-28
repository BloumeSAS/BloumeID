import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { NO_STORE_HEADERS } from "@/lib/security";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json(
    { authenticated: false },
    { status: 200, headers: NO_STORE_HEADERS }
  );
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}

