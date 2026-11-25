"use client";

import * as React from "react";
import { Database, Download, RefreshCw, Trash2 } from "lucide-react";
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
    cityDbLoaded: boolean;
    asnDbLoaded: boolean;
    filesFound: string[];
  };
  retentionDaysDefault: number;
}

export default function SettingsPage() {
  const { dict } = useI18n();
  const [state, setState] = React.useState<SettingsApiResponse | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [retentionDays, setRetentionDays] = React.useState(90);

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

  const handlePurge = async () => {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purge_events", retentionDays }),
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.settings.title}</h1>
          <p className="text-sm text-muted-foreground">{dict.settings.subtitle}</p>
        </div>

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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.settings.trieMemoryTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <span className="font-mono text-3xl font-bold">{state?.trieTotalCidrs ?? 0}</span>
            <span className="text-xs text-muted-foreground">{dict.settings.recordCount}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.settings.geoipStatusTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <CopyableMono
              value={state?.geoip.directory ?? "/app/data/geoip"}
              copyLabel={dict.common.copy}
              copiedLabel={dict.common.copied}
            />
            <div className="flex gap-2 pt-1">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.settings.feedName}</CardTitle>
        </CardHeader>
        <CardContent>
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
          <CardContent className="flex items-center gap-3">
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
