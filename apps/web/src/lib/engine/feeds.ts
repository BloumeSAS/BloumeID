import { classifyAsnOrganization, globalThreatTrie, type ThreatCategory } from "./cidr-trie";
import { lookupGeoIp } from "./geoip";
import { generateSnowflakeId } from "./snowflake";
import { prisma } from "@/lib/prisma";

export interface FeedDefinition {
  feedName: string;
  url: string;
  category: ThreatCategory;
  format?: "cidr_text" | "onionoo_ipv6_json";
  fallbackCidrs: string[];
}

export const THREAT_FEEDS: readonly FeedDefinition[] = [
  {
    feedName: "x4bnet_vpn_ipv4",
    url: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt",
    category: "vpn",
    format: "cidr_text",
    fallbackCidrs: ["185.159.156.0/24", "193.138.218.0/24", "45.83.220.0/22"],
  },
  {
    feedName: "x4bnet_datacenter_ipv4",
    url: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv4.txt",
    category: "datacenter",
    format: "cidr_text",
    fallbackCidrs: ["51.38.0.0/16", "138.68.0.0/16", "95.216.0.0/16"],
  },
  {
    feedName: "tor_bulk_exit_list",
    url: "https://check.torproject.org/torbulkexitlist",
    category: "tor",
    format: "cidr_text",
    fallbackCidrs: ["185.220.101.0/24", "185.220.100.0/24", "199.249.230.0/24"],
  },
  {
    feedName: "tor_onionoo_relays_ipv6",
    url: "https://onionoo.torproject.org/summary?running=true&flag=Exit",
    category: "tor",
    format: "onionoo_ipv6_json",
    fallbackCidrs: [
      "2a0b:f4c2::/48",
      "2001:67c:289c::/48",
      "2606:2800:11f::/48",
      "2a03:e600:100::/48",
    ],
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
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetchImpl(feed.url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (feed.format === "onionoo_ipv6_json") {
        const json = (await res.json()) as {
          relays?: Array<{ a?: string[]; r?: boolean }>;
        };
        const relays = Array.isArray(json.relays) ? json.relays : [];
        for (const relay of relays) {
          if (relay.r === false || !Array.isArray(relay.a)) continue;
          for (const rawAddr of relay.a) {
            if (!rawAddr.includes(":")) continue;
            // Strip [ipv6]:port -> ipv6
            const normalized = rawAddr.startsWith("[")
              ? rawAddr.slice(1, rawAddr.indexOf("]") !== -1 ? rawAddr.indexOf("]") : undefined)
              : rawAddr;
            if (globalThreatTrie.insert(normalized, feed.category)) {
              count += 1;
            }
          }
        }
        // Always include curated IPv6 fallback exit blocks in addition to live relays
        for (const cidr of feed.fallbackCidrs) {
          if (globalThreatTrie.insert(cidr, feed.category)) {
            count += 1;
          }
        }
      } else {
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (globalThreatTrie.insert(line, feed.category)) {
            count += 1;
          }
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

export async function evaluateIpThreatIntel(
  ipAddress: string,
  providedAsnOrg?: string | null
): Promise<{
  isVpn: boolean;
  isDatacenter: boolean;
  isTor: boolean;
  isProxy: boolean;
  asnNumber: number | null;
  asnOrg: string | null;
  country: string | null;
  countryName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
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
    countryName: geo.countryName,
    city: geo.city,
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}
