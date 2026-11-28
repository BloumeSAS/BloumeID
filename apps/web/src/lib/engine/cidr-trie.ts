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
      ipPart = parts[0]?.trim() ?? "";
      explicitPrefix = Number(parts[1]);
    }

    const ipNumV4 = ipToUint32(ipPart);
    if (ipNumV4 !== null) {
      const prefixLen = explicitPrefix ?? 32;
      if (!Number.isInteger(prefixLen) || prefixLen < 0 || prefixLen > 32) {
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

    const ipNumV6 = ipv6ToBigInt(ipPart);
    if (ipNumV6 !== null) {
      const prefixLen = explicitPrefix ?? 128;
      if (!Number.isInteger(prefixLen) || prefixLen < 0 || prefixLen > 128) {
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
    const ipNumV4 = ipToUint32(ip);
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

    const ipNumV6 = ipv6ToBigInt(ip);
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
  "linode",
  "akamai connected cloud",
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
  "Equinix",
  "cogent",
  "hurricane electric",
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

