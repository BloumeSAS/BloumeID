"use client";

import * as React from "react";
import { Check, Copy, Eye, EyeOff, Wand2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PublicSiteDTO } from "@/types";

export default function MigratePage() {
  const { dict } = useI18n();
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState("");
  const [sourceTool, setSourceTool] = React.useState("ThumbmarkJS (OSS / Pro)");
  const [targetStack, setTargetStack] = React.useState("Auto-détection dans le repo");
  const [includeWebhook, setIncludeWebhook] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/sites")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { sites?: PublicSiteDTO[] } | null) => {
        if (data?.sites && data.sites.length > 0) {
          setSites(data.sites);
          setSelectedSiteId(data.sites[0]!.publicId);
        }
      })
      .catch(() => undefined);
  }, []);

  const activeSite = sites.find((s) => s.publicId === selectedSiteId) ?? sites[0];
  const pubKey = activeSite?.publicKey ?? "bid_pub_demo_cosmic_night_2026";
  const secKey = activeSite?.secretKeyPlain ?? activeSite?.secretKeyHint ?? "bid_sec_...";
  const whSecret = activeSite?.webhookSecret ?? "whsec_bloumeid_cosmic_secret_2026";
  const endpointUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const generatedPrompt = React.useMemo(() => {
    const webhookSection = includeWebhook
      ? `4. **Webhook Récepteur Sécurisé (OBLIGATOIRE)** :
   - Crée une route backend \`POST /api/webhooks/bloumeid\`.
   - Vérifie cryptographiquement l'en-tête \`X-BloumeID-Signature\` (\`sha256=<hmac>\`) en temps constant (\`crypto.timingSafeEqual\`) avec le secret \`${whSecret}\`.
   - Traite les alertes lorsque \`dangerLevel >= ${activeSite?.riskThreshold ?? 3}\` ou \`flags.isBot === true\`.`
      : `4. **Aucun Webhook** :
   - N'installe AUCUNE route webhook. Utilise uniquement l'appel SDK client et la vérification serveur directe via \`BloumeIDServer.verifyRequest(requestId)\`.`;

    return `# MISSION : Migration vers @bloume/id v1.0.0 (BloumeID Self-Hosted)

- **Outil source à remplacer :** ${sourceTool}
- **Stack cible :** ${targetStack}
- **Instance BloumeID :** ${endpointUrl}
- **Public Key (Client) :** \`${pubKey}\`
- **Secret Key (Serveur) :** \`${secKey}\`

## Étapes à exécuter dans ce dépôt :
1. **Scan du dépôt :** Recherche tous les imports et appels à l'ancienne bibliothèque (\`@thumbmarkjs/thumbmarkjs\`, \`@fingerprintjs/fingerprintjs\`, \`@fingerprintjs/fingerprintjs-pro\`, \`creepjs\`, etc.).
2. **Mise à jour des dépendances :** Désinstalle l'ancien package et installe \`@bloume/id\` (\`pnpm add @bloume/id\` ou \`npm i @bloume/id\`).
3. **Remplacement Frontend & Backend :**
   - Frontend : Initialise \`new BloumeID({ apiKey: "${pubKey}", endpoint: "${endpointUrl}" })\` (ou \`FingerprintJS.load({ apiKey: "${pubKey}", endpoint: "${endpointUrl}" })\`) et récupère \`visitorId\`, \`requestId\`, \`info.dangerLevel\`.
   - Backend : Utilise \`import { BloumeIDServer } from "@bloume/id/server"\` avec \`secretKey: process.env.BLOUMEID_SECRET_KEY\` pour appeler \`verifyRequest(requestId)\`.
${webhookSection}
5. **Exemple complet de réponse API \`@bloume/id\` (\`BloumeIDResult\`) pour adapter ton mapping :**
\`\`\`json
{
  "visitorId": "vis_251505519892631552",
  "thumbmark": "fb964b2fcb3e1d6e5ba469c2182c7e8eed4039617fd8bf056add82077ad6a963",
  "hardwareHash": "eb1b20cae6d7e451f70fb6e1d97180f415d52bc62a2ddd0e9e464cf3ea73f84b",
  "requestId": "req_251566900457246720",
  "visitorFound": true,
  "confidence": { "score": 0.99 },
  "incognito": false,
  "browserName": "Chrome",
  "os": "Windows",
  "device": "Desktop",
  "ip": "82.64.12.34",
  "ipLocation": {
    "country": { "code": "FR", "name": "France" },
    "city": { "name": "Paris" },
    "asn": { "asn": "3215", "name": "Orange S.A." }
  },
  "info": {
    "dangerLevel": 0,
    "action": "allow",
    "isVpn": false,
    "isTor": false,
    "isProxy": false,
    "isDatacenter": false,
    "isBot": false,
    "isSpoofed": false,
    "isIncognito": false,
    "crossBrowserMatched": false,
    "collectorCount": 104
  }
}
\`\`\`
6. **Vérification :** Exécute \`typecheck\`, \`lint\` et \`build\` pour confirmer zéro erreur TypeScript.`;
  }, [sourceTool, targetStack, includeWebhook, endpointUrl, pubKey, secKey, whSecret, activeSite?.riskThreshold]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <Wand2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {dict.migratePage.title}
          </h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {dict.migratePage.subtitle}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">{dict.common.viewConfig}</CardTitle>
            <CardDescription>{dict.migratePage.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mig-source">{dict.migratePage.sourceTool}</Label>
              <select
                id="mig-source"
                value={sourceTool}
                onChange={(e) => setSourceTool(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
              >
                <option value="ThumbmarkJS (OSS / Pro)">ThumbmarkJS (OSS / Pro)</option>
                <option value="Fingerprint.com (FingerprintJS Pro)">
                  Fingerprint.com (FingerprintJS Pro)
                </option>
                <option value="CreepJS / ClientJS">CreepJS / ClientJS</option>
                <option value="Autre / Détection automatique">
                  Autre / Détection automatique
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mig-site">{dict.migratePage.targetSite}</Label>
              <select
                id="mig-site"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
              >
                {sites.map((s) => (
                  <option key={s.publicId} value={s.publicId}>
                    {s.name} ({s.publicId})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mig-stack">{dict.migratePage.targetStack}</Label>
              <select
                id="mig-stack"
                value={targetStack}
                onChange={(e) => setTargetStack(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
              >
                <option value="Auto-détection dans le repo">Auto-détection dans le repo</option>
                <option value="Next.js (App Router)">Next.js (App Router)</option>
                <option value="React / Vite">React / Vite</option>
                <option value="Node.js / NestJS / Express">Node.js / NestJS / Express</option>
                <option value="PHP / Laravel">PHP / Laravel</option>
              </select>
            </div>

            {/* Mandatory Yes / No Webhook Choice */}
            <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
              <p className="text-xs font-semibold text-foreground">
                {dict.migratePage.webhookQuestion}
              </p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setIncludeWebhook(true)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                    includeWebhook
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {dict.migratePage.webhookYes}
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeWebhook(false)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                    !includeWebhook
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {dict.migratePage.webhookNo}
                </button>
              </div>
            </div>

            {/* Keys Preview */}
            <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
              <div>
                <p className="text-[11px] text-muted-foreground">{dict.sites.publicKey}</p>
                <CopyableMono
                  value={pubKey}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">{dict.sites.secretKey}</p>
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>
                      {showSecret ? dict.migratePage.hideSecret : dict.migratePage.revealSecret}
                    </span>
                  </button>
                </div>
                <p className="mt-1 font-mono text-xs text-foreground">
                  {showSecret ? secKey : "bid_sec_••••••••••••••••••••••••"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{dict.migratePage.promptTitle}</CardTitle>
              <Badge variant="outline" className="mt-1 font-mono text-[10px] text-primary">
                @bloume/id v1.0.0
              </Badge>
            </div>
            <Button type="button" size="sm" onClick={handleCopyPrompt}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? dict.common.copied : dict.migratePage.copyPrompt}</span>
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[540px] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs leading-relaxed text-foreground">
              {generatedPrompt}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

