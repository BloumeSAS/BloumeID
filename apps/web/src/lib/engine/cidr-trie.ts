import { ipToUint32, ipv6ToBigInt } from "./network";

export type ThreatCategory = "vpn" | "datacenter" | "tor" | "proxy";

interface TrieNode {
  left: TrieNode | null;
  right: TrieNode | null;
  categories: Set<ThreatCategory> | null;
}

function createNode(): TrieNode {
  return { left: null, right: null, categories: null };
}

/**
 * In-memory Patricia / Binary Radix CIDR Trie for O(32) IPv4 and O(128) IPv6 threat intelligence lookups.
 */
export class CidrRadixTrie {
  private rootV4: TrieNode = createNode();
  private rootV6: TrieNode = createNode();
  private cidrCount = 0;

  public clear(): void {
    this.rootV4 = createNode();
    this.rootV6 = createNode();
    this.cidrCount = 0;
  }

  public size(): number {
    return this.cidrCount;
  }

  public swapFrom(source: CidrRadixTrie): void {
    this.rootV4 = source.rootV4;
    this.rootV6 = source.rootV6;
    this.cidrCount = source.cidrCount;
  }

  private resolveAddressSpace(ip: string): { v4: number | null; v6: bigint | null } {
    const v4Direct = ipToUint32(ip);
    if (v4Direct !== null) {
      return { v4: v4Direct, v6: null };
    }
    const v6 = ipv6ToBigInt(ip);
    if (v6 !== null) {
      if (v6 >> 32n === 0xffffn) {
        return { v4: Number(v6 & 0xffffffffn) >>> 0, v6: null };
      }
      return { v4: null, v6 };
    }
    return { v4: null, v6: null };
  }

  public insert(cidrOrIp: string, category: ThreatCategory): boolean {
    let trimmed = cidrOrIp.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) {
      return false;
    }
    if (trimmed.startsWith("[")) {
      const closing = trimmed.indexOf("]");
      if (closing !== -1) {
        trimmed = trimmed.slice(1, closing);
      }
    }

    let ipPart = trimmed;
    let explicitPrefix: number | null = null;

    if (trimmed.includes("/")) {
      const parts = trimmed.split("/");
      if (parts.length !== 2) return false;
      ipPart = parts[0]?.trim() ?? "";
      const rawPrefix = parts[1]?.trim() ?? "";
      if (!rawPrefix || !/^\d+$/.test(rawPrefix)) {
        return false;
      }
      explicitPrefix = Number(rawPrefix);
    }

    const { v4: ipNumV4, v6: ipNumV6 } = this.resolveAddressSpace(ipPart);
    if (ipNumV4 !== null) {
      const prefixLen = explicitPrefix ?? 32;
      if (!Number.isInteger(prefixLen) || prefixLen < 1 || prefixLen > 32) {
        return false;
      }

      let node = this.rootV4;
      for (let i = 31; i >= 32 - prefixLen; i--) {
        const bit = (ipNumV4 >>> i) & 1;
        if (bit === 0) {
          if (!node.left) node.left = createNode();
          node = node.left;
        } else {
          if (!node.right) node.right = createNode();
          node = node.right;
        }
      }

      if (!node.categories) {
        node.categories = new Set<ThreatCategory>();
        this.cidrCount += 1;
      }
      node.categories.add(category);
      return true;
    }

    if (ipNumV6 !== null) {
      const prefixLen = explicitPrefix ?? 128;
      if (!Number.isInteger(prefixLen) || prefixLen < 1 || prefixLen > 128) {
        return false;
      }

      let node = this.rootV6;
      for (let i = 127; i >= 128 - prefixLen; i--) {
        const bit = Number((ipNumV6 >> BigInt(i)) & 1n);
        if (bit === 0) {
          if (!node.left) node.left = createNode();
          node = node.left;
        } else {
          if (!node.right) node.right = createNode();
          node = node.right;
        }
      }

      if (!node.categories) {
        node.categories = new Set<ThreatCategory>();
        this.cidrCount += 1;
      }
      node.categories.add(category);
      return true;
    }

    return false;
  }

  public lookup(ip: string): Set<ThreatCategory> {
    const matched = new Set<ThreatCategory>();
    const { v4: ipNumV4, v6: ipNumV6 } = this.resolveAddressSpace(ip);
    if (ipNumV4 !== null) {
      let node: TrieNode | null = this.rootV4;
      if (node.categories) {
        for (const c of node.categories) matched.add(c);
      }

      for (let i = 31; i >= 0 && node !== null; i--) {
        const bit = (ipNumV4 >>> i) & 1;
        node = bit === 0 ? node.left : node.right;
        if (node?.categories) {
          for (const c of node.categories) matched.add(c);
        }
      }
      return matched;
    }

    if (ipNumV6 !== null) {
      let node: TrieNode | null = this.rootV6;
      if (node.categories) {
        for (const c of node.categories) matched.add(c);
      }

      for (let i = 127; i >= 0 && node !== null; i--) {
        const bit = Number((ipNumV6 >> BigInt(i)) & 1n);
        node = bit === 0 ? node.left : node.right;
        if (node?.categories) {
          for (const c of node.categories) matched.add(c);
        }
      }
    }

    return matched;
  }
}

export const DATACENTER_ASN_KEYWORDS: readonly string[] = [
  "ovh",
  "hetzner",
  "digitalocean",
  "amazon",
  "aws",
  "google cloud",
  "gcp",
  "microsoft",
  "azure",
  "scaleway",
  "online s.a.s",
  "iliad-entreprises",
  "vultr",
  "choopa",
  "constant",
  "linode",
  "akamai connected cloud",
  "akamai",
  "cloudflare",
  "fastly",
  "m247",
  "leaseweb",
  "contabo",
  "datacamp",
  "cdn77",
  "tzulo",
  "hostinger",
  "ionos",
  "upcloud",
  "kamatera",
  "equinix",
  "cogent",
  "hurricane electric",
  "alibaba",
  "tencent",
  "oracle",
  "rackspace",
  "frantech",
  "buyvm",
  "netcup",
  "cherry servers",
  "stark industries",
  "pq hosting",
  "melbikomas",
  "shockhosting",
  "datapacket",
  "worldstream",
  "hostkey",
  "time4vps",
  "aeza",
  "voxility",
];

export const VPN_ASN_KEYWORDS: readonly string[] = [
  "mullvad",
  "nordvpn",
  "tefincom",
  "proton",
  "expressvpn",
  "surfshark",
  "private internet access",
  "cyberghost",
  "windscribe",
  "ipvanish",
  "vyprvpn",
  "ivpn",
  "mozillavpn",
  "mozilla vpn",
  "torguard",
  "purevpn",
  "airvpn",
  "ipredator",
  "perfect privacy",
  "privatevpn",
  "astrill",
  "hide.me",
];

export function classifyAsnOrganization(asnOrg: string | null | undefined): {
  isDatacenter: boolean;
  isVpn: boolean;
} {
  if (!asnOrg) {
    return { isDatacenter: false, isVpn: false };
  }
  const normalized = asnOrg.toLowerCase();
  const isDatacenter = DATACENTER_ASN_KEYWORDS.some((kw) =>
    normalized.includes(kw.toLowerCase())
  );
  const isVpn = VPN_ASN_KEYWORDS.some((kw) => normalized.includes(kw.toLowerCase()));
  return { isDatacenter, isVpn };
}

export const globalThreatTrie = new CidrRadixTrie();

const badAsnRegistry = new Map<number, string>();

export function clearBadAsns(): void {
  badAsnRegistry.clear();
}

export function replaceBadAsns(entries: Map<number, string>): void {
  badAsnRegistry.clear();
  for (const [asn, entity] of entries) {
    badAsnRegistry.set(asn, entity);
  }
}

export function registerBadAsn(asnNumber: number, entityName: string): boolean {
  if (!Number.isInteger(asnNumber) || asnNumber <= 0) return false;
  badAsnRegistry.set(asnNumber, entityName.trim() || `AS${asnNumber}`);
  return true;
}

export function lookupBadAsn(asnNumber: number | null | undefined): string | null {
  if (asnNumber === null || asnNumber === undefined) return null;
  return badAsnRegistry.get(asnNumber) ?? null;
}

export function badAsnCount(): number {
  return badAsnRegistry.size;
}

