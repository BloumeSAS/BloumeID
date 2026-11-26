"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  Cpu,
  ExternalLink,
  Github,
  Globe,
  Layers,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { BloumeID, type BloumeIDResult } from "@bloume/id";
import { useI18n } from "@/i18n/provider";
import { APP_VERSION, APP_VERSION_TAG } from "@/lib/version";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEMO_PUBLIC_KEY = "bid_pub_demo_cosmic_night_2026";
const GITHUB_REPO_URL = "https://github.com/BloumeSAS/BloumeID";
const NPM_URL = "https://www.npmjs.com/package/@bloume/id";
const BLOUME_URL = "https://bloume.fr";

export default function LandingPage() {
  const { locale, setLocale, theme, toggleTheme, dict } = useI18n();
  const [result, setResult] = React.useState<BloumeIDResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [elapsedMs, setElapsedMs] = React.useState<number>(0);
  const [jsonFormat, setJsonFormat] = React.useState<"thumbmark" | "fpjs" | "raw">("thumbmark");
  const [mockupApiFormat, setMockupApiFormat] = React.useState<"thumbmark" | "fpjs">("thumbmark");
  const [jsonCopied, setJsonCopied] = React.useState(false);
  const [cmdCopied, setCmdCopied] = React.useState(false);
  const [deployCopied, setDeployCopied] = React.useState(false);
  const [deployTab, setDeployTab] = React.useState<"coolify" | "docker" | "sdk">("coolify");
  const scannerRef = React.useRef<HTMLElement | null>(null);

  const runLiveScan = React.useCallback(async () => {
    setLoading(true);
    const t0 = performance.now();
    try {
      const client = new BloumeID({
        apiKey: DEMO_PUBLIC_KEY,
        endpoint: "/api/v1/fingerprint",
        options: { timeout: 4000 },
      });
      const res = await client.get({ tag: "landing_live_inspector" });
      setResult(res);
    } catch {
      // Fallback gracefully if offline
    } finally {
      setElapsedMs(Math.round(performance.now() - t0));
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void runLiveScan();
  }, [runLiveScan]);

  const scrollToScanner = () => {
    scannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    void runLiveScan();
  };

  const formattedJson = React.useMemo(() => {
    if (!result) return "{}";
    if (jsonFormat === "thumbmark") {
      return JSON.stringify(
        {
          visitorId: result.visitorId,
          thumbmark: result.thumbmark,
          components: {
            audio: result.components?.audio ?? null,
            canvas: result.components?.canvas ?? null,
            fonts: result.components?.fonts ?? null,
            hardware: result.components?.hardware ?? null,
            math: result.components?.math ?? null,
            screen: result.components?.screen ?? null,
            webgl: result.components?.webgl ?? null,
            webrtc: result.components?.webrtc ?? null,
            speech: result.components?.speech ?? null,
          },
          info: {
            ip_address: {
              ip_address: result.info?.ipAddress ?? "127.0.0.1",
              autonomous_system_number: result.info?.asnNumber ?? null,
              ip_version: "v4",
            },
            classification: {
              tor: result.info?.isTor ?? false,
              vpn: result.info?.isVpn ?? false,
              datacenter: result.info?.isDatacenter ?? false,
              danger_level: result.info?.dangerLevel ?? 0,
              bot: result.info?.isBot ?? false,
            },
            uniqueness: {
              score: Math.round((result.confidence?.score ?? 0.99) * 100),
            },
            country: {
              iso_code: result.info?.country ?? "FR",
            },
            visitor: {
              id: result.visitorId,
              isNew: !result.visitorFound,
              firstSeen: result.firstSeenAt?.global ?? null,
              lastSeen: result.lastSeenAt?.global ?? null,
            },
          },
          version: APP_VERSION,
          requestId: result.requestId,
        },
        null,
        2,
      );
    }
    if (jsonFormat === "fpjs") {
      return JSON.stringify(
        {
          requestId: result.requestId,
          visitorId: result.visitorId,
          visitorFound: result.visitorFound,
          confidence: result.confidence,
          ip: result.info?.ipAddress ?? "127.0.0.1",
          ipLocation: {
            country: { code: result.info?.country ?? "FR" },
            city: { name: result.info?.city ?? "Paris" },
          },
          vpn: { result: result.info?.isVpn ?? false },
          tor: { result: result.info?.isTor ?? false },
          bot: { result: result.info?.isBot ? "bad" : "notDetected" },
          tampering: { result: result.info?.isSpoofed ?? false },
        },
        null,
        2,
      );
    }
    return JSON.stringify(result, null, 2);
  }, [result, jsonFormat]);

  const deploySnippet = React.useMemo(() => {
    if (deployTab === "coolify") {
      return `# Coolify 1-Click Dockerfile Buildpack
# 1. New Resource -> Public Repository -> https://github.com/BloumeSAS/BloumeID
# 2. Build Pack: Dockerfile
# 3. Set ADMIN_MASTER_KEY & DATABASE_URL -> Deploy`;
    }
    if (deployTab === "docker") {
      return `git clone https://github.com/BloumeSAS/BloumeID.git
cd BloumeID
docker compose up -d --build`;
    }
    return `pnpm add @bloume/id

import { BloumeID } from "@bloume/id";
const client = new BloumeID({ apiKey: "bid_pub_...", endpoint: "https://id.bloume.fr/api/v1/fingerprint" });
const res = await client.get({ tag: "checkout" });`;
  }, [deployTab]);

  const mockupSampleJson = React.useMemo(() => {
    if (mockupApiFormat === "thumbmark") {
      return `{
  "visitorId": "vis_251505519892631552",
  "thumbmark": "fb964b2fcb3e1d6e5ba469c2182c7e8e",
  "info": {
    "classification": { "tor": false, "vpn": false, "bot": false, "danger_level": 0 },
    "uniqueness": { "score": 99 },
    "country": { "iso_code": "FR" }
  },
  "version": "${APP_VERSION}"
}`;
    }
    return `{
  "requestId": "req_251566900457246720",
  "visitorId": "vis_251505519892631552",
  "visitorFound": true,
  "confidence": { "score": 0.99, "revision": "${APP_VERSION}" },
  "vpn": { "result": false },
  "tor": { "result": false },
  "bot": { "result": "notDetected" }
}`;
  }, [mockupApiFormat]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Subtle julesb.dev architectural grid + radial halo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:40px_40px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-10%,hsl(var(--primary)/0.20),transparent)]"
      />

      {/* 1. Floating Minimalist Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link href="/">
              <BrandLogo variant="full" size="md" />
            </Link>
            <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex">
              {APP_VERSION_TAG} Open Source
            </Badge>
          </div>

          <nav className="hidden items-center gap-6 text-xs font-medium text-muted-foreground lg:flex">
            <a href="#preview" className="transition-colors hover:text-foreground">
              Aperçu du Panel
            </a>
            <a href="#scanner" className="transition-colors hover:text-foreground">
              Test Live SDK
            </a>
            <a href="#architecture" className="transition-colors hover:text-foreground">
              Architecture
            </a>
            <a href="#compare" className="transition-colors hover:text-foreground">
              Comparatif
            </a>
            <a href="#deploy" className="transition-colors hover:text-foreground">
              Déploiement
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 font-mono text-xs"
              onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
            >
              {locale.toUpperCase()}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Link href="/dashboard">
              <Button size="sm" className="h-8 text-xs">
                <span>Console Admin</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-24 px-4 py-12 sm:px-6 sm:py-16">
        {/* 2. Hero Split-Screen */}
        <section id="preview" className="grid items-center gap-10 lg:grid-cols-12">
          {/* Left Column: Editorial & Conversion */}
          <div className="space-y-6 lg:col-span-6">
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] text-primary"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
              <span>100 % Open Source • Self-Hosted • @bloume/id {APP_VERSION_TAG}</span>
            </Badge>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl sm:leading-[1.1]">
              Identification d&apos;Appareils à 104 Signaux. 100 % Self-Hosted.
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Alternative souveraine et gratuite à <strong>Fingerprint.com</strong> et{" "}
              <strong>ThumbmarkJS Pro</strong>, avec réconciliation cross-browser, bases MaxMind
              GeoLite2 &amp; 54 000+ CIDR auto-synchronisées et zéro frais par requête.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button size="lg" onClick={scrollToScanner} className="gap-2">
                <Activity className="h-4 w-4" />
                <span>Tester mon navigateur en direct</span>
              </Button>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Explorer la Console Admin</span>
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText("pnpm add @bloume/id");
                  setCmdCopied(true);
                  setTimeout(() => setCmdCopied(false), 2000);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <span className="text-primary">$</span>
                <span>pnpm add @bloume/id</span>
                {cmdCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-5 text-xs">
              <div>
                <p className="font-mono text-base font-bold text-foreground">104 Signaux</p>
                <p className="text-muted-foreground">Déterministes</p>
              </div>
              <div>
                <p className="font-mono text-base font-bold text-foreground">&lt; 1 ms</p>
                <p className="text-muted-foreground">Lookup CIDR / GeoIP</p>
              </div>
              <div>
                <p className="font-mono text-base font-bold text-emerald-500">0 € / Illimité</p>
                <p className="text-muted-foreground">Licence MIT</p>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Interactive Panel Mockup */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur">
              {/* macOS Window Titlebar */}
              <div className="flex items-center justify-between border-b border-border/70 bg-secondary/40 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  id.bloume.fr — BloumeID Console {APP_VERSION_TAG}
                </span>
                <Badge variant="outline" className="font-mono text-[10px] text-emerald-500">
                  LIVE
                </Badge>
              </div>

              {/* Interactive Mockup Tabs */}
              <div className="p-4">
                <Tabs defaultValue="overview">
                  <TabsList className="mb-4 grid w-full grid-cols-3">
                    <TabsTrigger value="overview" className="text-xs">
                      Vue Overview
                    </TabsTrigger>
                    <TabsTrigger value="signals" className="text-xs">
                      Smart Signals
                    </TabsTrigger>
                    <TabsTrigger value="api" className="text-xs">
                      SDK &amp; API JSON
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-3">
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="rounded-xl border border-border bg-secondary/20 p-3">
                        <p className="text-[11px] text-muted-foreground">Identifications</p>
                        <p className="mt-1 font-mono text-lg font-bold">142.8k</p>
                      </div>
                      <div className="rounded-xl border border-border bg-secondary/20 p-3">
                        <p className="text-[11px] text-muted-foreground">Précision</p>
                        <p className="mt-1 font-mono text-lg font-bold text-emerald-500">99.2 %</p>
                      </div>
                      <div className="rounded-xl border border-border bg-secondary/20 p-3">
                        <p className="text-[11px] text-muted-foreground">Menaces bloquées</p>
                        <p className="mt-1 font-mono text-lg font-bold text-rose-500">1 840</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/15 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-primary" />
                          <span>Top Réseaux &amp; ASN (GeoLite2)</span>
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">24h</span>
                      </div>
                      {[
                        { name: "Orange S.A. (AS3215)", pct: 46, color: "bg-primary" },
                        { name: "Free SAS (AS12322)", pct: 28, color: "bg-sky-500" },
                        { name: "Hetzner Online (AS24940 · DC)", pct: 14, color: "bg-amber-500" },
                      ].map((row) => (
                        <div key={row.name} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-mono text-foreground">{row.name}</span>
                            <span className="font-mono text-muted-foreground">{row.pct}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div className={`h-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="signals" className="space-y-3">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3 text-xs">
                        <span>Bot / AI Agent</span>
                        <Badge variant="success">Clean</Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3 text-xs">
                        <span>VPN / Tor Exit</span>
                        <Badge variant="destructive">Détecté</Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3 text-xs">
                        <span>Prototype Tampering</span>
                        <Badge variant="success">Protégé</Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-3 text-xs">
                        <span>Cross-Browser Match</span>
                        <Badge variant="outline">hardwareHash</Badge>
                      </div>
                    </div>
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-rose-400">
                          Rule: Block Tor Exit Nodes
                        </span>
                        <Badge variant="destructive">ACTION: BLOCK</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        if (isTor === true) → HTTP 403 + Webhook HMAC
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="api" className="space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={mockupApiFormat === "thumbmark" ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setMockupApiFormat("thumbmark")}
                      >
                        ThumbmarkJS
                      </Button>
                      <Button
                        size="sm"
                        variant={mockupApiFormat === "fpjs" ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setMockupApiFormat("fpjs")}
                      >
                        Fingerprint.com
                      </Button>
                    </div>
                    <pre className="max-h-[220px] overflow-auto rounded-xl border border-border bg-background/90 p-3 font-mono text-[11px] leading-relaxed">
                      {mockupSampleJson}
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Live Browser Scanner */}
        <section id="scanner" ref={scannerRef} className="scroll-mt-20 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <h2 className="text-2xl font-bold tracking-tight">
                  Banc d&apos;Essai Live (@bloume/id)
                </h2>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {loading ? "..." : `${elapsedMs} ms · 104 signaux`}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Analyse réelle exécutée localement dans votre navigateur sans cookie ni appel tiers.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void runLiveScan()} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Relancer l&apos;analyse</span>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Visual Diagnostic Cards */}
            <div className="space-y-3 lg:col-span-5">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-[11px] font-medium text-muted-foreground">Visitor ID (Snowflake)</p>
                <div className="mt-1">
                  <CopyableMono
                    value={result?.visitorId ?? "vis_loading..."}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <p className="text-[11px] text-muted-foreground">Full Hash</p>
                  <div className="mt-1">
                    <CopyableMono
                      value={result?.thumbmark ? `${result.thumbmark.slice(0, 14)}...` : "..."}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <p className="text-[11px] text-muted-foreground">Hardware Hash</p>
                  <div className="mt-1">
                    <CopyableMono
                      value={result?.hardwareHash ? `${result.hardwareHash.slice(0, 14)}...` : "..."}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <p className="text-[11px] text-muted-foreground">Risque &amp; Confiance</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="font-mono text-lg font-bold">
                      {result?.info?.dangerLevel ?? 0} / 5
                    </span>
                    <Badge
                      variant={
                        result?.info?.dangerLevel && result.info.dangerLevel >= 3
                          ? "destructive"
                          : "success"
                      }
                    >
                      {Math.round((result?.confidence?.score ?? 0.99) * 100)}%
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <p className="text-[11px] text-muted-foreground">OS &amp; Navigateur</p>
                  <p className="mt-1.5 truncate font-mono text-xs font-semibold">
                    {result ? `${result.browserName} · ${result.os}` : "..."}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5">
                <p className="text-xs font-semibold text-primary">GPU WebGL2 &amp; Verdicts</p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {result?.components?.webgl?.renderer ?? "WebGL2 Renderer"}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge variant={result?.info?.isVpn ? "warning" : "secondary"}>
                    VPN: {result?.info?.isVpn ? "Yes" : "No"}
                  </Badge>
                  <Badge variant={result?.info?.isTor ? "destructive" : "secondary"}>
                    Tor: {result?.info?.isTor ? "Yes" : "No"}
                  </Badge>
                  <Badge variant={result?.info?.isBot ? "destructive" : "secondary"}>
                    Bot: {result?.info?.isBot ? "Yes" : "No"}
                  </Badge>
                  <Badge variant={result?.info?.isSpoofed ? "destructive" : "secondary"}>
                    Spoofed: {result?.info?.isSpoofed ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Right: Terminal / Code Inspector */}
            <Card className="border-border/80 bg-card/90 lg:col-span-7">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60 py-3">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={jsonFormat === "thumbmark" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setJsonFormat("thumbmark")}
                  >
                    Réponse ThumbmarkJS
                  </Button>
                  <Button
                    size="sm"
                    variant={jsonFormat === "fpjs" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setJsonFormat("fpjs")}
                  >
                    Réponse Fingerprint.com
                  </Button>
                  <Button
                    size="sm"
                    variant={jsonFormat === "raw" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setJsonFormat("raw")}
                  >
                    104 Signaux Bruts
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(formattedJson);
                    setJsonCopied(true);
                    setTimeout(() => setJsonCopied(false), 2000);
                  }}
                >
                  {jsonCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{jsonCopied ? dict.common.copied : dict.common.copy}</span>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="max-h-[360px] overflow-auto p-4 font-mono text-xs leading-relaxed">
                  {formattedJson}
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4. Architecture 3-Step Pipeline */}
        <section id="architecture" className="scroll-mt-20 space-y-6">
          <div className="text-center">
            <Badge variant="outline" className="mb-2 font-mono text-[11px]">
              <Layers className="mr-1.5 h-3.5 w-3.5 text-primary" />
              <span>Pipeline Edge-to-Core</span>
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Architecture Souveraine en 3 Étapes
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <Cpu className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">1. Collecte Navigateur (@bloume/id)</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  104 signaux matériels, WebGL2, WebGPU, OfflineAudioContext, polices OS &amp; sondes
                  anti-prototype hooks en &lt; 40 ms, sans dépendance runtime.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  2. Intelligence Edge &amp; Trie CIDR (&lt; 1 ms)
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Résolution locale MaxMind GeoLite2 `.mmdb` + 54 000+ plages VPN/Tor/Datacenter
                  auto-actualisées en mémoire sans aucun appel API externe.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <ShieldAlert className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  3. Identité Persistante &amp; Rule Engine
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Réconciliation 3 niveaux (`fullHash` + `hardwareHash`/`subnet`), décisions `allow /
                  challenge / block` et Webhooks HMAC-SHA256 optionnels.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* 5. Technical Comparison Table */}
        <section id="compare" className="scroll-mt-20 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Comparatif Technique Réel
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              BloumeID {APP_VERSION_TAG} face aux solutions propriétaires et bibliothèques client-only.
            </p>
          </div>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Critère Technique</th>
                    <th className="px-4 py-3 font-semibold text-primary">
                      BloumeID {APP_VERSION_TAG}
                    </th>
                    <th className="px-4 py-3 font-medium">Fingerprint.com (Pro)</th>
                    <th className="px-4 py-3 font-medium">ThumbmarkJS (OSS / Pro)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3 font-medium">Licence &amp; Hébergement</td>
                    <td className="px-4 py-3 text-emerald-500">
                      <Check className="mr-1 inline h-4 w-4" />
                      MIT · 100% Self-Hosted (Docker)
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">SaaS Propriétaire (Cloud)</td>
                    <td className="px-4 py-3 text-muted-foreground">MIT (Client) / SaaS (Pro)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Coût (1M requêtes / mois)</td>
                    <td className="px-4 py-3 font-semibold text-emerald-500">0 € (Illimité)</td>
                    <td className="px-4 py-3 text-muted-foreground">~200 $ – 1 000 $+ / mois</td>
                    <td className="px-4 py-3 text-muted-foreground">0 € (OSS) / Payant (Pro)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Signaux &amp; Anti-Hook</td>
                    <td className="px-4 py-3 text-emerald-500">
                      <Check className="mr-1 inline h-4 w-4" />
                      104 signaux + détection prototype
                    </td>
                    <td className="px-4 py-3">Propriétaire (~100+ signaux)</td>
                    <td className="px-4 py-3 text-muted-foreground">~35 signaux</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">GeoIP &amp; Threat Intel</td>
                    <td className="px-4 py-3 text-emerald-500">
                      <Check className="mr-1 inline h-4 w-4" />
                      GeoLite2 + 54 000+ CIDR Radix (&lt; 1 ms)
                    </td>
                    <td className="px-4 py-3">
                      <Check className="mr-1 inline h-4 w-4 text-emerald-500" />
                      Inclus (Smart Signals)
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <X className="mr-1 inline h-4 w-4 text-destructive" />
                      Non inclus en OSS
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Réconciliation Cross-Browser</td>
                    <td className="px-4 py-3 text-emerald-500">
                      <Check className="mr-1 inline h-4 w-4" />
                      Hardware Hash + Subnet
                    </td>
                    <td className="px-4 py-3">
                      <Check className="mr-1 inline h-4 w-4 text-emerald-500" />
                      Inclus (Smart Signals)
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <X className="mr-1 inline h-4 w-4 text-destructive" />
                      Non inclus en OSS
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Rule Engine SOC &amp; Webhooks</td>
                    <td className="px-4 py-3 text-emerald-500">
                      <Check className="mr-1 inline h-4 w-4" />
                      Block / Challenge / Flag + HMAC-SHA256
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">Plan Enterprise uniquement</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <X className="mr-1 inline h-4 w-4 text-destructive" />
                      Non inclus
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Compatibilité SDK Drop-in</td>
                    <td className="px-4 py-3 text-emerald-500">
                      <Check className="mr-1 inline h-4 w-4" />
                      Dual Schema (ThumbmarkJS + FPJS)
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">SDK Propriétaire</td>
                    <td className="px-4 py-3 text-muted-foreground">SDK Propriétaire</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* 6. 1-Click Deployment Terminal */}
        <section id="deploy" className="scroll-mt-20">
          <Card className="border-primary/25 bg-card/90">
            <CardHeader className="flex flex-col gap-3 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Déploiement &amp; Intégration Rapide</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  PostgreSQL 17 + Valkey 8 + Next.js 16 Standalone prêts en production.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant={deployTab === "coolify" ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setDeployTab("coolify")}
                >
                  Coolify 1-Clic
                </Button>
                <Button
                  size="sm"
                  variant={deployTab === "docker" ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setDeployTab("docker")}
                >
                  Docker Compose
                </Button>
                <Button
                  size="sm"
                  variant={deployTab === "sdk" ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setDeployTab("sdk")}
                >
                  SDK @bloume/id
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(deploySnippet);
                    setDeployCopied(true);
                    setTimeout(() => setDeployCopied(false), 2000);
                  }}
                >
                  {deployCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{deployCopied ? dict.common.copied : dict.common.copy}</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <pre className="overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
                {deploySnippet}
              </pre>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <BrandLogo variant="full" size="sm" showVersion />
            <span>
              · © 2026 Dev by{" "}
              <a
                href={BLOUME_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Bloume SAS
              </a>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#preview" className="transition-colors hover:text-foreground">
              Aperçu
            </a>
            <a href="#scanner" className="transition-colors hover:text-foreground">
              Live Scanner
            </a>
            <a href="#compare" className="transition-colors hover:text-foreground">
              Comparatif
            </a>
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Console Admin
            </Link>
            <a
              href={NPM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <span>npm @bloume/id</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
