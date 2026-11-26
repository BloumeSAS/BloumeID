export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
}

export function ipToUint32(ip: string): number | null {
  const trimmed = ip.trim();
  const ipv4Match = trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
  const parts = ipv4Match.split(".");
  if (parts.length !== 4) return null;

  let result = 0;
  for (let i = 0; i < 4; i++) {
    const octet = Number(parts[i]);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return null;
    }
    result = ((result << 8) | octet) >>> 0;
  }
  return result >>> 0;
}

export function extractIpSubnet(ip: string): string {
  const trimmed = ip.trim();
  const ipv4 = trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
  const v4Parts = ipv4.split(".");
  if (v4Parts.length === 4 && ipToUint32(ipv4) !== null) {
    return `${v4Parts[0]}.${v4Parts[1]}.${v4Parts[2]}.0/24`;
  }
  // IPv6 /48 prefix fallback
  const v6Parts = trimmed.split(":");
  if (v6Parts.length >= 3) {
    return `${v6Parts.slice(0, 3).join(":")}::/48`;
  }
  return `${trimmed}/32`;
}

export function extractRealClientIp(
  headers: Headers,
  trustedProxiesEnv = process.env.TRUSTED_PROXIES ?? "true"
): string {
  const trustProxy =
    trustedProxiesEnv === "true" ||
    trustedProxiesEnv === "1" ||
    trustedProxiesEnv === "*" ||
    trustedProxiesEnv.length > 0;

  if (trustProxy) {
    const cfIp = headers.get("cf-connecting-ip");
    if (cfIp && cfIp.trim().length > 0) {
      return cfIp.trim();
    }

    const realIp = headers.get("x-real-ip");
    if (realIp && realIp.trim().length > 0) {
      return realIp.trim();
    }

    const xff = headers.get("x-forwarded-for");
    if (xff && xff.trim().length > 0) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first;
    }
  }

  return "127.0.0.1";
}

export function isOriginAllowedForSite(originHeader: string | null, allowedDomains: string[]): boolean {
  if (allowedDomains.includes("*")) return true;
  if (!originHeader) {
    // Allow same-origin / non-browser requests only if localhost is permitted
    return allowedDomains.some((d) => d === "localhost" || d === "127.0.0.1");
  }

  let hostname = "";
  try {
    const url = new URL(originHeader);
    hostname = url.hostname.toLowerCase();
  } catch {
    hostname = originHeader.toLowerCase().replace(/^https?:\/\//, "").split("/")[0]?.split(":")[0] ?? "";
  }

  if (!hostname) return false;

  for (const rawPattern of allowedDomains) {
    const pattern = rawPattern.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]?.split(":")[0] ?? "";
    if (!pattern) continue;
    if (pattern === "*") return true;
    if (pattern === hostname) return true;
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(2);
      if (hostname === suffix || hostname.endsWith(`.${suffix}`)) {
        return true;
      }
    }
  }

  return false;
}

export function evaluateJa4Consistency(ja4Hash: string | null, userAgent: string): {
  inconsistent: boolean;
  reason?: string;
} {
  if (!ja4Hash || !ja4Hash.trim()) {
    return { inconsistent: false };
  }
  const ja4 = ja4Hash.trim().toLowerCase();
  const ua = userAgent || "";

  // Known automated HTTP client TLS signatures (curl, python-requests, Go net/http, Node TLS without ALPN h2)
  const claimsModernBrowser = /Chrome\/|Firefox\/|Safari\/|Edg\//i.test(ua);
  const lacksAlpnBrowserMark = ja4.includes("_00_") || ja4.startsWith("t12d0");
  const isPythonOrCurlHint = ja4.startsWith("t13d03") || ja4.includes("curl") || ja4.includes("python");

  if (claimsModernBrowser && (lacksAlpnBrowserMark || isPythonOrCurlHint)) {
    return {
      inconsistent: true,
      reason: `JA4 fingerprint (${ja4}) lacks browser ALPN/cipher profile claimed by User-Agent`,
    };
  }

  return { inconsistent: false };
}

export function evaluateClientHintsConsistency(
  headers: Headers,
  reportedPlatform?: string
): { inconsistent: boolean; reason?: string } {
  const secChPlatform = headers.get("sec-ch-ua-platform")?.replace(/"/g, "").trim();
  if (!secChPlatform || !reportedPlatform || reportedPlatform === "unknown" || reportedPlatform === "excluded") {
    return { inconsistent: false };
  }

  const chNorm = secChPlatform.toLowerCase();
  const repNorm = reportedPlatform.toLowerCase();

  if (chNorm.includes("windows") && (repNorm.includes("mac") || repNorm.includes("linux"))) {
    return {
      inconsistent: true,
      reason: `Sec-CH-UA-Platform (${secChPlatform}) contradicts client navigator.platform (${reportedPlatform})`,
    };
  }
  if (chNorm.includes("mac") && (repNorm.includes("win") || repNorm.includes("linux"))) {
    return {
      inconsistent: true,
      reason: `Sec-CH-UA-Platform (${secChPlatform}) contradicts client navigator.platform (${reportedPlatform})`,
    };
  }
  return { inconsistent: false };
}

export function parseUserAgentSummary(userAgent: string): ParsedUserAgent {
  const ua = userAgent || "";
  let browser = "Unknown Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  let os = "Unknown OS";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
  return { browser, os, device };
}

