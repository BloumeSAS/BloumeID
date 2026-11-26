"use client";

import * as React from "react";
import { Send, ShieldCheck, Webhook } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
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
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData, refreshTick]);

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
      <div>
        <div className="flex items-center gap-2.5">
          <Webhook className="h-5 w-5 text-[#d946ef]" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {dict.webhooksPage.title}
          </h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {dict.webhooksPage.subtitle}
        </p>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-white/10 bg-[#100e1a] lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">{dict.webhooksPage.endpointConfigTitle}</CardTitle>
            <CardDescription>{dict.sites.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sites.map((site) => (
              <div
                key={site.publicId}
                className="space-y-3 rounded-xl border border-white/10 bg-[#0b0a12] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{site.name}</span>
                    <CopyableMono
                      value={site.publicId}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                    <Badge variant="outline" className="font-mono text-xs">
                      {dict.sites.riskThreshold}: &gt;= {site.riskThreshold}
                    </Badge>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleTestWebhook(site.publicId)}
                  >
                    <Send className="h-3.5 w-3.5 text-[#635bff]" />
                    <span>{dict.webhooksPage.triggerTest}</span>
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{dict.sites.webhookUrl}</p>
                    <CopyableMono
                      value={site.webhookUrl ?? "https://hooks.bloume.io/security/fingerprint"}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </div>
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
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#100e1a] lg:col-span-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-base">{dict.webhooksPage.eventPayloadTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b0a12] p-4 font-mono text-xs text-slate-300">
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
      <Card className="border-white/10 bg-[#100e1a]">
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

