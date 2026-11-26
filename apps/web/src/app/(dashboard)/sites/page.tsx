"use client";

import * as React from "react";
import { Activity, Code2, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PublicSiteDTO, PublicWebhookDeliveryDTO } from "@/types";

export default function SitesPage() {
  const { dict } = useI18n();
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);
  const [webhookDeliveries, setWebhookDeliveries] = React.useState<PublicWebhookDeliveryDTO[]>([]);
  const [newName, setNewName] = React.useState("");
  const [newDomains, setNewDomains] = React.useState("localhost, *.example.com");
  const [newWebhook, setNewWebhook] = React.useState("");
  const [newThreshold, setNewThreshold] = React.useState(3);
  const [modalSite, setModalSite] = React.useState<PublicSiteDTO | null>(null);
  const [webhookStatus, setWebhookStatus] = React.useState<string | null>(null);

  const loadSites = React.useCallback(async () => {
    const res = await fetch("/api/admin/sites");
    if (res.ok) {
      const data = (await res.json()) as {
        sites: PublicSiteDTO[];
        webhookDeliveries?: PublicWebhookDeliveryDTO[];
      };
      setSites(data.sites);
      if (data.webhookDeliveries) {
        setWebhookDeliveries(data.webhookDeliveries);
      }
    }
  }, []);

  React.useEffect(() => {
    void loadSites();
  }, [loadSites]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const domains = newDomains
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    const res = await fetch("/api/admin/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        domains,
        webhookUrl: newWebhook.trim() ? newWebhook.trim() : null,
        riskThreshold: newThreshold,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { site: PublicSiteDTO };
      setSites((prev) => [data.site, ...prev]);
      setNewName("");
    }
  };

  const handlePatchSite = async (
    publicId: string,
    payload: Record<string, unknown>
  ) => {
    const res = await fetch("/api/admin/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, ...payload }),
    });
    if (res.ok) {
      const data = (await res.json()) as { site: PublicSiteDTO };
      setSites((prev) => prev.map((s) => (s.publicId === publicId ? data.site : s)));
      if (payload.testWebhook) {
        setWebhookStatus(dict.sites.webhookSent);
        void loadSites();
        setTimeout(() => setWebhookStatus(null), 3000);
      }
    }
  };

  const handleDeleteSite = async (publicId: string) => {
    const res = await fetch(`/api/admin/sites?publicId=${encodeURIComponent(publicId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSites((prev) => prev.filter((s) => s.publicId !== publicId));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{dict.sites.title}</h1>
        <p className="text-sm text-muted-foreground">{dict.sites.subtitle}</p>
      </div>

      {webhookStatus ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400">
          {webhookStatus}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.sites.createSite}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="site-name">{dict.sites.siteName}</Label>
              <Input
                id="site-name"
                data-testid="new-site-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={dict.sites.siteNamePlaceholder}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-domains">{dict.sites.allowedDomains}</Label>
              <Input
                id="site-domains"
                data-testid="new-site-domains"
                value={newDomains}
                onChange={(e) => setNewDomains(e.target.value)}
                placeholder={dict.sites.allowedDomainsPlaceholder}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-webhook">{dict.sites.webhookUrl}</Label>
              <Input
                id="site-webhook"
                value={newWebhook}
                onChange={(e) => setNewWebhook(e.target.value)}
                placeholder={dict.sites.webhookUrlPlaceholder}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="site-threshold">{dict.sites.riskThreshold}</Label>
                <Input
                  id="site-threshold"
                  type="number"
                  min={0}
                  max={5}
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(Number(e.target.value))}
                />
              </div>
              <Button type="submit" data-testid="create-site-btn">
                <Plus className="h-4 w-4" />
                <span>{dict.common.create}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {sites.map((site) => (
          <Card key={site.publicId}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <CardTitle className="text-lg">{site.name}</CardTitle>
                  <CopyableMono
                    value={site.publicId}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                  <Badge variant={site.isActive ? "success" : "secondary"}>
                    {site.isActive ? dict.common.active : dict.common.inactive}
                  </Badge>
                  <Badge variant="outline" className="gap-1 font-mono text-xs">
                    <Activity className="h-3 w-3 text-primary" />
                    {dict.sites.requests24h}: {site.requests24h ?? 0}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {dict.sites.requests30d}: {site.requests30d ?? 0}
                  </Badge>
                </div>
                <CardDescription className="flex flex-wrap gap-1.5 pt-1">
                  {site.domains.map((d) => (
                    <Badge key={d} variant="outline" className="font-mono text-xs">
                      {d}
                    </Badge>
                  ))}
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid={`integration-btn-${site.publicId}`}
                  onClick={() => setModalSite(site)}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>{dict.sites.integrationModal}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePatchSite(site.publicId, { rotateKeys: true })}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{dict.sites.rotateKeys}</span>
                </Button>
                {site.webhookUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePatchSite(site.publicId, { testWebhook: true })}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{dict.sites.testWebhook}</span>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSite(site.publicId)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{dict.sites.publicKey}</p>
                  <CopyableMono
                    value={site.publicKey}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{dict.sites.secretKey}</p>
                  <CopyableMono
                    value={site.secretKeyPlain ?? site.secretKeyHint}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                  <p className="text-[11px] text-muted-foreground">{dict.sites.secretKeyNotice}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dict.sites.collectorsTitle}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {(
                    [
                      ["webrtc", dict.sites.collectorWebrtc],
                      ["audio", dict.sites.collectorAudio],
                      ["canvas", dict.sites.collectorCanvas],
                      ["webgl", dict.sites.collectorWebgl],
                      ["fonts", dict.sites.collectorFonts],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2">
                      <span className="text-xs">{label}</span>
                      <Switch
                        checked={site.config[key]}
                        ariaLabel={label}
                        onCheckedChange={(checked) =>
                          handlePatchSite(site.publicId, {
                            config: { ...site.config, [key]: checked },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Webhook Delivery Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.sites.webhookLogsTitle}</CardTitle>
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
              {webhookDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                    {dict.sites.webhookNoLogs}
                  </TableCell>
                </TableRow>
              ) : (
                webhookDeliveries.map((wh) => (
                  <TableRow key={wh.publicId}>
                    <TableCell>
                      <CopyableMono
                        value={wh.publicId}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={wh.delivered ? "success" : "destructive"} className="font-mono">
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

      <Dialog
        open={Boolean(modalSite)}
        onOpenChange={(open) => !open && setModalSite(null)}
        title={dict.sites.integrationTitle}
        description={dict.sites.integrationDescription}
        closeLabel={dict.common.close}
      >
        {modalSite ? (
          <Tabs defaultValue="npm">
            <TabsList className="flex-wrap">
              <TabsTrigger value="npm">{dict.sites.tabNpm}</TabsTrigger>
              <TabsTrigger value="fp">{dict.sites.tabFpPro}</TabsTrigger>
              <TabsTrigger value="react">{dict.sites.tabReact}</TabsTrigger>
              <TabsTrigger value="script">{dict.sites.tabScript}</TabsTrigger>
              <TabsTrigger value="node">{dict.sites.tabNode}</TabsTrigger>
            </TabsList>

            <TabsContent value="npm">
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
{`import { BloumeID } from "@bloumeid/sdk";

const bloumeid = new BloumeID({
  apiKey: "${modalSite.publicKey}",
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL
});

const result = await bloumeid.get();
console.log(result.visitorId, result.thumbmark, result.info.dangerLevel);`}
              </pre>
            </TabsContent>

            <TabsContent value="fp">
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
{`import FingerprintJS from "@bloumeid/sdk";

// 100% Drop-in Fingerprint.com (FingerprintJS Pro) replacement
const fpPromise = FingerprintJS.load({
  apiKey: "${modalSite.publicKey}",
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL
});

const fp = await fpPromise;
const result = await fp.get({ extendedResult: true, linkedId: "user_42" });
console.log(result.visitorId, result.visitorFound, result.ipLocation);`}
              </pre>
            </TabsContent>

            <TabsContent value="react">
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
{`import { useEffect, useState } from "react";
import { BloumeID, type BloumeIDResult } from "@bloumeid/sdk";

export function useBloumeID() {
  const [identity, setIdentity] = useState<BloumeIDResult | null>(null);
  useEffect(() => {
    const client = new BloumeID({
      apiKey: "${modalSite.publicKey}",
      endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL
    });
    client.get().then(setIdentity);
  }, []);
  return identity;
}`}
              </pre>
            </TabsContent>

            <TabsContent value="script">
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
{`<script src="\${BLOUMEID_PUBLIC_URL}/sdk/v1/bloumeid.js"></script>
<script>
  const client = new window.BloumeID({
    apiKey: "${modalSite.publicKey}",
    endpoint: "\${BLOUMEID_PUBLIC_URL}"
  });
  client.get().then((res) => console.log(res.visitorId, res.requestId));
</script>`}
              </pre>
            </TabsContent>

            <TabsContent value="node">
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
{`import { BloumeIDServer } from "@bloumeid/sdk/server";

const server = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!,
  endpoint: process.env.BLOUMEID_PUBLIC_URL!
});

const verified = await server.verifyRequest(requestId);
if (verified.dangerLevel >= ${modalSite.riskThreshold} || verified.flags.isBot) {
  throw new Error("High-risk request blocked");
}`}
              </pre>
            </TabsContent>
          </Tabs>
        ) : null}
      </Dialog>
    </div>
  );
}
