import { NextResponse } from "next/server";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { NO_STORE_HEADERS } from "@/lib/security";

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  const username = (process.env.ADMIN_USERNAME ?? "Jules").trim() || "Jules";
  return NextResponse.json({ username }, { status: 200, headers: NO_STORE_HEADERS });
}

