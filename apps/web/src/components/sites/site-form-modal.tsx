"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PublicSiteDTO, SiteCollectorsConfig } from "@/types";

const DEFAULT_COLLECTORS: SiteCollectorsConfig = {
  webrtc: true,
  audio: true,
  canvas: true,
  webgl: true,
  fonts: true,
};

interface SiteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (site: PublicSiteDTO) => void;
}

export function SiteFormModal({ open, onOpenChange, onCreated }: SiteFormModalProps) {
  const { dict, setSelectedSiteId, triggerManualRefresh } = useI18n();
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [domainsInput, setDomainsInput] = React.useState("localhost, *.example.com");
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [riskThreshold, setRiskThreshold] = React.useState(3);
  const [config, setConfig] = React.useState<SiteCollectorsConfig>({ ...DEFAULT_COLLECTORS });
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [createdSite, setCreatedSite] = React.useState<PublicSiteDTO | null>(null);

  const resetForm = React.useCallback(() => {
    setName("");
    setDomainsInput("localhost, *.example.com");
    setWebhookUrl("");
    setRiskThreshold(3);
    setConfig({ ...DEFAULT_COLLECTORS });
    setErrorMsg(null);
    setCreatedSite(null);
  }, []);

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const domains = domainsInput
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    if (domains.length === 0) {
      setErrorMsg(dict.sites.allowedDomains);
      setSubmitting(false);
      return;
    }

    const safeThreshold = Number.isFinite(riskThreshold)
      ? Math.max(0, Math.min(5, Math.round(riskThreshold)))
      : 3;

    try {
      const res = await fetch("/api/admin/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          domains,
          webhookUrl: webhookUrl.trim() ? webhookUrl.trim() : null,
          riskThreshold: safeThreshold,
          config,
        }),
      });

      const data = (await res.json()) as { site?: PublicSiteDTO; error?: string };
      if (!res.ok || !data.site) {
        setErrorMsg(data.error ?? `HTTP ${res.status}`);
        return;
      }

      setCreatedSite(data.site);
      setSelectedSiteId(data.site.publicId);
      triggerManualRefresh();
      onCreated?.(data.site);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={createdSite ? dict.sites.siteCreatedTitle : dict.sites.createSite}
      description={createdSite ? dict.sites.siteCreatedNotice : dict.sites.subtitle}
      closeLabel={dict.common.close}
    >
      {createdSite ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{createdSite.name}</span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{dict.sites.publicKey}</Label>
            <CopyableMono
              value={createdSite.publicKey}
              copyLabel={dict.common.copy}
              copiedLabel={dict.common.copied}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{dict.sites.secretKey}</Label>
            <CopyableMono
              value={createdSite.secretKeyPlain ?? createdSite.secretKeyHint}
              copyLabel={dict.common.copy}
              copiedLabel={dict.common.copied}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => onOpenChange(false)}>
              {dict.common.close}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="identity">
            <TabsList>
              <TabsTrigger value="identity">{dict.sites.siteName}</TabsTrigger>
              <TabsTrigger value="security">{dict.sites.riskThreshold}</TabsTrigger>
              <TabsTrigger value="collectors">{dict.sites.collectorsTitle}</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="shared-site-name">{dict.sites.siteName}</Label>
                <Input
                  id="shared-site-name"
                  data-testid="new-site-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={dict.sites.siteNamePlaceholder}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shared-site-domains">{dict.sites.allowedDomains}</Label>
                <Input
                  id="shared-site-domains"
                  data-testid="new-site-domains"
                  value={domainsInput}
                  onChange={(e) => setDomainsInput(e.target.value)}
                  placeholder={dict.sites.allowedDomainsPlaceholder}
                  required
                />
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="shared-site-threshold">{dict.sites.riskThreshold}</Label>
                  <Input
                    id="shared-site-threshold"
                    type="number"
                    min={0}
                    max={5}
                    value={riskThreshold}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRiskThreshold(Number.isFinite(val) ? Math.max(0, Math.min(5, Math.round(val))) : 3);
                    }}
                  />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shared-site-webhook">{dict.sites.webhookUrl}</Label>
                <Input
                  id="shared-site-webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder={dict.sites.webhookUrlPlaceholder}
                />
              </div>
            </TabsContent>

            <TabsContent value="collectors" className="grid gap-2 pt-3 sm:grid-cols-2">
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
                    checked={config[key]}
                    ariaLabel={label}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </TabsContent>
          </Tabs>

          {errorMsg ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
              {errorMsg}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {dict.common.cancel}
            </Button>
            <Button type="submit" data-testid="create-site-btn" disabled={submitting}>
              <Plus className="h-4 w-4" />
              <span>{dict.common.create}</span>
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
