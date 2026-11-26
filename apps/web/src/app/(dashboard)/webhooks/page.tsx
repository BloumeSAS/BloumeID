"use client";

import * as React from "react";
import { Save, Send, ShieldCheck, Trash2, Webhook } from "lucide-react";
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
import type { PublicSiteDTO, PublicWebhookDeliveryDTO } from "@/types";

export default function WebhooksPage() {
  const { dict, refreshTick } = useI18n();
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);
  const [deliveries, setDeliveries] = React.useState<PublicWebhookDeliveryDTO[]>([]);
  const [urlDrafts, setUrlDrafts] = React.useState<Record<string, string>>({});
  const [thresholdDrafts, setThresholdDrafts] = React.useState<Record<string, number>>({});
  const [toast, setToast] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    const res = await fetch("/api/admin/sites");
    if (res.ok) {
      const data = (await res.json()) as {
        sites: PublicSiteDTO[];
        webhookDeliveries?: PublicWebhookDeliveryDTO[];
      };
      setSites(data.sites);
      if (data.webhookDeliveries) {
        setDeliveries(data.webhookDeliveries);
      }
      const urls: Record<string, string> = {};
      const thresholds: Record<string, number> = {};
      for (const s of data.sites) {
        urls[s.publicId] = s.webhookUrl ?? "";
        thresholds[s.publicId] = s.riskThreshold;
      }
      setUrlDrafts(urls);
      setThresholdDrafts(thresholds);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData, refreshTick]);

  const handleSaveWebhook = async (publicId: string, clearUrl = false) => {
    const nextUrl = clearUrl ? null : (urlDrafts[publicId] ?? "").trim() || null;
    const nextThreshold = thresholdDrafts[publicId] ?? 3;
    const res = await fetch("/api/admin/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicId,
        webhookUrl: nextUrl,
        riskThreshold: nextThreshold,
      }),
    });
    if (res.ok) {
      setToast(dict.webhooksPage.webhookSaved);
      await loadData();
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleTestWebhook = async (publicId: string) => {
    const res = await fetch("/api/admin/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, testWebhook: true }),
    });
    if (res.ok) {
      setToast(dict.sites.webhookSent);
      await loadData();
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Webhook className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {dict.webhooksPage.title}
            </h1>
            <Badge variant="outline" className="border-primary/40 text-xs text-primary">
              {dict.webhooksPage.optionalBadge}
            </Badge>
          </div>
          <p className="mt-1 max-w-4xl text-xs text-muted-foreground sm:text-sm">
            {dict.webhooksPage.subtitle}
          </p>
        </div>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-500">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">{dict.webhooksPage.endpointConfigTitle}</CardTitle>
            <CardDescription>{dict.sites.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sites.map((site) => {
              const hasWebhook = Boolean(site.webhookUrl && site.webhookUrl.trim().length > 0);
              return (
                <div
                  key={site.publicId}
                  className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{site.name}</span>
                      <CopyableMono
                        value={site.publicId}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                      <Badge variant={hasWebhook ? "success" : "secondary"}>
                        {hasWebhook ? dict.common.enabled : dict.common.disabled}
                      </Badge>
                    </div>

                    {hasWebhook ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleTestWebhook(site.publicId)}
                      >
                        <Send className="h-3.5 w-3.5 text-primary" />
                        <span>{dict.webhooksPage.triggerTest}</span>
                      </Button>
                    ) : null}
                  </div>

                  {/* Optional Webhook URL & Risk Threshold Editor */}
                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="space-y-1 sm:col-span-8">
                      <Label htmlFor={`wh-url-${site.publicId}`} className="text-xs">
                        {dict.sites.webhookUrl} ({dict.webhooksPage.optionalBadge})
                      </Label>
                      <Input
                        id={`wh-url-${site.publicId}`}
                        value={urlDrafts[site.publicId] ?? ""}
                        onChange={(e) =>
                          setUrlDrafts((prev) => ({
                            ...prev,
                            [site.publicId]: e.target.value,
                          }))
                        }
                        placeholder={dict.sites.webhookUrlPlaceholder}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-4">
                      <Label htmlFor={`wh-th-${site.publicId}`} className="text-xs">
                        {dict.sites.riskThreshold}
                      </Label>
                      <Input
                        id={`wh-th-${site.publicId}`}
                        type="number"
                        min={0}
                        max={5}
                        value={thresholdDrafts[site.publicId] ?? site.riskThreshold}
                        onChange={(e) =>
                          setThresholdDrafts((prev) => ({
                            ...prev,
                            [site.publicId]: Number(e.target.value),
                          }))
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        {dict.webhooksPage.signatureHeader} (HMAC-SHA256)
                      </p>
                      <CopyableMono
                        value={site.webhookSecret ?? "whsec_bloumeid_cosmic_secret_2026"}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {hasWebhook ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveWebhook(site.publicId, true)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          <span>{dict.webhooksPage.disableWebhook}</span>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveWebhook(site.publicId, false)}
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{dict.webhooksPage.saveWebhook}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-base">{dict.webhooksPage.eventPayloadTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs text-foreground">
{`// Header: X-BloumeID-Signature: sha256=<hmac>
{
  "event": "threat.detected",
  "timestamp": "2026-11-26T04:40:00.000Z",
  "siteId": "site_73000000000000001",
  "requestId": "req_73000000000000502",
  "visitorId": "vis_73000000000000102",
  "dangerLevel": 5,
  "confidence": 0.99,
  "flags": {
    "isBot": true,
    "isSpoofed": true,
    "isTor": true,
    "isVpn": false,
    "isDatacenter": true
  },
  "network": {
    "ipAddress": "185.220.101.19",
    "asnNumber": 24940,
    "asnOrg": "Hetzner Online GmbH",
    "country": "DE"
  }
}`}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Deliveries Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.webhooksPage.deliveriesTitle}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.events.colRequest}</TableHead>
                <TableHead>{dict.common.status}</TableHead>
                <TableHead>{dict.playground.durationLabel}</TableHead>
                <TableHead>{dict.sites.webhookUrl}</TableHead>
                <TableHead>{dict.events.colTime}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                    {dict.sites.webhookNoLogs}
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((wh) => (
                  <TableRow key={wh.publicId}>
                    <TableCell>
                      <CopyableMono
                        value={wh.publicId}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={wh.delivered ? "success" : "destructive"}
                        className="font-mono"
                      >
                        {wh.statusCode ?? "ERR"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{wh.durationMs} ms</TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">
                      {wh.targetUrl}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(wh.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
