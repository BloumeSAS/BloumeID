import {
  CidrRadixTrie,
  classifyAsnOrganization,
  globalThreatTrie,
  lookupBadAsn,
  registerBadAsn,
  replaceBadAsns,
  type ThreatCategory,
} from "./cidr-trie";
import { lookupGeoIp } from "./geoip";
import { generateSnowflakeId } from "./snowflake";
import { prisma } from "@/lib/prisma";

export type ThreatFeedFormat =
  | "cidr_text"
  | "onionoo_ipv6_json"
  | "aws_ip_json"
  | "gcp_ip_json"
  | "bad_asn_csv";

export interface FeedDefinition {
  feedName: string;
  url: string;
  category: ThreatCategory;
  format?: ThreatFeedFormat;
  fallbackCidrs: string[];
  fallbackAsns?: Array<{ asn: number; entity: string }>;
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
    feedName: "x4bnet_vpn_ipv6",
    url: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv6.txt",
    category: "vpn",
    format: "cidr_text",
    fallbackCidrs: ["2001:550:1d05::/48", "2001:ac8::/32"],
  },
  {
    feedName: "x4bnet_datacenter_ipv4",
    url: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv4.txt",
    category: "datacenter",
    format: "cidr_text",
    fallbackCidrs: ["51.38.0.0/16", "138.68.0.0/16", "95.216.0.0/16"],
  },
  {
    feedName: "x4bnet_datacenter_ipv6",
    url: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv6.txt",
    category: "datacenter",
    format: "cidr_text",
    fallbackCidrs: ["2001:4f8:2::/48", "2001:470::/32"],
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
  {
    feedName: "tor_secops_exit_mirror",
    url: "https://raw.githubusercontent.com/SecOps-Institute/Tor-IP-Addresses/master/tor-exit-nodes.lst",
    category: "tor",
    format: "cidr_text",
    fallbackCidrs: ["185.220.102.0/24", "185.220.103.0/24"],
  },
  {
    feedName: "aws_datacenter_ip_ranges",
    url: "https://ip-ranges.amazonaws.com/ip-ranges.json",
    category: "datacenter",
    format: "aws_ip_json",
    fallbackCidrs: ["3.5.140.0/22", "52.94.76.0/22"],
  },
  {
    feedName: "gcp_datacenter_ip_ranges",
    url: "https://www.gstatic.com/ipranges/cloud.json",
    category: "datacenter",
    format: "gcp_ip_json",
    fallbackCidrs: ["34.64.0.0/10", "35.184.0.0/13"],
  },
  {
    feedName: "firehol_level1_netset",
    url: "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset",
    category: "proxy",
    format: "cidr_text",
    fallbackCidrs: ["45.142.212.0/22"],
  },
  {
    feedName: "firehol_webclient_netset",
    url: "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_webclient.netset",
    category: "proxy",
    format: "cidr_text",
    fallbackCidrs: ["194.26.135.0/24"],
  },
  {
    feedName: "ipsum_threat_proxies",
    url: "https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt",
    category: "proxy",
    format: "cidr_text",
    fallbackCidrs: ["45.155.205.0/24"],
  },
  {
    feedName: "spamhaus_drop_ipv4",
    url: "https://www.spamhaus.org/drop/drop.txt",
    category: "datacenter",
    format: "cidr_text",
    fallbackCidrs: ["1.10.16.0/20"],
  },
  {
    feedName: "spamhaus_drop_ipv6",
    url: "https://www.spamhaus.org/drop/dropv6.txt",
    category: "datacenter",
    format: "cidr_text",
    fallbackCidrs: ["2a06:a005::/32"],
  },
  {
    feedName: "brianhama_bad_asn_list",
    url: "https://raw.githubusercontent.com/brianhama/bad-asn-list/master/bad-asn-list.csv",
    category: "datacenter",
    format: "bad_asn_csv",
    fallbackCidrs: [],
    fallbackAsns: [
      { asn: 24940, entity: "Hetzner Online GmbH" },
      { asn: 16276, entity: "OVH SAS" },
      { asn: 14061, entity: "DigitalOcean, LLC" },
      { asn: 9009, entity: "M247 Europe SRL" },
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
    if (feed.fallbackAsns) {
      for (const item of feed.fallbackAsns) {
        registerBadAsn(item.asn, item.entity);
      }
    }
  }
  seededDefaults = true;
}

function extractCidrToken(rawLine: string): string {
  const withoutComment = rawLine.split(/[;#]/)[0]?.trim() ?? "";
  if (!withoutComment) return "";
  return withoutComment.split(/\s+/)[0]?.trim() ?? "";
}

export async function syncAllThreatFeeds(fetchImpl: typeof fetch = fetch): Promise<{
  totalCidrs: number;
  feeds: Array<{ feedName: string; recordCount: number; status: string }>;
}> {
  const stagingTrie = new CidrRadixTrie();
  const stagingAsns = new Map<number, string>();
  const registerStagingAsn = (asnNumber: number, entityName: string): boolean => {
    if (!Number.isInteger(asnNumber) || asnNumber <= 0) return false;
    stagingAsns.set(asnNumber, entityName.trim() || `AS${asnNumber}`);
    return true;
  };

  const results = await Promise.all(
    THREAT_FEEDS.map(async (feed) => {
      let count = 0;
      let status = "ok";
      let errorMessage: string | null = null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      try {
        const res = await fetchImpl(feed.url, {
          signal: controller.signal,
          headers: { "User-Agent": "BloumeID-ThreatIntel/1.0" },
        });

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
              const normalized = rawAddr.startsWith("[")
                ? rawAddr.slice(1, rawAddr.indexOf("]") !== -1 ? rawAddr.indexOf("]") : undefined)
                : rawAddr;
              if (stagingTrie.insert(normalized, feed.category)) {
                count += 1;
              }
            }
          }
          if (count === 0) {
            throw new Error("Empty feed response");
          }
          for (const cidr of feed.fallbackCidrs) {
            if (stagingTrie.insert(cidr, feed.category)) {
              count += 1;
            }
          }
        } else if (feed.format === "aws_ip_json") {
          const json = (await res.json()) as {
            prefixes?: Array<{ ip_prefix?: string }>;
            ipv6_prefixes?: Array<{ ipv6_prefix?: string }>;
          };
          for (const item of json.prefixes ?? []) {
            if (item.ip_prefix && stagingTrie.insert(item.ip_prefix, feed.category)) {
              count += 1;
            }
          }
          for (const item of json.ipv6_prefixes ?? []) {
            if (item.ipv6_prefix && stagingTrie.insert(item.ipv6_prefix, feed.category)) {
              count += 1;
            }
          }
        } else if (feed.format === "gcp_ip_json") {
          const json = (await res.json()) as {
            prefixes?: Array<{ ipv4Prefix?: string; ipv6Prefix?: string }>;
          };
          for (const item of json.prefixes ?? []) {
            const cidr = item.ipv4Prefix ?? item.ipv6Prefix;
            if (cidr && stagingTrie.insert(cidr, feed.category)) {
              count += 1;
            }
          }
        } else if (feed.format === "bad_asn_csv") {
          const text = await res.text();
          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.toUpperCase().startsWith("ASN")) continue;
            const commaIdx = trimmed.indexOf(",");
            if (commaIdx === -1) continue;
            const asnNum = Number(trimmed.slice(0, commaIdx).replace(/"/g, "").trim());
            const entity = trimmed.slice(commaIdx + 1).replace(/^"|"$/g, "").trim();
            if (registerStagingAsn(asnNum, entity)) {
              count += 1;
            }
          }
        } else {
          const text = await res.text();
          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            const token = extractCidrToken(line);
            if (token && stagingTrie.insert(token, feed.category)) {
              count += 1;
            }
          }
        }
        if (count === 0) {
          throw new Error("Empty feed response");
        }
      } catch (err) {
        status = "fallback";
        errorMessage = err instanceof Error ? err.message : "Network error";
        for (const cidr of feed.fallbackCidrs) {
          if (stagingTrie.insert(cidr, feed.category)) {
            count += 1;
          }
        }
        if (feed.fallbackAsns) {
          for (const item of feed.fallbackAsns) {
            if (registerStagingAsn(item.asn, item.entity)) {
              count += 1;
            }
          }
        }
      } finally {
        clearTimeout(timer);
      }

      if (process.env.DATABASE_URL?.trim()) {
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

      return { feedName: feed.feedName, recordCount: count, status };
    })
  );

  // Swap atomically after all feeds are parsed so live requests never hit an empty trie
  globalThreatTrie.swapFrom(stagingTrie);
  replaceBadAsns(stagingAsns);
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
  const badAsnEntity = lookupBadAsn(geo.asnNumber);
  const asnOrg = providedAsnOrg ?? geo.asnOrg ?? badAsnEntity;
  const asnClass = classifyAsnOrganization(asnOrg);

  const isTor = categories.has("tor");
  const isVpn = categories.has("vpn") || asnClass.isVpn;
  const isDatacenter =
    categories.has("datacenter") || asnClass.isDatacenter || Boolean(badAsnEntity);
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
