"use client";

import * as React from "react";
import { Save, Send, Settings2, ShieldCheck, Trash2, Webhook } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataPagination } from "@/components/ui/data-pagination";
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
  const { dict, refreshTick, selectedSiteId } = useI18n();
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);
  const [deliveries, setDeliveries] = React.useState<PublicWebhookDeliveryDTO[]>([]);
  const [urlDrafts, setUrlDrafts] = React.useState<Record<string, string>>({});
  const [thresholdDrafts, setThresholdDrafts] = React.useState<Record<string, number>>({});
  const [editingSite, setEditingSite] = React.useState<PublicSiteDTO | null>(null);
  const [deliveriesPage, setDeliveriesPage] = React.useState(1);
  const [toast, setToast] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const pageSize = 10;
  const displayedSites = React.useMemo(
    () => (selectedSiteId === "all" ? sites : sites.filter((s) => s.publicId === selectedSiteId)),
    [sites, selectedSiteId],
  );
  const filteredDeliveries = React.useMemo(
    () =>
      selectedSiteId === "all"
        ? deliveries
        : deliveries.filter((d) => d.sitePublicId === selectedSiteId),
    [deliveries, selectedSiteId],
  );
  const totalDeliveryPages = Math.max(1, Math.ceil(filteredDeliveries.length / pageSize));
  const paginatedDeliveries = React.useMemo(
    () => filteredDeliveries.slice((deliveriesPage - 1) * pageSize, deliveriesPage * pageSize),
    [filteredDeliveries, deliveriesPage],
  );

  const loadData = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/admin/sites?all=true", { signal });
      if (res.ok && !signal?.aborted) {
        const data = (await res.json()) as {
          sites: PublicSiteDTO[];
          webhookDeliveries?: PublicWebhookDeliveryDTO[];
        };
        setSites(data.sites);
        if (data.webhookDeliveries) {
          setDeliveries(data.webhookDeliveries);
        }
        setUrlDrafts((prev) => {
          const next: Record<string, string> = {};
          for (const s of data.sites) {
            next[s.publicId] = prev[s.publicId] ?? (s.webhookUrl ?? "");
          }
          return next;
        });
        setThresholdDrafts((prev) => {
          const next: Record<string, number> = {};
          for (const s of data.sites) {
            next[s.publicId] = prev[s.publicId] ?? s.riskThreshold;
          }
          return next;
        });
      }
    } catch {
      // Ignore abort or transient fetch errors
    }
  }, []);

  React.useEffect(() => {
    setDeliveriesPage(1);
  }, [selectedSiteId]);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, refreshTick]);

  const handleSaveWebhook = async (publicId: string, clearUrl = false) => {
    setErrorMsg(null);
    const nextUrl = clearUrl ? null : (urlDrafts[publicId] ?? "").trim() || null;
    const rawTh = Number(thresholdDrafts[publicId] ?? 3);
    const nextThreshold = Number.isFinite(rawTh) ? Math.max(0, Math.min(5, Math.round(rawTh))) : 3;
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
      setEditingSite(null);
      await loadData();
      setTimeout(() => setToast(null), 3000);
    } else {
      const err = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as {
        error?: string;
      };
      setErrorMsg(err.error ?? `HTTP ${res.status}`);
    }
  };

  const handleTestWebhook = async (publicId: string) => {
    setErrorMsg(null);
    const res = await fetch("/api/admin/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, testWebhook: true }),
    });
    if (res.ok) {
      setToast(dict.sites.webhookSent);
      await loadData();
      setTimeout(() => setToast(null), 3000);
    } else {
      const err = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as {
        error?: string;
      };
      setErrorMsg(err.error ?? `HTTP ${res.status}`);
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

      {errorMsg ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          {errorMsg}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedSiteId !== "all" && displayedSites[0]
                ? `${displayedSites[0].name} — ${dict.webhooksPage.endpointConfigTitle}`
                : dict.webhooksPage.endpointConfigTitle}
            </CardTitle>
            <CardDescription>{dict.sites.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSiteId !== "all" && displayedSites[0] ? (
              (() => {
                const site = displayedSites[0];
                const hasWebhook = Boolean(site.webhookUrl && site.webhookUrl.trim().length > 0);
                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
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

                    <div className="grid gap-3 sm:grid-cols-12">
                      <div className="space-y-1.5 sm:col-span-8">
                        <Label htmlFor="single-wh-url">{dict.sites.webhookUrl}</Label>
                        <Input
                          id="single-wh-url"
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
                      <div className="space-y-1.5 sm:col-span-4">
                        <Label htmlFor="single-wh-th">{dict.sites.riskThreshold}</Label>
                        <Input
                          id="single-wh-th"
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

                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        {dict.webhooksPage.signatureHeader} (HMAC-SHA256)
                      </p>
                      <CopyableMono
                        value={site.webhookSecret ?? "whsec_bloumeid_cosmic_secret_2026"}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
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
                );
              })()
            ) : (
              displayedSites.map((site) => {
              const hasWebhook = Boolean(site.webhookUrl && site.webhookUrl.trim().length > 0);
              return (
                <div
                  key={site.publicId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 p-4"
                >
                  <div className="min-w-0 space-y-1.5">
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
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {hasWebhook ? site.webhookUrl : dict.sites.webhookUrlPlaceholder}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
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
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSite(site)}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      <span>{dict.webhooksPage.title}</span>
                    </Button>
                  </div>
                </div>
              );
            }))}
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
              {filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                    {dict.sites.webhookNoLogs}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDeliveries.map((wh) => (
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
          <DataPagination
            page={deliveriesPage}
            pageSize={pageSize}
            totalPages={totalDeliveryPages}
            totalItems={filteredDeliveries.length}
            onPageChange={setDeliveriesPage}
          />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingSite)}
        onOpenChange={(open) => {
          if (!open) setEditingSite(null);
        }}
        title={editingSite ? `${editingSite.name} — ${dict.webhooksPage.title}` : dict.webhooksPage.title}
        description={editingSite?.publicId}
        closeLabel={dict.common.close}
      >
        {editingSite ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="modal-wh-url">
                {dict.sites.webhookUrl}
              </Label>
              <Input
                id="modal-wh-url"
                value={urlDrafts[editingSite.publicId] ?? ""}
                onChange={(e) =>
                  setUrlDrafts((prev) => ({
                    ...prev,
                    [editingSite.publicId]: e.target.value,
                  }))
                }
                placeholder={dict.sites.webhookUrlPlaceholder}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modal-wh-th">{dict.sites.riskThreshold}</Label>
              <Input
                id="modal-wh-th"
                type="number"
                min={0}
                max={5}
                value={thresholdDrafts[editingSite.publicId] ?? editingSite.riskThreshold}
                onChange={(e) =>
                  setThresholdDrafts((prev) => ({
                    ...prev,
                    [editingSite.publicId]: Number(e.target.value),
                  }))
                }
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {dict.webhooksPage.signatureHeader} (HMAC-SHA256)
              </p>
              <CopyableMono
                value={editingSite.webhookSecret ?? "whsec_bloumeid_cosmic_secret_2026"}
                copyLabel={dict.common.copy}
                copiedLabel={dict.common.copied}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {Boolean(editingSite.webhookUrl && editingSite.webhookUrl.trim().length > 0) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSaveWebhook(editingSite.publicId, true)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  <span>{dict.webhooksPage.disableWebhook}</span>
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveWebhook(editingSite.publicId, false)}
              >
                <Save className="h-3.5 w-3.5" />
                <span>{dict.webhooksPage.saveWebhook}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
