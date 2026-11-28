import crypto from "node:crypto";
import { isIP } from "node:net";
import type { FingerprintComponents, UserAgentDataComponent } from "@bloume/id";

export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
}

export interface DetailedParsedUserAgent extends ParsedUserAgent {
  browserVersion: string;
  osVersion: string;
}

export function ipv6ToBigInt(ip: string): bigint | null {
  let clean = ip.trim();
  if (clean.startsWith("[") && clean.endsWith("]")) {
    clean = clean.slice(1, -1);
  }
  const zoneIdx = clean.indexOf("%");
  if (zoneIdx !== -1) {
    clean = clean.slice(0, zoneIdx);
  }
  if (isIP(clean) !== 6) {
    return null;
  }

  // Convert trailing embedded IPv4 (e.g., 64:ff9b::192.0.2.1) into two hextets
  const lastColon = clean.lastIndexOf(":");
  const tail = clean.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = ipToUint32(tail);
    if (v4 === null) return null;
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    clean = `${clean.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const dblParts = clean.split("::");
  if (dblParts.length > 2) return null;

  const left = dblParts[0] ? dblParts[0].split(":").filter(Boolean) : [];
  const right = dblParts.length === 2 && dblParts[1] ? dblParts[1].split(":").filter(Boolean) : [];
  const missing = 8 - (left.length + right.length);
  if (dblParts.length === 1 && left.length !== 8) return null;
  if (dblParts.length === 2 && missing < 0) return null;

  const fullGroups = [
    ...left,
    ...Array.from({ length: Math.max(0, missing) }, () => "0"),
    ...right,
  ];
  if (fullGroups.length !== 8) return null;

  let value = 0n;
  for (const grp of fullGroups) {
    const num = Number.parseInt(grp, 16);
    if (!Number.isInteger(num) || num < 0 || num > 0xffff) return null;
    value = (value << 16n) | BigInt(num);
  }
  return value;
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

  const v6 = ipv6ToBigInt(trimmed);
  if (v6 !== null) {
    // Handle hex IPv4-mapped IPv6 (::ffff:0:0/96)
    if (v6 >> 32n === 0xffffn) {
      const v4 = Number(v6 & 0xffffffffn);
      return `${(v4 >>> 24) & 0xff}.${(v4 >>> 16) & 0xff}.${(v4 >>> 8) & 0xff}.0/24`;
    }
    const g0 = Number((v6 >> 112n) & 0xffffn).toString(16);
    const g1 = Number((v6 >> 96n) & 0xffffn).toString(16);
    const g2 = Number((v6 >> 80n) & 0xffffn).toString(16);
    return `${g0}:${g1}:${g2}::/48`;
  }

  return `${trimmed}/32`;
}

export function extractRealClientIp(
  headers: Headers,
  trustedProxiesEnv = process.env.TRUSTED_PROXIES ?? process.env.TRUSTED_PROXY_HEADERS ?? "true"
): string {
  const normalized = trustedProxiesEnv.trim().toLowerCase();
  const trustProxy =
    normalized.length > 0 &&
    normalized !== "false" &&
    normalized !== "0" &&
    normalized !== "no" &&
    normalized !== "off";

  if (trustProxy) {
    const cfIp = headers.get("cf-connecting-ip")?.trim();
    if (cfIp && isIP(cfIp) !== 0) {
      return cfIp;
    }

    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp && isIP(realIp) !== 0) {
      return realIp;
    }

    const xff = headers.get("x-forwarded-for");
    if (xff && xff.trim().length > 0) {
      const first = xff.split(",")[0]?.trim();
      if (first && isIP(first) !== 0) return first;
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
  if (originHeader.trim().toLowerCase() === "null") {
    return false;
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
      if (!suffix) continue;
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

  const chFamily = chNorm.includes("windows")
    ? "windows"
    : chNorm.includes("mac")
      ? "macos"
      : chNorm.includes("android")
        ? "android"
        : chNorm.includes("ios")
          ? "ios"
          : chNorm.includes("linux") || chNorm.includes("chrome os")
            ? "linux"
            : null;

  const repFamily = repNorm.includes("win")
    ? "windows"
    : repNorm.includes("mac")
      ? "macos"
      : repNorm.includes("iphone") || repNorm.includes("ipad") || repNorm.includes("ios")
        ? "ios"
        : repNorm.includes("android")
          ? "android"
          : repNorm.includes("linux") || repNorm.includes("x11") || repNorm.includes("cros")
            ? "linux"
            : null;

  if (!chFamily || !repFamily || chFamily === repFamily) {
    return { inconsistent: false };
  }

  // Android browsers legitimately report `Linux armv8l` / `Linux aarch64` as navigator.platform
  if (chFamily === "android" && repFamily === "linux") {
    return { inconsistent: false };
  }

  return {
    inconsistent: true,
    reason: `Sec-CH-UA-Platform (${secChPlatform}) contradicts client navigator.platform (${reportedPlatform})`,
  };
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

function normalizeBrowserVer(raw: string): string {
  const parts = raw.split(".").filter((p) => /^\d+$/.test(p));
  if (parts.length === 0) return "0.0";
  if (parts.length === 1) return `${parts[0]}.0`;
  return `${parts[0]}.${parts[1]}`;
}

export function parseDetailedUserAgent(
  userAgent: string,
  headers?: Headers,
  uaData?: Partial<UserAgentDataComponent>
): DetailedParsedUserAgent {
  const base = parseUserAgentSummary(userAgent);
  const ua = userAgent || "";
  let browser = base.browser;
  let browserVersion = "0.0";

  const edg = ua.match(/Edg(?:A|iOS)?\/([\d.]+)/i);
  const opr = ua.match(/(?:OPR|Opera)\/([\d.]+)/i);
  const chr = ua.match(/(?:Chrome|CriOS)\/([\d.]+)/i);
  const ff = ua.match(/(?:Firefox|FxiOS)\/([\d.]+)/i);
  const saf = ua.match(/Version\/([\d.]+).*Safari/i);

  if (edg) {
    browser = "Edge";
    browserVersion = normalizeBrowserVer(edg[1] ?? "0");
  } else if (opr) {
    browser = "Opera";
    browserVersion = normalizeBrowserVer(opr[1] ?? "0");
  } else if (chr) {
    browser = "Chrome";
    browserVersion = normalizeBrowserVer(chr[1] ?? "0");
  } else if (ff) {
    browser = "Firefox";
    browserVersion = normalizeBrowserVer(ff[1] ?? "0");
  } else if (saf) {
    browser = "Safari";
    browserVersion = normalizeBrowserVer(saf[1] ?? "0");
  }

  // Prefer high-entropy Client Hints when available
  const secChUaHeader = headers?.get("sec-ch-ua") ?? "";
  if (uaData?.brands && uaData.brands.length > 0) {
    const primary =
      uaData.brands.find(
        (b) => !/Not[;._ -]?A[;._ -]?Brand/i.test(b.brand) && !/^Chromium$/i.test(b.brand)
      ) ?? uaData.brands.find((b) => /Chromium/i.test(b.brand));
    if (primary?.version) {
      if (browserVersion.split(".")[0] !== primary.version.split(".")[0]) {
        browserVersion = normalizeBrowserVer(primary.version);
      }
      if (/Edge/i.test(primary.brand)) browser = "Edge";
      else if (/Opera/i.test(primary.brand)) browser = "Opera";
      else if (/Chrome/i.test(primary.brand)) browser = "Chrome";
    }
  } else if (secChUaHeader) {
    const brandMatches = Array.from(secChUaHeader.matchAll(/"([^"]+)";\s*v="([^"]+)"/g));
    const primary = brandMatches.find(
      (m) => m[1] && !/Not[;._ -]?A[;._ -]?Brand/i.test(m[1]) && !/^Chromium$/i.test(m[1])
    );
    if (primary?.[1] && primary?.[2]) {
      if (browserVersion.split(".")[0] !== primary[2].split(".")[0]) {
        browserVersion = normalizeBrowserVer(primary[2]);
      }
      if (/Edge/i.test(primary[1])) browser = "Edge";
      else if (/Opera/i.test(primary[1])) browser = "Opera";
      else if (/Chrome/i.test(primary[1])) browser = "Chrome";
    }
  }

  let os = base.os;
  let osVersion = "";
  const headerPv = headers?.get("sec-ch-ua-platform-version")?.replace(/"/g, "").trim() ?? "";
  const platformVersion = uaData?.platformVersion || headerPv;

  if (os === "Windows" || /Windows/i.test(uaData?.platform ?? "")) {
    os = "Windows";
    const pvMajor = Number((platformVersion || "").split(".")[0] ?? "0");
    if (Number.isFinite(pvMajor) && pvMajor >= 13) {
      osVersion = "11";
    } else if (Number.isFinite(pvMajor) && pvMajor >= 1) {
      osVersion = "10";
    } else {
      const nt = ua.match(/Windows NT ([\d.]+)/i)?.[1] ?? "10.0";
      if (nt === "10.0") osVersion = "10";
      else if (nt === "6.3") osVersion = "8.1";
      else if (nt === "6.2") osVersion = "8";
      else if (nt === "6.1") osVersion = "7";
      else osVersion = nt;
    }
  } else if (os === "macOS") {
    const macVer = ua.match(/Mac OS X ([\d_]+)/i)?.[1]?.replace(/_/g, ".") ?? "";
    osVersion = platformVersion || macVer;
  } else if (os === "Android") {
    const andrVer = ua.match(/Android ([\d.]+)/i)?.[1] ?? "";
    osVersion = platformVersion || andrVer;
  } else if (os === "iOS") {
    const iosVer = ua.match(/(?:iPhone|CPU) OS ([\d_]+)/i)?.[1]?.replace(/_/g, ".") ?? "";
    osVersion = iosVer;
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    device: base.device,
  };
}

const STABLE_JA4_HEADER_SET = new Set([
  "sec-ch-ua",
  "sec-ch-ua-platform",
  "sec-ch-ua-mobile",
  "accept",
  "accept-encoding",
  "accept-language",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
  "priority",
  "upgrade-insecure-requests",
  "user-agent",
]);

/**
 * Resolves upstream X-JA4-Fingerprint or computes a canonical deterministic TLS/HTTP JA4-style hash
 * from request headers when TLS termination runs upstream (Cloudflare Tunnel / Traefik / Caddy).
 */
export function resolveOrSynthesizeJa4(headers: Headers): string {
  const upstreamJa4 = headers.get("x-ja4-fingerprint")?.trim();
  if (upstreamJa4 && upstreamJa4.length >= 8 && upstreamJa4.length <= 128) {
    return upstreamJa4;
  }

  const canonicalFields = [
    headers.get("sec-ch-ua") ?? "",
    headers.get("sec-ch-ua-platform") ?? "",
    headers.get("sec-ch-ua-mobile") ?? "",
    headers.get("accept") ?? "",
    headers.get("accept-encoding") ?? "",
    headers.get("accept-language") ?? "",
    headers.get("priority") ?? "",
    headers.get("cf-visitor") ?? "",
    headers.get("x-forwarded-proto") ?? "",
    headers.get("user-agent") ?? "",
  ];
  const headerOrder = Array.from(headers.keys())
    .map((k) => k.toLowerCase())
    .filter((k) => STABLE_JA4_HEADER_SET.has(k))
    .join(",");

  const isH2OrHttps =
    (headers.get("cf-visitor") ?? "").includes("https") ||
    headers.get("x-forwarded-proto") === "https" ||
    headers.has("sec-ch-ua") ||
    headers.has("priority");

  const headerHash12 = crypto
    .createHash("sha256")
    .update(`${headerOrder}|${canonicalFields.slice(3, 9).join("|")}`, "utf8")
    .digest("hex")
    .slice(0, 12);
  const chHash12 = crypto
    .createHash("sha256")
    .update(`${canonicalFields.slice(0, 3).join("|")}|${canonicalFields[9]}`, "utf8")
    .digest("hex")
    .slice(0, 12);

  return `t13d1516${isH2OrHttps ? "h2" : "h1"}_${headerHash12}_${chHash12}`;
}

export function detectTorBrowserFromComponents(
  comp: Partial<FingerprintComponents> | undefined,
  userAgent: string
): {
  isTor: boolean;
  markerCount: number;
  isSpoofedFallback: boolean;
  reasons: string[];
} {
  if (!comp) {
    return { isTor: false, markerCount: 0, isSpoofedFallback: false, reasons: [] };
  }

  let markerCount = 0;
  const tz = comp.timezoneIntl?.timezone ?? "";
  if (
    tz === "Atlantic/Reykjavik" ||
    (tz === "UTC" &&
      comp.timezoneIntl?.timezoneOffsetMinutes === 0 &&
      comp.languages?.language === "en-US")
  ) {
    markerCount += 1;
  }

  if (comp.webgl?.vendor === "Mozilla" && comp.webgl?.renderer === "Mozilla") {
    markerCount += 1;
  }

  if (
    comp.webrtc?.available === false &&
    comp.speech?.voiceCount === 0 &&
    (comp.mediaCodecs?.audioInputCount ?? 0) === 0
  ) {
    markerCount += 1;
  }

  if (comp.canvas?.doubleRenderConsistent === false) {
    markerCount += 1;
  }

  if (comp.hardware?.globalPrivacyControl === true && comp.hardware?.deviceMemory === 0) {
    markerCount += 1;
  }

  const mozillaWebGlWithNonFirefoxUa =
    (comp.webgl?.vendor === "Mozilla" || comp.webgl?.renderer === "Mozilla") &&
    userAgent.length > 0 &&
    !/Firefox\//i.test(userAgent);
  if (mozillaWebGlWithNonFirefoxUa) {
    markerCount += 1;
  }

  const isTor = markerCount >= 3 || (Boolean(comp.antiSpoof?.isTorBrowser) && markerCount >= 2);
  const reasons = isTor ? ["Tor Browser environment signature detected"] : [];
  return {
    isTor,
    markerCount,
    isSpoofedFallback: mozillaWebGlWithNonFirefoxUa || comp.canvas?.doubleRenderConsistent === false,
    reasons,
  };
}

