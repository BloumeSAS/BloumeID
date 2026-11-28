import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";
import { NO_STORE_HEADERS } from "@/lib/security";
import { badAsnCount, globalThreatTrie } from "@/lib/engine/cidr-trie";
import { ensureDefaultTrieSeeded } from "@/lib/engine/feeds";
import { getGeoIpStatus } from "@/lib/engine/geoip";

let cachedSdkBundleSizeKb: number | null = null;

function resolveSdkBundleSizeKb(): number {
  if (cachedSdkBundleSizeKb !== null && process.env.NODE_ENV === "production") {
    return cachedSdkBundleSizeKb;
  }
  const candidates = [
    path.join(process.cwd(), "public", "sdk", "v1", "bloumeid.js"),
    path.join(process.cwd(), "apps", "web", "public", "sdk", "v1", "bloumeid.js"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        const sizeKb = Math.round(fs.statSync(/*turbopackIgnore: true*/ p).size / 1024);
        cachedSdkBundleSizeKb = sizeKb;
        return sizeKb;
      }
    } catch {
      // Ignore stat error
    }
  }
  return 42;
}

export async function GET(): Promise<NextResponse> {
  ensureDefaultTrieSeeded();
  const geoip = getGeoIpStatus();
  const rawWorkerId = Number(process.env.WORKER_ID ?? 1);
  const workerId =
    Number.isFinite(rawWorkerId) && rawWorkerId >= 0
      ? Math.min(1023, Math.trunc(rawWorkerId))
      : 1;

  return NextResponse.json(
    {
      status: "ok",
      service: "bloumeid-web",
      version: APP_VERSION,
      workerId,
      threatTrieCidrs: globalThreatTrie.size(),
      badAsnCount: badAsnCount(),
      sdkBundleSizeKb: resolveSdkBundleSizeKb(),
      geoipLoaded: geoip.cityDbLoaded || geoip.asnDbLoaded,
      geoipMode: geoip.mode,
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}
