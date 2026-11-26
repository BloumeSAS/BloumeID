"use client";

import * as React from "react";
import { Database, Download, Globe, RefreshCw, Search, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PublicThreatFeedDTO } from "@/types";

interface SettingsApiResponse {
  trieTotalCidrs: number;
  feeds: PublicThreatFeedDTO[];
  geoip: {
    directory: string;
    mode: "official_maxmind" | "open_mirror";
    licenseKeyConfigured: boolean;
    cityDbLoaded: boolean;
    asnDbLoaded: boolean;
    filesFound: string[];
    fileDetails: Array<{ filename: string; sizeBytes: number; updatedAt: string }>;
  };
  retentionDaysDefault: number;
}

interface IpLookupPreviewResult {
  ipAddress: string;
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
}

export default function SettingsPage() {
  const { dict } = useI18n();
  const [state, setState] = React.useState<SettingsApiResponse | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [downloadingGeo, setDownloadingGeo] = React.useState(false);
  const [retentionDays, setRetentionDays] = React.useState(90);
  const [testIp, setTestIp] = React.useState("185.220.101.33");
  const [ipResult, setIpResult] = React.useState<IpLookupPreviewResult | null>(null);

  const loadSettings = React.useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = (await res.json()) as SettingsApiResponse;
      setState(data);
      setRetentionDays(data.retentionDaysDefault);
    }
  }, []);

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSyncFeeds = async () => {
    setSyncing(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_feeds" }),
      });
      await loadSettings();
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadGeoLite2 = async () => {
    setDownloadingGeo(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_geolite2" }),
      });
      await loadSettings();
    } finally {
      setDownloadingGeo(false);
    }
  };

  const handleLookupIp = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lookup_ip", ipAddress: testIp }),
    });
    if (res.ok) {
      const data = (await res.json()) as IpLookupPreviewResult;
      setIpResult(data);
    }
  };

  const handlePurge = async () => {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purge_events", retentionDays }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.settings.title}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{dict.settings.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            data-testid="download-geolite2-btn"
            onClick={handleDownloadGeoLite2}
            disabled={downloadingGeo}
          >
            <Globe className="h-4 w-4" />
            <span>
              {downloadingGeo ? dict.settings.geoipDownloading : dict.settings.geoipDownloadNow}
            </span>
          </Button>

          <Button
            type="button"
            data-testid="sync-feeds-btn"
            onClick={handleSyncFeeds}
            disabled={syncing}
          >
            <RefreshCw className="h-4 w-4" />
            <span>{syncing ? dict.settings.syncing : dict.settings.syncNow}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.settings.trieMemoryTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <span className="font-mono text-3xl font-bold">
              {(state?.trieTotalCidrs ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">{dict.settings.recordCount}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.settings.geoipStatusTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CopyableMono
                value={state?.geoip.directory ?? "/app/data/geoip"}
                copyLabel={dict.common.copy}
                copiedLabel={dict.common.copied}
              />
              <Badge variant="outline">
                {state?.geoip.mode === "official_maxmind"
                  ? dict.settings.geoipModeOfficial
                  : dict.settings.geoipModeMirror}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant={state?.geoip.cityDbLoaded ? "success" : "secondary"}>
                GeoLite2-City: {state?.geoip.cityDbLoaded ? dict.common.active : dict.common.none}
              </Badge>
              <Badge variant={state?.geoip.asnDbLoaded ? "success" : "secondary"}>
                GeoLite2-ASN: {state?.geoip.asnDbLoaded ? dict.common.active : dict.common.none}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Live IP & CIDR Lookup Tester */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.settings.ipTesterTitle}</CardTitle>
          <CardDescription>{dict.settings.ipTesterSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLookupIp} className="flex flex-wrap items-center gap-3">
            <Input
              value={testIp}
              onChange={(e) => setTestIp(e.target.value)}
              placeholder={dict.settings.ipTesterPlaceholder}
              className="max-w-sm font-mono"
              required
            />
            <Button type="submit" size="sm" data-testid="ip-tester-btn">
              <Search className="h-4 w-4" />
              <span>{dict.settings.ipTesterButton}</span>
            </Button>
          </form>

          {ipResult ? (
            <div className="grid gap-3 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">IP / ASN</p>
                <div className="mt-1 flex flex-col gap-1">
                  <CopyableMono
                    value={ipResult.ipAddress}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                  {ipResult.asnNumber ? (
                    <CopyableMono
                      value={`AS${ipResult.asnNumber} ${ipResult.asnOrg ?? ""}`}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">{dict.landing.geoliteLocation}</p>
                <p className="mt-1 font-mono text-xs">
                  {ipResult.country ?? "--"} ({ipResult.countryName ?? "--"}) •{" "}
                  {ipResult.city ?? "--"}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Lat/Lon: {ipResult.latitude ?? "--"}, {ipResult.longitude ?? "--"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">{dict.playground.detectedFlags}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ipResult.isTor ? <Badge variant="destructive">{dict.flags.tor}</Badge> : null}
                  {ipResult.isVpn ? <Badge variant="warning">{dict.flags.vpn}</Badge> : null}
                  {ipResult.isDatacenter ? (
                    <Badge variant="outline">{dict.flags.datacenter}</Badge>
                  ) : null}
                  {!ipResult.isTor && !ipResult.isVpn && !ipResult.isDatacenter ? (
                    <Badge variant="success">{dict.flags.clean}</Badge>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.settings.feedName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.settings.feedName}</TableHead>
                  <TableHead>{dict.settings.recordCount}</TableHead>
                  <TableHead>{dict.common.status}</TableHead>
                  <TableHead>{dict.settings.lastSynced}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(state?.feeds ?? []).map((feed) => (
                  <TableRow key={feed.feedName}>
                    <TableCell>
                      <CopyableMono
                        value={feed.feedName}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </TableCell>
                    <TableCell className="font-mono">{feed.recordCount}</TableCell>
                    <TableCell>
                      <Badge variant={feed.status === "ok" ? "success" : "warning"}>
                        {feed.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {feed.lastSyncedAt ? new Date(feed.lastSyncedAt).toLocaleString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.settings.retentionTitle}</CardTitle>
            <CardDescription>{dict.settings.retentionDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="retention-days">{dict.settings.daysLabel}</Label>
              <Input
                id="retention-days"
                type="number"
                min={1}
                max={3650}
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
              />
            </div>
            <Button type="button" variant="destructive" onClick={handlePurge}>
              <Trash2 className="h-4 w-4" />
              <span>{dict.settings.purgeButton}</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.settings.exportTitle}</CardTitle>
            <CardDescription>{dict.settings.exportDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <a href="/api/admin/settings?export=json" download>
              <Button type="button" variant="outline">
                <Download className="h-4 w-4" />
                <span>{dict.settings.exportJson}</span>
              </Button>
            </a>
            <a href="/api/admin/settings?export=csv" download>
              <Button type="button" variant="outline">
                <Download className="h-4 w-4" />
                <span>{dict.settings.exportCsv}</span>
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
