import { NextResponse } from "next/server";
import { globalThreatTrie } from "@/lib/engine/cidr-trie";
import { ensureDefaultTrieSeeded } from "@/lib/engine/feeds";
import { getGeoIpStatus } from "@/lib/engine/geoip";

export async function GET(): Promise<NextResponse> {
  ensureDefaultTrieSeeded();
  const geoip = getGeoIpStatus();

  return NextResponse.json(
    {
      status: "ok",
      service: "bloumeid-web",
      version: "0.1.0",
      workerId: Number(process.env.WORKER_ID ?? 1),
      threatTrieCidrs: globalThreatTrie.size(),
      geoipLoaded: geoip.cityDbLoaded || geoip.asnDbLoaded,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

