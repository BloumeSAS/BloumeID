import { classifyAsnOrganization, globalThreatTrie, type ThreatCategory } from "./cidr-trie";
import { lookupGeoIp } from "./geoip";
import { generateSnowflakeId } from "./snowflake";
import { prisma } from "@/lib/prisma";

export interface FeedDefinition {
  feedName: string;
  url: string;
  category: ThreatCategory;
  fallbackCidrs: string[];
}

export const THREAT_FEEDS: readonly FeedDefinition[] = [
  {
    feedName: "x4bnet_vpn_ipv4",
    url: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt",
    category: "vpn",
    fallbackCidrs: ["185.159.156.0/24", "193.138.218.0/24", "45.83.220.0/22"],
  },
  {
    feedName: "x4bnet_datacenter_ipv4",
    url: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv4.txt",
    category: "datacenter",
    fallbackCidrs: ["51.38.0.0/16", "138.68.0.0/16", "95.216.0.0/16"],
  },
  {
    feedName: "tor_bulk_exit_list",
    url: "https://check.torproject.org/torbulkexitlist",
    category: "tor",
    fallbackCidrs: ["185.220.101.0/24", "185.220.100.0/24", "199.249.230.0/24"],
  },
];

let seededDefaults = false;

export function ensureDefaultTrieSeeded(): void {
  if (seededDefaults && globalThreatTrie.size() > 0) return;
  for (const feed of THREAT_FEEDS) {
    for (const cidr of feed.fallbackCidrs) {
      globalThreatTrie.insert(cidr, feed.category);
    }
  }
  seededDefaults = true;
}

export async function syncAllThreatFeeds(fetchImpl: typeof fetch = fetch): Promise<{
  totalCidrs: number;
  feeds: Array<{ feedName: string; recordCount: number; status: string }>;
}> {
  globalThreatTrie.clear();
  const results: Array<{ feedName: string; recordCount: number; status: string }> = [];

  for (const feed of THREAT_FEEDS) {
    let count = 0;
    let status = "ok";
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetchImpl(feed.url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (globalThreatTrie.insert(line, feed.category)) {
          count += 1;
        }
      }
    } catch (err) {
      status = "fallback";
      errorMessage = err instanceof Error ? err.message : "Network error";
      for (const cidr of feed.fallbackCidrs) {
        if (globalThreatTrie.insert(cidr, feed.category)) {
          count += 1;
        }
      }
    }

    results.push({ feedName: feed.feedName, recordCount: count, status });

    try {
      await prisma.threatFeedStatus.upsert({
        where: { feedName: feed.feedName },
        update: {
          recordCount: count,
          lastSyncedAt: new Date(),
          status,
          errorMessage,
        },
        create: {
          publicId: generateSnowflakeId("feed"),
          feedName: feed.feedName,
          recordCount: count,
          lastSyncedAt: new Date(),
          status,
          errorMessage,
        },
      });
    } catch {
      // Allow sync to succeed in memory even if database is unreachable during unit tests
    }
  }

  seededDefaults = true;
  return {
    totalCidrs: globalThreatTrie.size(),
    feeds: results,
  };
}

export async function evaluateIpThreatIntel(ipAddress: string, providedAsnOrg?: string | null): Promise<{
  isVpn: boolean;
  isDatacenter: boolean;
  isTor: boolean;
  isProxy: boolean;
  asnNumber: number | null;
  asnOrg: string | null;
  country: string | null;
  city: string | null;
}> {
  ensureDefaultTrieSeeded();
  const categories = globalThreatTrie.lookup(ipAddress);
  const geo = await lookupGeoIp(ipAddress);
  const asnOrg = providedAsnOrg ?? geo.asnOrg;
  const asnClass = classifyAsnOrganization(asnOrg);

  const isTor = categories.has("tor");
  const isVpn = categories.has("vpn") || asnClass.isVpn;
  const isDatacenter = categories.has("datacenter") || asnClass.isDatacenter;
  const isProxy = categories.has("proxy");

  return {
    isVpn,
    isDatacenter,
    isTor,
    isProxy,
    asnNumber: geo.asnNumber,
    asnOrg,
    country: geo.country,
    city: geo.city,
  };
}
