export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV === "test") {
    return;
  }

  const { ensureGeoLite2Fresh } = await import("@/lib/engine/geoip");
  const { syncAllThreatFeeds } = await import("@/lib/engine/feeds");
  const { purgeOldFingerprintEvents } = await import("@/lib/engine/repository");

  // Initial startup sync (non-blocking)
  void ensureGeoLite2Fresh();
  void syncAllThreatFeeds();

  // Threat Intel auto-refresh every 12 hours
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  setInterval(() => {
    void syncAllThreatFeeds();
  }, TWELVE_HOURS_MS);

  // GeoLite2 MMDB auto-refresh check every 3 days
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  setInterval(() => {
    void ensureGeoLite2Fresh();
  }, THREE_DAYS_MS);

  // Daily automated retention purge
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const retentionDays = Number(process.env.RETENTION_DAYS ?? 90);
  setInterval(() => {
    void purgeOldFingerprintEvents(retentionDays);
  }, ONE_DAY_MS);
}

