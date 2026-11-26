import fs from "node:fs";
import path from "node:path";
import maxmind, { type AsnResponse, type CityResponse, type Reader } from "maxmind";

export interface GeoIpLookupResult {
  asnNumber: number | null;
  asnOrg: string | null;
  country: string | null;
  city: string | null;
}

export interface GeoIpStatusInfo {
  directory: string;
  cityDbLoaded: boolean;
  asnDbLoaded: boolean;
  filesFound: string[];
}

let cityReader: Reader<CityResponse> | null = null;
let asnReader: Reader<AsnResponse> | null = null;
let loadedFiles: string[] = [];
let initialized = false;

export function getGeoIpDirectory(): string {
  return process.env.GEOIP_DIR ?? (fs.existsSync("/app/data/geoip") ? "/app/data/geoip" : path.resolve(process.cwd(), "../../data/geoip"));
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
  let filesFound = loadedFiles;
  try {
    if (fs.existsSync(dir)) {
      filesFound = fs.readdirSync(dir).filter((f) => f.endsWith(".mmdb"));
    }
  } catch {
    filesFound = [];
  }
  return {
    directory: dir,
    cityDbLoaded: Boolean(cityReader),
    asnDbLoaded: Boolean(asnReader),
    filesFound,
  };
}

export async function lookupGeoIp(ipAddress: string): Promise<GeoIpLookupResult> {
  if (!initialized) {
    await initGeoIpReaders();
  }

  let asnNumber: number | null = null;
  let asnOrg: string | null = null;
  let country: string | null = null;
  let city: string | null = null;

  try {
    if (cityReader) {
      const res = cityReader.get(ipAddress);
      if (res) {
        country = res.country?.iso_code ?? null;
        city = res.city?.names?.en ?? null;
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

  return { asnNumber, asnOrg, country, city };
}

