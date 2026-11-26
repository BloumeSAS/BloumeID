"use client";

import * as React from "react";
import {
  Activity,
  Code2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { PublicSiteDTO } from "@/types";

export default function SitesPage() {
  const { dict, refreshTick, selectedSiteId } = useI18n();
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "paused">("all");

  // Modals State
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDomains, setNewDomains] = React.useState("localhost, *.example.com");
  const [newWebhook, setNewWebhook] = React.useState("");
  const [newThreshold, setNewThreshold] = React.useState(3);

  const [sdkModalSite, setSdkModalSite] = React.useState<PublicSiteDTO | null>(null);
  const [keysModalSite, setKeysModalSite] = React.useState<PublicSiteDTO | null>(null);
  const [revealSecret, setRevealSecret] = React.useState(false);

  const [configModalSite, setConfigModalSite] = React.useState<PublicSiteDTO | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editDomains, setEditDomains] = React.useState("");
  const [editWebhook, setEditWebhook] = React.useState("");
  const [editThreshold, setEditThreshold] = React.useState(3);

  const [deleteModalSite, setDeleteModalSite] = React.useState<PublicSiteDTO | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const loadSites = React.useCallback(async () => {
    const res = await fetch("/api/admin/sites");
    if (res.ok) {
      const data = (await res.json()) as { sites: PublicSiteDTO[] };
      setSites(data.sites);
    }
  }, []);

  React.useEffect(() => {
    void loadSites();
  }, [loadSites, refreshTick]);

  const filteredSites = React.useMemo(() => {
    return sites.filter((s) => {
      if (selectedSiteId !== "all" && s.publicId !== selectedSiteId) return false;
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "paused" && s.isActive) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.publicKey.toLowerCase().includes(q) ||
        s.domains.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [sites, query, statusFilter, selectedSiteId]);

  const scopedSites = React.useMemo(
    () => (selectedSiteId === "all" ? sites : sites.filter((s) => s.publicId === selectedSiteId)),
    [sites, selectedSiteId],
  );
  const total24h = scopedSites.reduce((acc, s) => acc + (s.requests24h ?? 0), 0);
  const total30d = scopedSites.reduce((acc, s) => acc + (s.requests30d ?? 0), 0);
  const activeCount = scopedSites.filter((s) => s.isActive).length;

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
      setNewWebhook("");
      setCreateOpen(false);
      setSdkModalSite(data.site);
    }
  };

  const handlePatchSite = async (
    publicId: string,
    payload: Record<string, unknown>
  ): Promise<PublicSiteDTO | null> => {
    const res = await fetch("/api/admin/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, ...payload }),
    });
    if (res.ok) {
      const data = (await res.json()) as { site: PublicSiteDTO };
      setSites((prev) => prev.map((s) => (s.publicId === publicId ? data.site : s)));
      if (keysModalSite?.publicId === publicId) setKeysModalSite(data.site);
      if (configModalSite?.publicId === publicId) setConfigModalSite(data.site);
      if (payload.testWebhook) {
        setToast(dict.sites.webhookSent);
        setTimeout(() => setToast(null), 3000);
      }
      return data.site;
    }
    return null;
  };

  const openConfigModal = (site: PublicSiteDTO) => {
    setConfigModalSite(site);
    setEditName(site.name);
    setEditDomains(site.domains.join(", "));
    setEditWebhook(site.webhookUrl ?? "");
    setEditThreshold(site.riskThreshold);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModalSite) return;
    const domains = editDomains
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    await handlePatchSite(configModalSite.publicId, {
      name: editName,
      domains,
      webhookUrl: editWebhook.trim() ? editWebhook.trim() : null,
      riskThreshold: editThreshold,
    });
    setConfigModalSite(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalSite) return;
    const res = await fetch(
      `/api/admin/sites?publicId=${encodeURIComponent(deleteModalSite.publicId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setSites((prev) => prev.filter((s) => s.publicId !== deleteModalSite.publicId));
      setDeleteModalSite(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Minimalist Header + Primary "+ Create Site" Modal Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.sites.title}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{dict.sites.subtitle}</p>
        </div>

        <Button
          type="button"
          data-testid="open-create-site-modal"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span>{dict.sites.createSite}</span>
        </Button>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-500">
          {toast}
        </div>
      ) : null}

      {/* 3 Compact Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {dict.common.active}
            </CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="font-mono text-2xl font-bold">{activeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {dict.sites.requests24h}
            </CardTitle>
            <Activity className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent className="font-mono text-2xl font-bold">
            {total24h.toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {dict.sites.requests30d}
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="font-mono text-2xl font-bold">
            {total30d.toLocaleString()}
          </CardContent>
        </Card>
      </div>

      {/* Single-Site Dedicated View vs Multi-Site Grid */}
      {selectedSiteId !== "all" && scopedSites[0] ? (
        (() => {
          const site = scopedSites[0];
          return (
            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-7">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          site.isActive ? "bg-emerald-500" : "bg-muted-foreground",
                        )}
                      />
                      <CardTitle className="text-base">{site.name}</CardTitle>
                      <Badge variant={site.isActive ? "success" : "secondary"}>
                        {site.isActive ? dict.common.active : dict.common.inactive}
                      </Badge>
                    </div>
                    <CopyableMono
                      value={site.publicId}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{dict.sites.allowedDomains}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {site.domains.map((d) => (
                        <Badge key={d} variant="outline" className="font-mono text-[11px]">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setConfigModalSite(site)}>
                      <Settings2 className="h-3.5 w-3.5" />
                      <span>{dict.common.actions}</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSdkModalSite(site)}>
                      <Code2 className="h-3.5 w-3.5" />
                      <span>SDK</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteModalSite(site)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{dict.common.delete}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-5">
                <CardHeader>
                  <CardTitle className="text-base">{dict.sites.publicKey}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{dict.sites.publicKey}</Label>
                    <CopyableMono
                      value={site.publicKey}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{dict.sites.secretKey}</Label>
                    <CopyableMono
                      value="bid_sec_••••••••"
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setKeysModalSite(site)}>
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>{dict.sites.rotateKeys}</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        })()
      ) : (
        <>
          {/* Search & Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.common.search}
            className="pl-9"
          />
        </div>

        <div className="inline-flex rounded-xl border border-border bg-card p-1 text-xs">
          {(
            [
              ["all", dict.common.allSites],
              ["active", dict.common.active],
              ["paused", dict.common.inactive],
            ] as const
          ).map(([st, label]) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                "rounded-lg px-3 py-1 font-medium transition-colors",
                statusFilter === st
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clean Sites Grid (Max 3 cards per row, 100% Modal actions) */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredSites.map((site) => (
          <Card key={site.publicId} className="flex flex-col transition-colors hover:border-primary/35">
            <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      site.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                    )}
                  />
                  <span className="text-base font-bold text-foreground">{site.name}</span>
                  <CopyableMono
                    value={site.publicId}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                  <Badge variant={site.webhookUrl ? "success" : "secondary"} className="text-[11px]">
                    {site.webhookUrl ? dict.common.enabled : dict.common.disabled}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <CopyableMono
                    value={site.publicKey}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                  {site.domains.map((d) => (
                    <Badge key={d} variant="outline" className="font-mono text-[11px]">
                      {d}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="font-mono text-[11px] text-primary">
                    24h: {site.requests24h ?? 0} • 30d: {site.requests30d ?? 0}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid={`integration-btn-${site.publicId}`}
                  onClick={() => setSdkModalSite(site)}
                >
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  <span>{dict.sites.integrationModal}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRevealSecret(false);
                    setKeysModalSite(site);
                  }}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{dict.sites.publicKey}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openConfigModal(site)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>{dict.common.actions}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteModalSite(site)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
        </>
      )}

      {/* 1. CREATE SITE MODAL */}
      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={dict.sites.createSite}
        description={dict.sites.subtitle}
        closeLabel={dict.common.close}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Tabs defaultValue="identity">
            <TabsList>
              <TabsTrigger value="identity">{dict.sites.siteName}</TabsTrigger>
              <TabsTrigger value="security">{dict.sites.riskThreshold}</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-3 pt-3">
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
            </TabsContent>

            <TabsContent value="security" className="space-y-3 pt-3">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label htmlFor="site-webhook">
                  {dict.sites.webhookUrl}
                </Label>
                <Input
                  id="site-webhook"
                  value={newWebhook}
                  onChange={(e) => setNewWebhook(e.target.value)}
                  placeholder={dict.sites.webhookUrlPlaceholder}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button type="submit" data-testid="create-site-btn">
              <Plus className="h-4 w-4" />
              <span>{dict.common.create}</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 2. SDK INTEGRATION MODAL (@bloume/id) */}
      <Dialog
        open={Boolean(sdkModalSite)}
        onOpenChange={(open) => !open && setSdkModalSite(null)}
        title={dict.sites.integrationTitle}
        description={dict.sites.integrationDescription}
        closeLabel={dict.common.close}
      >
        {sdkModalSite ? (
          <Tabs defaultValue="npm">
            <TabsList className="flex-wrap">
              <TabsTrigger value="npm">{dict.sites.tabNpm}</TabsTrigger>
              <TabsTrigger value="fp">{dict.sites.tabFpPro}</TabsTrigger>
              <TabsTrigger value="script">{dict.sites.tabScript}</TabsTrigger>
              <TabsTrigger value="node">{dict.sites.tabNode}</TabsTrigger>
            </TabsList>

            <TabsContent value="npm">
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
{`import { BloumeID } from "@bloume/id";

const bloumeid = new BloumeID({
  apiKey: "${sdkModalSite.publicKey}",
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL
});

const result = await bloumeid.get();
console.log(result.visitorId, result.thumbmark, result.info.dangerLevel);`}
              </pre>
            </TabsContent>

            <TabsContent value="fp">
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
{`import FingerprintJS from "@bloume/id";

const fp = await FingerprintJS.load({
  apiKey: "${sdkModalSite.publicKey}",
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL
});
const result = await fp.get({ extendedResult: true, linkedId: "user_42" });
console.log(result.visitorId, result.visitorFound, result.ipLocation);`}
              </pre>
            </TabsContent>

            <TabsContent value="script">
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
{`<script src="\${BLOUMEID_PUBLIC_URL}/sdk/v1/bloumeid.js"></script>
<script>
  const client = new window.BloumeID({
    apiKey: "${sdkModalSite.publicKey}",
    endpoint: "\${BLOUMEID_PUBLIC_URL}"
  });
  client.get().then((res) => console.log(res.visitorId, res.requestId));
</script>`}
              </pre>
            </TabsContent>

            <TabsContent value="node">
              <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs">
{`import { BloumeIDServer } from "@bloume/id/server";

const server = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!,
  endpoint: process.env.BLOUMEID_PUBLIC_URL!
});

const verified = await server.verifyRequest(requestId);
if (verified.dangerLevel >= ${sdkModalSite.riskThreshold} || verified.flags.isBot) {
  throw new Error("High-risk request blocked");
}`}
              </pre>
            </TabsContent>
          </Tabs>
        ) : null}
      </Dialog>

      {/* 3. API KEYS & ROTATION MODAL */}
      <Dialog
        open={Boolean(keysModalSite)}
        onOpenChange={(open) => !open && setKeysModalSite(null)}
        title={keysModalSite?.name ?? dict.sites.publicKey}
        description={dict.sites.secretKeyNotice}
        closeLabel={dict.common.close}
      >
        {keysModalSite ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{dict.sites.publicKey}</p>
              <CopyableMono
                value={keysModalSite.publicKey}
                copyLabel={dict.common.copy}
                copiedLabel={dict.common.copied}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{dict.sites.secretKey}</p>
                <button
                  type="button"
                  onClick={() => setRevealSecret((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {revealSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>
                    {revealSecret ? dict.migratePage.hideSecret : dict.migratePage.revealSecret}
                  </span>
                </button>
              </div>
              <CopyableMono
                value={
                  revealSecret
                    ? keysModalSite.secretKeyPlain ?? keysModalSite.secretKeyHint
                    : "bid_sec_••••••••••••••••••••••••"
                }
                copyLabel={dict.common.copy}
                copiedLabel={dict.common.copied}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePatchSite(keysModalSite.publicId, { rotateKeys: true })}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{dict.sites.rotateKeys}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* 4. SITE CONFIGURATION & COLLECTORS MODAL */}
      <Dialog
        open={Boolean(configModalSite)}
        onOpenChange={(open) => !open && setConfigModalSite(null)}
        title={configModalSite?.name ?? dict.common.actions}
        description={dict.sites.collectorsTitle}
        closeLabel={dict.common.close}
      >
        {configModalSite ? (
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{dict.sites.siteName}</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>{dict.sites.riskThreshold}</Label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>{dict.sites.allowedDomains}</Label>
              <Input value={editDomains} onChange={(e) => setEditDomains(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <Label>
                {dict.sites.webhookUrl}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={editWebhook}
                  onChange={(e) => setEditWebhook(e.target.value)}
                  placeholder={dict.sites.webhookUrlPlaceholder}
                />
                {configModalSite.webhookUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePatchSite(configModalSite.publicId, { testWebhook: true })}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["webrtc", dict.sites.collectorWebrtc],
                  ["audio", dict.sites.collectorAudio],
                  ["canvas", dict.sites.collectorCanvas],
                  ["webgl", dict.sites.collectorWebgl],
                  ["fonts", dict.sites.collectorFonts],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2"
                >
                  <span className="text-xs">{label}</span>
                  <Switch
                    checked={configModalSite.config[key]}
                    ariaLabel={label}
                    onCheckedChange={(checked) =>
                      handlePatchSite(configModalSite.publicId, {
                        config: { ...configModalSite.config, [key]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setConfigModalSite(null)}>
                {dict.common.cancel}
              </Button>
              <Button type="submit">{dict.common.save}</Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <Dialog
        open={Boolean(deleteModalSite)}
        onOpenChange={(open) => !open && setDeleteModalSite(null)}
        title={dict.common.delete}
        description={deleteModalSite?.name ?? ""}
        closeLabel={dict.common.close}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => setDeleteModalSite(null)}>
            {dict.common.cancel}
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirmDelete}>
            <Trash2 className="h-4 w-4" />
            <span>{dict.common.delete}</span>
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
