import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";

let cachedBundle: { content: string; etag: string } | null = null;

function loadUmdBundle(): { content: string; etag: string } {
  if (cachedBundle && process.env.NODE_ENV === "production") {
    return cachedBundle;
  }

  const candidatePaths = [
    path.join(process.cwd(), "public", "sdk", "v1", "bloumeid.js"),
    path.resolve(process.cwd(), "../../packages/bloumeid/dist/bloumeid.global.js"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ p, "utf8");
      const etag = `"${crypto.createHash("sha256").update(content).digest("hex").slice(0, 32)}"`;
      cachedBundle = { content, etag };
      return cachedBundle;
    }
  }

  const fallback = "/* BloumeID SDK UMD bundle not built yet */";
  const etag = `"${crypto.createHash("sha256").update(fallback).digest("hex").slice(0, 32)}"`;
  return { content: fallback, etag };
}

function matchesEtag(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  if (ifNoneMatch.trim() === "*") return true;
  return ifNoneMatch
    .split(",")
    .some((part) => part.trim().replace(/^W\//i, "") === etag);
}

export async function GET(request: Request): Promise<NextResponse> {
  const { content, etag } = loadUmdBundle();
  const ifNoneMatch = request.headers.get("if-none-match");

  if (matchesEtag(ifNoneMatch, etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      ETag: etag,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
