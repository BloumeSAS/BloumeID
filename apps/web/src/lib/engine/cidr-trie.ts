import { ipToUint32 } from "./network";

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
 * In-memory Patricia / Binary Radix CIDR Trie for O(32) IPv4 threat intelligence lookups.
 */
export class CidrRadixTrie {
  private root: TrieNode = createNode();
  private cidrCount = 0;

  public clear(): void {
    this.root = createNode();
    this.cidrCount = 0;
  }

  public size(): number {
    return this.cidrCount;
  }

  public insert(cidrOrIp: string, category: ThreatCategory): boolean {
    const trimmed = cidrOrIp.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) {
      return false;
    }

    let ipPart = trimmed;
    let prefixLen = 32;

    if (trimmed.includes("/")) {
      const parts = trimmed.split("/");
      ipPart = parts[0]?.trim() ?? "";
      prefixLen = Number(parts[1]);
    }

    if (!Number.isInteger(prefixLen) || prefixLen < 0 || prefixLen > 32) {
      return false;
    }

    const ipNum = ipToUint32(ipPart);
    if (ipNum === null) {
      return false;
    }

    let node = this.root;
    for (let i = 31; i >= 32 - prefixLen; i--) {
      const bit = (ipNum >>> i) & 1;
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

  public lookup(ip: string): Set<ThreatCategory> {
    const matched = new Set<ThreatCategory>();
    const ipNum = ipToUint32(ip);
    if (ipNum === null) {
      return matched;
    }

    let node: TrieNode | null = this.root;
    if (node.categories) {
      for (const c of node.categories) matched.add(c);
    }

    for (let i = 31; i >= 0 && node !== null; i--) {
      const bit = (ipNum >>> i) & 1;
      node = bit === 0 ? node.left : node.right;
      if (node?.categories) {
        for (const c of node.categories) matched.add(c);
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

