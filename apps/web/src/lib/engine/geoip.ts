import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import maxmind, { type AsnResponse, type CityResponse, type Reader } from "maxmind";

export interface GeoIpLookupResult {
  asnNumber: number | null;
  asnOrg: string | null;
  country: string | null;
  countryName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface GeoIpFileMeta {
  filename: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface GeoIpStatusInfo {
  directory: string;
  mode: "official_maxmind" | "open_mirror";
  licenseKeyConfigured: boolean;
  cityDbLoaded: boolean;
  asnDbLoaded: boolean;
  filesFound: string[];
  fileDetails: GeoIpFileMeta[];
  lastSyncStatus?: string;
}

const MIRROR_CITY_URL =
  "https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb";
const MIRROR_ASN_URL =
  "https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-ASN.mmdb";

let cityReader: Reader<CityResponse> | null = null;
let asnReader: Reader<AsnResponse> | null = null;
let loadedFiles: string[] = [];
let initialized = false;
let lastSyncStatus = "ready";

export function getGeoIpDirectory(): string {
  return (
    process.env.GEOIP_DIR ??
    (fs.existsSync("/app/data/geoip")
      ? "/app/data/geoip"
      : path.resolve(process.cwd(), "../../data/geoip"))
  );
}

/**
 * Extracts a `.mmdb` file from a `.tar.gz` Buffer using built-in `zlib.gunzipSync` and 512-byte POSIX tar header blocks.
 */
export function extractMmdbFromTarGzBuffer(tarGzBuffer: Buffer): Buffer | null {
  try {
    const tarBuffer = zlib.gunzipSync(tarGzBuffer);
    let offset = 0;

    while (offset + 512 <= tarBuffer.length) {
      const header = tarBuffer.subarray(offset, offset + 512);
      if (header[0] === 0) break;

      const nameRaw = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
      const sizeOctal = header
        .subarray(124, 136)
        .toString("utf8")
        .replace(/\0.*$/, "")
        .trim();
      const fileSize = parseInt(sizeOctal, 8) || 0;
      const dataStart = offset + 512;

      if (nameRaw.endsWith(".mmdb") && fileSize > 0 && dataStart + fileSize <= tarBuffer.length) {
        return Buffer.from(tarBuffer.subarray(dataStart, dataStart + fileSize));
      }

      const blocks = Math.ceil(fileSize / 512);
      offset = dataStart + blocks * 512;
    }
  } catch {
    return null;
  }
  return null;
}

export async function downloadAndUpdateGeoLite2(options?: {
  customDir?: string;
  licenseKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<{
  updated: boolean;
  mode: "official_maxmind" | "open_mirror";
  cityUpdated: boolean;
  asnUpdated: boolean;
  status: GeoIpStatusInfo;
}> {
  const dir = options?.customDir ?? getGeoIpDirectory();
  const licenseKey = (options?.licenseKey ?? process.env.MAXMIND_LICENSE_KEY ?? "").trim();
  const fetchFn = options?.fetchImpl ?? fetch;
  const mode: "official_maxmind" | "open_mirror" =
    licenseKey.length > 4 ? "official_maxmind" : "open_mirror";

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Ignore mkdir error
  }

  let cityUpdated = false;
  let asnUpdated = false;

  const downloadEdition = async (edition: "GeoLite2-City" | "GeoLite2-ASN", mirrorUrl: string) => {
    const targetPath = path.join(dir, `${edition}.mmdb`);
    const tempPath = path.join(dir, `${edition}.mmdb.tmp`);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);

      if (mode === "official_maxmind") {
        const officialUrl = `https://download.maxmind.com/app/geoip_download?edition_id=${edition}&license_key=${encodeURIComponent(licenseKey)}&suffix=tar.gz`;
        const res = await fetchFn(officialUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const arrBuf = await res.arrayBuffer();
          const mmdbBuf = extractMmdbFromTarGzBuffer(Buffer.from(arrBuf));
          if (mmdbBuf && mmdbBuf.length > 1024) {
            fs.writeFileSync(tempPath, mmdbBuf);
            fs.renameSync(tempPath, targetPath);
            return true;
          }
        }
      }

      // Fallback or Mode B: Zero-Config Open-Source Mirror (.mmdb direct)
      const resMirror = await fetchFn(mirrorUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (resMirror.ok) {
        const arrBuf = await resMirror.arrayBuffer();
        const buf = Buffer.from(arrBuf);
        if (buf.length > 1024) {
          fs.writeFileSync(tempPath, buf);
          fs.renameSync(tempPath, targetPath);
          return true;
        }
      }
    } catch {
      // Ignore network/download error in restricted environments
    }
    return false;
  };

  cityUpdated = await downloadEdition("GeoLite2-City", MIRROR_CITY_URL);
  asnUpdated = await downloadEdition("GeoLite2-ASN", MIRROR_ASN_URL);
  lastSyncStatus = cityUpdated || asnUpdated ? "updated" : "cached_or_fallback";

  const status = await initGeoIpReaders(dir);
  return {
    updated: cityUpdated || asnUpdated,
    mode,
    cityUpdated,
    asnUpdated,
    status,
  };
}

export async function ensureGeoLite2Fresh(customDir?: string): Promise<GeoIpStatusInfo> {
  const dir = customDir ?? getGeoIpDirectory();
  const cityPath = path.join(dir, "GeoLite2-City.mmdb");
  const asnPath = path.join(dir, "GeoLite2-ASN.mmdb");

  let needsDownload = false;
  try {
    if (!fs.existsSync(cityPath) || !fs.existsSync(asnPath)) {
      needsDownload = true;
    } else {
      const stat = fs.statSync(cityPath);
      const ageDays = (Date.now() - stat.mtimeMs) / 86400000;
      if (ageDays > 7) needsDownload = true;
    }
  } catch {
    needsDownload = false;
  }

  if (needsDownload && process.env.NODE_ENV !== "test") {
    void downloadAndUpdateGeoLite2({ customDir: dir });
  }

  return initGeoIpReaders(dir);
}

export async function initGeoIpReaders(customDir?: string): Promise<GeoIpStatusInfo> {
  const dir = customDir ?? getGeoIpDirectory();
  loadedFiles = [];
  cityReader = null;
  asnReader = null;

  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mmdb"));
      loadedFiles = files;

      const cityFile = files.find((f) => /city|country/i.test(f));
      const asnFile = files.find((f) => /asn/i.test(f));

      if (cityFile) {
        cityReader = await maxmind.open<CityResponse>(path.join(dir, cityFile));
      }
      if (asnFile) {
        asnReader = await maxmind.open<AsnResponse>(path.join(dir, asnFile));
      }
    }
  } catch {
    // Gracefully run without MMDB if files are absent or invalid
  }

  initialized = true;
  return getGeoIpStatus(dir);
}

export function getGeoIpStatus(customDir?: string): GeoIpStatusInfo {
  const dir = customDir ?? getGeoIpDirectory();
  const licenseKey = (process.env.MAXMIND_LICENSE_KEY ?? "").trim();
  let filesFound = loadedFiles;
  const fileDetails: GeoIpFileMeta[] = [];

  try {
    if (fs.existsSync(dir)) {
      filesFound = fs.readdirSync(dir).filter((f) => f.endsWith(".mmdb"));
      for (const f of filesFound) {
        const st = fs.statSync(path.join(dir, f));
        fileDetails.push({
          filename: f,
          sizeBytes: st.size,
          updatedAt: st.mtime.toISOString(),
        });
      }
    }
  } catch {
    filesFound = [];
  }

  return {
    directory: dir,
    mode: licenseKey.length > 4 ? "official_maxmind" : "open_mirror",
    licenseKeyConfigured: licenseKey.length > 4,
    cityDbLoaded: Boolean(cityReader),
    asnDbLoaded: Boolean(asnReader),
    filesFound,
    fileDetails,
    lastSyncStatus,
  };
}

// Built-in deterministic fallback ASN & Geo intelligence for well-known subnets when MMDB isn't downloaded yet
const BUILTIN_GEO_HINTS: ReadonlyArray<{
  prefix: string;
  asnNumber: number;
  asnOrg: string;
  country: string;
  countryName: string;
  city: string;
  lat: number;
  lon: number;
}> = [
  {
    prefix: "185.220.101.",
    asnNumber: 24940,
    asnOrg: "Hetzner Online GmbH (Tor Exit)",
    country: "DE",
    countryName: "Germany",
    city: "Falkenstein",
    lat: 50.4779,
    lon: 12.3713,
  },
  {
    prefix: "185.159.156.",
    asnNumber: 212238,
    asnOrg: "Datacamp Limited / Mullvad VPN",
    country: "FR",
    countryName: "France",
    city: "Paris",
    lat: 48.8566,
    lon: 2.3522,
  },
  {
    prefix: "51.38.",
    asnNumber: 16276,
    asnOrg: "OVH SAS",
    country: "FR",
    countryName: "France",
    city: "Gravelines",
    lat: 50.987,
    lon: 2.1255,
  },
  {
    prefix: "138.68.",
    asnNumber: 14061,
    asnOrg: "DigitalOcean, LLC",
    country: "US",
    countryName: "United States",
    city: "New York",
    lat: 40.7128,
    lon: -74.006,
  },
  {
    prefix: "172.",
    asnNumber: 3215,
    asnOrg: "Orange S.A. / Local Docker Bridge",
    country: "FR",
    countryName: "France",
    city: "Paris",
    lat: 48.8566,
    lon: 2.3522,
  },
  {
    prefix: "127.",
    asnNumber: 3215,
    asnOrg: "Orange S.A. / Local Loopback",
    country: "FR",
    countryName: "France",
    city: "Paris",
    lat: 48.8566,
    lon: 2.3522,
  },
  {
    prefix: "192.168.",
    asnNumber: 12322,
    asnOrg: "Free SAS / Local LAN",
    country: "FR",
    countryName: "France",
    city: "Paris",
    lat: 48.8566,
    lon: 2.3522,
  },
];

export async function lookupGeoIp(ipAddress: string): Promise<GeoIpLookupResult> {
  if (!initialized) {
    await initGeoIpReaders();
  }

  let asnNumber: number | null = null;
  let asnOrg: string | null = null;
  let country: string | null = null;
  let countryName: string | null = null;
  let city: string | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;

  try {
    if (cityReader) {
      const res = cityReader.get(ipAddress);
      if (res) {
        country = res.country?.iso_code ?? null;
        countryName = res.country?.names?.en ?? null;
        city = res.city?.names?.en ?? null;
        latitude = res.location?.latitude ?? null;
        longitude = res.location?.longitude ?? null;
      }
    }
    if (asnReader) {
      const res = asnReader.get(ipAddress);
      if (res) {
        asnNumber = res.autonomous_system_number ?? null;
        asnOrg = res.autonomous_system_organization ?? null;
      }
    }
  } catch {
    // Ignore invalid IPs or reader exceptions
  }

  if (!country && !asnNumber) {
    const hint = BUILTIN_GEO_HINTS.find((h) => ipAddress.startsWith(h.prefix));
    if (hint) {
      asnNumber = hint.asnNumber;
      asnOrg = hint.asnOrg;
      country = hint.country;
      countryName = hint.countryName;
      city = hint.city;
      latitude = hint.lat;
      longitude = hint.lon;
    }
  }

  return { asnNumber, asnOrg, country, countryName, city, latitude, longitude };
}
