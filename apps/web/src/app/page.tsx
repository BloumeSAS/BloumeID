"use client";

import * as React from "react";
import Link from "next/link";
import { BloumeID, type BloumeIDResult } from "@bloumeid/sdk";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Fingerprint,
  GitBranch,
  Globe,
  Layers,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEMO_PUBLIC_KEY = "bid_pub_demo_cosmic_night_2026";
const GITHUB_REPO_URL = "https://github.com/bloume-sas/bloumeid";

export default function OpenSourceHomePage() {
  const { dict, locale, setLocale } = useI18n();
  const [liveResult, setLiveResult] = React.useState<BloumeIDResult | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [activeCidrs, setActiveCidrs] = React.useState<number>(54133);

  const runLiveScan = React.useCallback(async () => {
    setScanning(true);
    try {
      const sdk = new BloumeID({
        apiKey: DEMO_PUBLIC_KEY,
        endpoint: typeof window !== "undefined" ? window.location.origin : "",
      });
      const res = await sdk.get();
      setLiveResult(res);
    } finally {
      setScanning(false);
    }
  }, []);

  React.useEffect(() => {
    void runLiveScan();
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { threatTrieCidrs?: number } | null) => {
        if (data?.threatTrieCidrs && data.threatTrieCidrs > 0) {
          setActiveCidrs(data.threatTrieCidrs);
        }
      })
      .catch(() => undefined);
  }, [runLiveScan]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Cosmic Radial Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[540px] w-[960px] -translate-x-1/2 rounded-full bg-primary/15 blur-[150px]" />
        <div className="absolute top-[750px] -left-40 h-[420px] w-[520px] rounded-full bg-sky-500/10 blur-[140px]" />
        <div className="absolute top-[1350px] -right-40 h-[440px] w-[540px] rounded-full bg-purple-600/10 blur-[150px]" />
      </div>

      {/* Top Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/40">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">{dict.common.brandName}</span>
              <Badge variant="outline" className="border-primary/40 font-mono text-[10px] text-primary">
                v0.1.0 MIT
              </Badge>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#live-scanner" className="transition-colors hover:text-foreground">
              {dict.landing.navLiveDemo}
            </a>
            <a href="#architecture" className="transition-colors hover:text-foreground">
              {dict.landing.navFeatures}
            </a>
            <a href="#why-bloumeid" className="transition-colors hover:text-foreground">
              {dict.landing.navComparison}
            </a>
            <a href="#self-host" className="transition-colors hover:text-foreground">
              {dict.landing.navInstall}
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {dict.landing.navGithub}
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="landing-locale-switcher"
              onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{locale.toUpperCase()}</span>
            </Button>

            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="hidden sm:inline-flex">
              <Button type="button" variant="secondary" size="sm">
                <GitBranch className="h-3.5 w-3.5" />
                <span>{dict.landing.ctaSecondary}</span>
              </Button>
            </a>

            <Link href="/dashboard">
              <Button type="button" size="sm" data-testid="landing-admin-cta">
                <Shield className="h-3.5 w-3.5" />
                <span>{dict.landing.navAdminConsole}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        {/* HERO SECTION */}
        <section className="pt-16 pb-14 text-center md:pt-24">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{dict.landing.heroBadge}</span>
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            <span className="block text-foreground">{dict.landing.heroTitleLine1}</span>
            <span className="mt-1 block bg-gradient-to-r from-primary via-purple-300 to-sky-400 bg-clip-text font-serif italic text-transparent">
              {dict.landing.heroTitleLine2}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {dict.landing.heroSubtitle}
          </p>

          {/* Hero CTAs + Quick Copy Commands */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="h-11 px-7 text-sm font-semibold shadow-lg shadow-primary/25">
                <span>{dict.landing.ctaPrimary}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              <Button variant="outline" size="lg" className="h-11 px-6 text-sm font-semibold">
                <GitBranch className="h-4 w-4 text-primary" />
                <span>{dict.landing.ctaSecondary}</span>
              </Button>
            </a>

            <CopyableMono
              value={dict.landing.npmCommand}
              displayValue={`$ ${dict.landing.npmCommand}`}
              copyLabel={dict.common.copy}
              copiedLabel={dict.common.copied}
              className="h-11 px-4 text-sm"
            />
          </div>

          {/* 4 Live KPI Pillars */}
          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="border-border/80 bg-card/60 backdrop-blur-md">
              <CardContent className="pt-6 text-center">
                <p className="font-mono text-3xl font-extrabold text-primary">
                  {dict.landing.statCollectors}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{dict.landing.statCollectorsLabel}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/60 backdrop-blur-md">
              <CardContent className="pt-6 text-center">
                <p className="font-mono text-3xl font-extrabold text-sky-400">
                  {activeCidrs.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{dict.landing.statCidrsLabel}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/60 backdrop-blur-md">
              <CardContent className="pt-6 text-center">
                <p className="font-mono text-3xl font-extrabold text-emerald-400">
                  {dict.landing.statBundleSize}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{dict.landing.statBundleSizeLabel}</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/60 backdrop-blur-md">
              <CardContent className="pt-6 text-center">
                <p className="font-mono text-3xl font-extrabold text-amber-400">
                  {dict.landing.statLatency}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{dict.landing.statLatencyLabel}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* INTERACTIVE LIVE IN-BROWSER FINGERPRINT SCANNER (Inspired by trycap.dev live demo) */}
        <section id="live-scanner" className="py-10">
          <Card className="overflow-hidden border-primary/35 bg-card/85 shadow-2xl shadow-primary/10 backdrop-blur-xl">
            <CardHeader className="border-b border-border/80 bg-secondary/35 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="font-mono text-xs font-semibold tracking-wider text-primary">
                      {dict.landing.liveWidgetBadge}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{dict.landing.liveWidgetTitle}</CardTitle>
                  <CardDescription>{dict.landing.liveWidgetSubtitle}</CardDescription>
                </div>

                <div className="flex items-center gap-3">
                  {liveResult ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {liveResult.info.durationMs} ms • {liveResult.info.collectorCount} signals
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    data-testid="landing-rescan-btn"
                    onClick={runLiveScan}
                    disabled={scanning}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} />
                    <span>{scanning ? dict.playground.running : dict.landing.liveRescan}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {liveResult ? (
                <>
                  {/* Top Identity Bar: Visitor Snowflake, Thumbmark, HardwareHash & Risk Verdict */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        {dict.playground.visitorIdLabel}
                      </p>
                      <div className="mt-2">
                        <CopyableMono
                          value={liveResult.visitorId}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                          className="text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/25 p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        {dict.playground.thumbmarkLabel}
                      </p>
                      <div className="mt-2">
                        <CopyableMono
                          value={liveResult.thumbmark}
                          displayValue={`${liveResult.thumbmark.slice(0, 18)}...`}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/25 p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        {dict.visitors.hardwareHash}
                      </p>
                      <div className="mt-2">
                        <CopyableMono
                          value={liveResult.hardwareHash}
                          displayValue={`${liveResult.hardwareHash.slice(0, 18)}...`}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/25 p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        {dict.playground.dangerGaugeLabel}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-xl font-bold text-foreground">
                          {liveResult.info.dangerLevel} / 5
                        </span>
                        <Badge
                          variant={
                            liveResult.info.dangerLevel >= 4
                              ? "destructive"
                              : liveResult.info.dangerLevel >= 2
                                ? "warning"
                                : "success"
                          }
                        >
                          {Math.round(liveResult.confidence.score * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* 6-Card Signal Forensic Matrix */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary">
                          {dict.landing.liveCanvas}
                        </span>
                        <Badge
                          variant={
                            liveResult.components.canvas.doubleRenderConsistent
                              ? "success"
                              : "warning"
                          }
                        >
                          {liveResult.components.canvas.doubleRenderConsistent
                            ? dict.landing.liveConsistent
                            : dict.landing.liveTampered}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <CopyableMono
                          value={liveResult.components.canvas.hash}
                          displayValue={`${liveResult.components.canvas.hash.slice(0, 24)}...`}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-sky-400">
                          {dict.landing.liveWebgl}
                        </span>
                        <Badge variant="outline">
                          {liveResult.components.webgl.extensionsCount} ext
                        </Badge>
                      </div>
                      <p className="mt-2.5 truncate font-mono text-xs text-foreground">
                        {liveResult.components.webgl.unmaskedRenderer}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {liveResult.components.webgl.unmaskedVendor}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-400">
                          {dict.landing.liveAudio}
                        </span>
                        <Badge
                          variant={
                            liveResult.components.audio.doubleRenderConsistent
                              ? "success"
                              : "warning"
                          }
                        >
                          {liveResult.components.audio.sampleRate || 44100} Hz
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <CopyableMono
                          value={liveResult.components.audio.sampleHash}
                          displayValue={`Σ=${liveResult.components.audio.sumValue} • ${liveResult.components.audio.sampleHash.slice(0, 14)}...`}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-400">
                          {dict.landing.liveHardware}
                        </span>
                        <Badge variant="outline">
                          {liveResult.components.hardware.architectureHint}
                        </Badge>
                      </div>
                      <p className="mt-2.5 font-mono text-xs text-foreground">
                        {liveResult.components.hardware.hardwareConcurrency} cores •{" "}
                        {liveResult.components.hardware.deviceMemory || 8} GB •{" "}
                        {liveResult.components.screen.width}×{liveResult.components.screen.height}@
                        {liveResult.components.screen.devicePixelRatio}x
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        Gamut: {liveResult.components.screen.colorGamut} • HDR:{" "}
                        {liveResult.components.screen.hdrSupported
                          ? dict.common.yes
                          : dict.common.no}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-400">
                          {dict.landing.liveFonts}
                        </span>
                        <Badge variant="outline">{liveResult.components.fonts.count} fonts</Badge>
                      </div>
                      <p className="mt-2.5 truncate font-mono text-xs text-foreground">
                        {liveResult.components.fonts.detected.slice(0, 5).join(", ") || "System Default"}
                      </p>
                      <div className="mt-1.5">
                        <CopyableMono
                          value={liveResult.components.fonts.hash}
                          displayValue={`${liveResult.components.fonts.hash.slice(0, 22)}...`}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-400">
                          {dict.landing.liveAntiSpoof}
                        </span>
                        <Badge variant="outline">{liveResult.components.math.engineHint}</Badge>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {liveResult.info.isBot ? (
                          <Badge variant="destructive">{dict.flags.bot}</Badge>
                        ) : null}
                        {liveResult.info.isSpoofed ? (
                          <Badge variant="warning">{dict.flags.spoofed}</Badge>
                        ) : null}
                        {liveResult.info.isIncognito ? (
                          <Badge variant="secondary">{dict.flags.incognito}</Badge>
                        ) : null}
                        {liveResult.info.crossBrowserMatched ? (
                          <Badge variant="success">{dict.flags.crossBrowser}</Badge>
                        ) : null}
                        {!liveResult.info.isBot && !liveResult.info.isSpoofed ? (
                          <Badge variant="success">{dict.flags.clean}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                        TZ: {liveResult.components.timezoneIntl.timezone} (
                        {liveResult.components.timezoneIntl.locale})
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center font-mono text-sm text-muted-foreground">
                  {dict.common.loading}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* BENTO ARCHITECTURE & VISUAL SCHEMATICS */}
        <section id="architecture" className="py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="border-primary/40 font-mono text-xs text-primary">
              {dict.landing.archBadge}
            </Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {dict.landing.archTitle}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">{dict.landing.archSubtitle}</p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-12">
            {/* Bento 1: 3-Tier Cross-Browser Reconciliation Engine (7 cols) */}
            <Card className="border-border/80 bg-card/75 lg:col-span-7">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{dict.landing.bentoReconcileTitle}</CardTitle>
                </div>
                <CardDescription className="pt-1">{dict.landing.bentoReconcileDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Schematic Pipeline Visual */}
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-300">
                      <span>{dict.landing.bentoLevel1}</span>
                      <Badge variant="success">0.99</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sky-300">
                      <span>{dict.landing.bentoLevel2}</span>
                      <Badge variant="outline">0.88</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-primary">
                      <span>{dict.landing.bentoLevel3}</span>
                      <Badge variant="default">0.95</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bento 2: Anti-Detect & Headless Bot De-Masking (5 cols) */}
            <Card className="border-border/80 bg-card/75 lg:col-span-5">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{dict.landing.bentoAntiSpoofTitle}</CardTitle>
                </div>
                <CardDescription className="pt-1">{dict.landing.bentoAntiSpoofDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <span className="text-rose-400">●</span> navigator.webdriver
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <span className="text-amber-400">●</span> Canvas 2x Noise Diff
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <span className="text-purple-400">●</span> Blob Worker Thread
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <span className="text-sky-400">●</span> CDP $cdc_ / Playwright
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bento 3: In-Memory Patricia / Radix CIDR Trie (6 cols) */}
            <Card className="border-border/80 bg-card/75 lg:col-span-6">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{dict.landing.bentoTrieTitle}</CardTitle>
                </div>
                <CardDescription className="pt-1">{dict.landing.bentoTrieDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <Badge variant="secondary">X4BNet VPN IPv4</Badge>
                  <Badge variant="secondary">X4BNet Datacenter</Badge>
                  <Badge variant="destructive">Tor Bulk Exit Nodes</Badge>
                  <Badge variant="outline">MaxMind GeoLite2 ASN/City</Badge>
                  <Badge variant="outline">JA4 TLS Coherence</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Bento 4: Constant-Time Crypto & Anti-Replay (6 cols) */}
            <Card className="border-border/80 bg-card/75 lg:col-span-6">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{dict.landing.bentoCryptoTitle}</CardTitle>
                </div>
                <CardDescription className="pt-1">{dict.landing.bentoCryptoDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <Badge variant="success">crypto.timingSafeEqual</Badge>
                  <Badge variant="outline">HMAC-SHA256 Webhooks</Badge>
                  <Badge variant="outline">Redis Nonce TTL</Badge>
                  <Badge variant="outline">Wildcard CORS *.domain.tld</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* WHY BLOUMEID COMPARISON TABLE */}
        <section id="why-bloumeid" className="py-14">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="border-primary/40 font-mono text-xs text-primary">
              {dict.landing.compBadge}
            </Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {dict.landing.compTitle}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">{dict.landing.compSubtitle}</p>
          </div>

          <Card className="mt-10 overflow-hidden border-border/80 bg-card/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="p-4 font-semibold">{dict.landing.compColFeature}</th>
                    <th className="p-4 font-bold text-primary">{dict.landing.compColBloume}</th>
                    <th className="p-4 font-semibold text-muted-foreground">
                      {dict.landing.compColSaas}
                    </th>
                    <th className="p-4 font-semibold text-muted-foreground">
                      {dict.landing.compColBasic}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[
                    {
                      label: dict.landing.compRow1,
                      bloume: dict.landing.compYes,
                      saas: dict.landing.compYes,
                      basic: dict.landing.compNo,
                    },
                    {
                      label: dict.landing.compRow2,
                      bloume: dict.landing.compYes,
                      saas: dict.landing.compPaid,
                      basic: dict.landing.compNo,
                    },
                    {
                      label: dict.landing.compRow3,
                      bloume: dict.landing.compYes,
                      saas: dict.landing.compPaid,
                      basic: dict.landing.compNo,
                    },
                    {
                      label: dict.landing.compRow4,
                      bloume: dict.landing.compYes,
                      saas: dict.landing.compPaid,
                      basic: dict.landing.compNo,
                    },
                    {
                      label: dict.landing.compRow5,
                      bloume: dict.landing.compYes,
                      saas: dict.landing.compPaid,
                      basic: dict.landing.compNo,
                    },
                    {
                      label: dict.landing.compRow6,
                      bloume: dict.landing.compYes,
                      saas: dict.landing.compCloud,
                      basic: dict.landing.compYes,
                    },
                    {
                      label: dict.landing.compRow7,
                      bloume: dict.landing.compYes,
                      saas: dict.landing.compPaid,
                      basic: dict.landing.compYes,
                    },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-secondary/20">
                      <td className="p-4 font-medium">{row.label}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{row.bloume}</span>
                        </span>
                      </td>
                      <td className="p-4 text-xs text-amber-300">{row.saas}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {row.basic === dict.landing.compNo ? (
                          <span className="inline-flex items-center gap-1 text-rose-400">
                            <XCircle className="h-4 w-4" />
                            <span>{row.basic}</span>
                          </span>
                        ) : (
                          row.basic
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* SELF-HOST & SDK QUICKSTART SECTION */}
        <section id="self-host" className="py-14">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="border-primary/40 font-mono text-xs text-primary">
              {dict.landing.codeBadge}
            </Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {dict.landing.codeTitle}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">{dict.landing.codeSubtitle}</p>
          </div>

          <Card className="mt-10 border-border/80 bg-card/85 p-6">
            <Tabs defaultValue="npm">
              <TabsList>
                <TabsTrigger value="npm">{dict.sites.tabNpm}</TabsTrigger>
                <TabsTrigger value="node">{dict.sites.tabNode}</TabsTrigger>
                <TabsTrigger value="script">{dict.sites.tabScript}</TabsTrigger>
                <TabsTrigger value="docker">Docker Compose</TabsTrigger>
              </TabsList>

              <TabsContent value="npm">
                <pre className="overflow-x-auto rounded-xl border border-border bg-background/90 p-5 font-mono text-xs leading-relaxed text-foreground">
{`import { BloumeID } from "@bloumeid/sdk";

const bloumeid = new BloumeID({
  apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY,
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL,
  options: {
    exclude: [],
    timeout: 5000,
    cacheLifetimeMs: 60_000,
  },
});

const { visitorId, thumbmark, hardwareHash, requestId, confidence, info } = await bloumeid.get();
console.log({ visitorId, thumbmark, dangerLevel: info.dangerLevel, isBot: info.isBot });`}
                </pre>
              </TabsContent>

              <TabsContent value="node">
                <pre className="overflow-x-auto rounded-xl border border-border bg-background/90 p-5 font-mono text-xs leading-relaxed text-foreground">
{`import { BloumeIDServer } from "@bloumeid/sdk/server";

const bloumeServer = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!, // bid_sec_...
  endpoint: process.env.BLOUMEID_PUBLIC_URL!,
});

const verified = await bloumeServer.verifyRequest(requestId);
if (!verified.verified || verified.dangerLevel >= 4 || verified.flags.isBot) {
  throw new Error("High-risk or spoofed request rejected");
}`}
                </pre>
              </TabsContent>

              <TabsContent value="script">
                <pre className="overflow-x-auto rounded-xl border border-border bg-background/90 p-5 font-mono text-xs leading-relaxed text-foreground">
{`<script src="\${BLOUMEID_PUBLIC_URL}/sdk/v1/bloumeid.js"></script>
<script>
  const client = new window.BloumeID({
    apiKey: "bid_pub_YOUR_SITE_KEY",
    endpoint: "\${BLOUMEID_PUBLIC_URL}"
  });
  client.get().then((res) => console.log(res.visitorId, res.info.dangerLevel));
</script>`}
                </pre>
              </TabsContent>

              <TabsContent value="docker">
                <pre className="overflow-x-auto rounded-xl border border-border bg-background/90 p-5 font-mono text-xs leading-relaxed text-foreground">
{`git clone https://github.com/bloume-sas/bloumeid.git
cd bloumeid
cp .env.example .env
docker compose up -d --build
curl -fsS http://localhost:3000/api/health`}
                </pre>
              </TabsContent>
            </Tabs>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-card/50 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <Fingerprint className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{dict.common.brandName}</span>
            <span>— {dict.landing.footerBuiltBy}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/playground" className="hover:text-foreground">
              {dict.landing.footerPlayground}
            </Link>
            <Link href="/dashboard" className="hover:text-foreground">
              {dict.landing.footerDashboard}
            </Link>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              {dict.landing.navGithub}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
