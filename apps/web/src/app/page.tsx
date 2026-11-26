"use client";

import * as React from "react";
import Link from "next/link";
import { BloumeID, type BloumeIDResult } from "@bloume/id";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  Fingerprint,
  GitBranch,
  Globe,
  Layers,
  Lock,
  Moon,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Sun,
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
  const { dict, locale, setLocale, theme, toggleTheme } = useI18n();
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
      {/* Clean Slate Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/12 blur-[140px]" />
      </div>

      {/* Responsive Sticky Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">{dict.common.brandName}</span>
              <Badge
                variant="outline"
                className="hidden whitespace-nowrap border-primary/40 font-mono text-[10px] text-primary sm:inline-flex"
              >
                {dict.common.versionBadge}
              </Badge>
            </div>
          </div>

          <nav className="hidden items-center gap-5 whitespace-nowrap text-xs font-medium text-muted-foreground xl:flex xl:text-sm">
            <a href="#live-scanner" className="transition-colors hover:text-foreground">
              {dict.landing.navLiveDemo}
            </a>
            <a href="#architecture" className="transition-colors hover:text-foreground">
              {dict.landing.navFeatures}
            </a>
            <a href="#competitor-matrix" className="transition-colors hover:text-foreground">
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

          <div className="flex shrink-0 items-center gap-2">
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="landing-theme-switcher"
              onClick={toggleTheme}
              title={theme === "dark" ? dict.common.themeLight : dict.common.themeDark}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>

            <Link href="/playground" className="hidden sm:inline-flex">
              <Button type="button" variant="secondary" size="sm">
                <Cpu className="h-3.5 w-3.5" />
                <span>{dict.landing.ctaPlayground}</span>
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button type="button" size="sm" data-testid="landing-admin-cta">
                <Shield className="h-3.5 w-3.5" />
                <span>{dict.landing.navAdminConsole}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        {/* HERO SECTION */}
        <section className="pt-12 pb-12 text-center md:pt-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary shadow-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{dict.landing.heroBadge}</span>
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block text-foreground">{dict.landing.heroTitleLine1}</span>
            <span className="mt-1 block bg-gradient-to-r from-primary via-indigo-400 to-sky-400 bg-clip-text font-serif italic text-transparent">
              {dict.landing.heroTitleLine2}
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-lg">
            {dict.landing.heroSubtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="h-11 px-6 text-sm font-semibold shadow-md">
                <span>{dict.landing.ctaPrimary}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/playground">
              <Button variant="secondary" size="lg" className="h-11 px-6 text-sm font-semibold">
                <Cpu className="h-4 w-4 text-primary" />
                <span>{dict.landing.ctaPlayground}</span>
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
          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <Card className="border-border bg-card/80">
              <CardContent className="pt-5 text-center">
                <p className="font-mono text-2xl font-extrabold text-primary sm:text-3xl">
                  {dict.landing.statCollectors}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{dict.landing.statCollectorsLabel}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/80">
              <CardContent className="pt-5 text-center">
                <p className="font-mono text-2xl font-extrabold text-sky-500 sm:text-3xl">
                  {activeCidrs.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{dict.landing.statCidrsLabel}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/80">
              <CardContent className="pt-5 text-center">
                <p className="font-mono text-2xl font-extrabold text-emerald-500 sm:text-3xl">
                  {dict.landing.statBundleSize}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{dict.landing.statBundleSizeLabel}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/80">
              <CardContent className="pt-5 text-center">
                <p className="font-mono text-2xl font-extrabold text-amber-500 sm:text-3xl">
                  {dict.landing.statLatency}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{dict.landing.statLatencyLabel}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* INTERACTIVE LIVE IN-BROWSER FINGERPRINT DEMO WIDGET */}
        <section id="live-scanner" className="py-8">
          <Card className="overflow-hidden border-primary/35 bg-card shadow-xl">
            <CardHeader className="border-b border-border bg-secondary/40 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                  <CardTitle className="text-lg sm:text-xl">{dict.landing.liveWidgetTitle}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {dict.landing.liveWidgetSubtitle}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
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

            <CardContent className="space-y-5 p-4 sm:p-6">
              {liveResult ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {dict.playground.visitorIdLabel}
                      </p>
                      <div className="mt-1.5">
                        <CopyableMono
                          value={liveResult.visitorId}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                          className="text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {dict.playground.thumbmarkLabel}
                      </p>
                      <div className="mt-1.5">
                        <CopyableMono
                          value={liveResult.thumbmark}
                          displayValue={`${liveResult.thumbmark.slice(0, 18)}...`}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {dict.visitors.hardwareHash}
                      </p>
                      <div className="mt-1.5">
                        <CopyableMono
                          value={liveResult.hardwareHash}
                          displayValue={`${liveResult.hardwareHash.slice(0, 18)}...`}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {dict.playground.dangerGaugeLabel}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="font-mono text-lg font-bold text-foreground">
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

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-primary">
                          {dict.landing.liveCanvas}
                        </span>
                        <Badge
                          variant={
                            liveResult.components.canvas.doubleRenderConsistent
                              ? "success"
                              : "warning"
                          }
                          className="shrink-0 whitespace-nowrap"
                        >
                          {liveResult.components.canvas.doubleRenderConsistent
                            ? dict.landing.liveConsistent
                            : dict.landing.liveTampered}
                        </Badge>
                      </div>
                      <div className="mt-2.5">
                        <CopyableMono
                          value={liveResult.components.canvas.hash}
                          displayValue={`${liveResult.components.canvas.hash.slice(0, 22)}...`}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-sky-500">
                          {dict.landing.liveWebgl}
                        </span>
                        <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                          {liveResult.components.webgl.extensionsCount} ext
                        </Badge>
                      </div>
                      <p className="mt-2 truncate font-mono text-xs text-foreground">
                        {liveResult.components.webgl.unmaskedRenderer}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {liveResult.components.webgl.unmaskedVendor}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-indigo-400">
                          {dict.landing.liveAudio}
                        </span>
                        <Badge
                          variant={
                            liveResult.components.audio.doubleRenderConsistent
                              ? "success"
                              : "warning"
                          }
                          className="shrink-0 whitespace-nowrap"
                        >
                          {liveResult.components.audio.sampleRate || 44100} Hz
                        </Badge>
                      </div>
                      <div className="mt-2.5">
                        <CopyableMono
                          value={liveResult.components.audio.sampleHash}
                          displayValue={`Σ=${liveResult.components.audio.sumValue} • ${liveResult.components.audio.sampleHash.slice(0, 14)}...`}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-emerald-500">
                          {dict.landing.liveHardware}
                        </span>
                        <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                          {liveResult.components.hardware.architectureHint}
                        </Badge>
                      </div>
                      <p className="mt-2 font-mono text-xs text-foreground">
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

                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-amber-500">
                          {dict.landing.liveFonts}
                        </span>
                        <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                          {liveResult.components.fonts.count} fonts
                        </Badge>
                      </div>
                      <p className="mt-2 truncate font-mono text-xs text-foreground">
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

                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-rose-500">
                          {dict.landing.liveAntiSpoof}
                        </span>
                        <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                          {liveResult.components.math.engineHint}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
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
                      <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground">
                        IP: {liveResult.info.ipAddress ?? "127.0.0.1"} •{" "}
                        {liveResult.info.asnOrg ?? "Orange S.A."} •{" "}
                        {liveResult.components.timezoneIntl.timezone}
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

        {/* BENTO ARCHITECTURE */}
        <section id="architecture" className="py-14">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="border-primary/40 font-mono text-xs text-primary">
              {dict.landing.archBadge}
            </Badge>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
              {dict.landing.archTitle}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {dict.landing.archSubtitle}
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-12">
            <Card className="border-border bg-card lg:col-span-7">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{dict.landing.bentoReconcileTitle}</CardTitle>
                </div>
                <CardDescription className="pt-1">{dict.landing.bentoReconcileDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4 font-mono text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                    <span>{dict.landing.bentoLevel1}</span>
                    <Badge variant="success">0.99</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2">
                    <span>{dict.landing.bentoLevel2}</span>
                    <Badge variant="outline">0.88</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                    <span>{dict.landing.bentoLevel3}</span>
                    <Badge variant="default">0.95</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card lg:col-span-5">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-500">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{dict.landing.bentoAntiSpoofTitle}</CardTitle>
                </div>
                <CardDescription className="pt-1">{dict.landing.bentoAntiSpoofDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    ● Prototype Hooks
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    ● SwiftShader / VM
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    ● Canvas/Audio 2x
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    ● Sec-CH-UA Check
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card lg:col-span-6">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500">
                    <Database className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{dict.landing.bentoTrieTitle}</CardTitle>
                </div>
                <CardDescription className="pt-1">{dict.landing.bentoTrieDesc}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 font-mono text-xs">
                <Badge variant="secondary">Auto GeoLite2-City.mmdb</Badge>
                <Badge variant="secondary">Auto GeoLite2-ASN.mmdb</Badge>
                <Badge variant="destructive">Tor Bulk Exit List</Badge>
                <Badge variant="outline">X4BNet VPN & Datacenter</Badge>
              </CardContent>
            </Card>

            <Card className="border-border bg-card lg:col-span-6">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{dict.landing.bentoCryptoTitle}</CardTitle>
                </div>
                <CardDescription className="pt-1">{dict.landing.bentoCryptoDesc}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 font-mono text-xs">
                <Badge variant="success">ThumbmarkJS API</Badge>
                <Badge variant="success">Fingerprint.com API</Badge>
                <Badge variant="outline">Rules: allow / challenge / block</Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4-COLUMN COMPETITOR COMPARISON MATRIX (BloumeID v1.0.0 vs ThumbmarkJS vs Fingerprint.com vs CreepJS) */}
        <section id="competitor-matrix" className="py-12">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="border-primary/40 font-mono text-xs text-primary">
              {dict.landing.compBadge}
            </Badge>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
              {dict.landing.compTitle}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {dict.landing.compSubtitle}
            </p>
          </div>

          <Card className="mt-8 overflow-hidden border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="p-4 font-semibold">{dict.landing.compColFeature}</th>
                    <th className="p-4 font-bold text-primary">{dict.landing.compColBloume}</th>
                    <th className="p-4 font-semibold text-muted-foreground">
                      {dict.landing.compColThumbmark}
                    </th>
                    <th className="p-4 font-semibold text-muted-foreground">
                      {dict.landing.compColFpPro}
                    </th>
                    <th className="p-4 font-semibold text-muted-foreground">
                      {dict.landing.compColCreep}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr className="hover:bg-secondary/20">
                    <td className="p-4 font-medium">{dict.landing.compRow1}</td>
                    <td className="p-4 font-semibold text-emerald-500">{dict.landing.compBloume1}</td>
                    <td className="p-4 text-xs text-muted-foreground">{dict.landing.compThumb1}</td>
                    <td className="p-4 text-xs text-amber-500">{dict.landing.compFp1}</td>
                    <td className="p-4 text-xs text-muted-foreground">{dict.landing.compCreep1}</td>
                  </tr>
                  <tr className="hover:bg-secondary/20">
                    <td className="p-4 font-medium">{dict.landing.compRow2}</td>
                    <td className="p-4 font-semibold text-emerald-500">{dict.landing.compBloume2}</td>
                    <td className="p-4 text-xs text-muted-foreground">{dict.landing.compThumb2}</td>
                    <td className="p-4 text-xs text-muted-foreground">{dict.landing.compFp2}</td>
                    <td className="p-4 text-xs text-muted-foreground">{dict.landing.compCreep2}</td>
                  </tr>
                  {[
                    {
                      label: dict.landing.compRow3,
                      thumb: dict.landing.compPartial,
                      fp: dict.landing.compYes,
                      creep: dict.landing.compYes,
                    },
                    {
                      label: dict.landing.compRow4,
                      thumb: dict.landing.compPaid,
                      fp: dict.landing.compPaid,
                      creep: dict.landing.compNo,
                    },
                    {
                      label: dict.landing.compRow5,
                      thumb: dict.landing.compNo,
                      fp: dict.landing.compPaid,
                      creep: dict.landing.compNo,
                    },
                    {
                      label: dict.landing.compRow6,
                      thumb: dict.landing.compPartial,
                      fp: dict.landing.compPaid,
                      creep: dict.landing.compYes,
                    },
                    {
                      label: dict.landing.compRow7,
                      thumb: dict.landing.compNo,
                      fp: dict.landing.compPaid,
                      creep: dict.landing.compNo,
                    },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-secondary/20">
                      <td className="p-4 font-medium">{row.label}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-500">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>{dict.landing.compYes}</span>
                        </span>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">{row.thumb}</td>
                      <td className="p-4 text-xs text-amber-500">{row.fp}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {row.creep === dict.landing.compNo ? (
                          <span className="inline-flex items-center gap-1 text-rose-500">
                            <XCircle className="h-4 w-4 shrink-0" />
                            <span>{row.creep}</span>
                          </span>
                        ) : (
                          row.creep
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* DUAL API & COOLIFY 1-CLICK DOCKER SHOWCASE */}
        <section id="self-host" className="py-12">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="border-primary/40 font-mono text-xs text-primary">
              {dict.landing.codeBadge}
            </Badge>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
              {dict.landing.codeTitle}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {dict.landing.codeSubtitle}
            </p>
          </div>

          <Card className="mt-8 border-border bg-card p-4 sm:p-6">
            <Tabs defaultValue="thumbmark">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="thumbmark">{dict.landing.tabThumbmark}</TabsTrigger>
                <TabsTrigger value="fppro">{dict.landing.tabFingerprintPro}</TabsTrigger>
                <TabsTrigger value="script">{dict.landing.tabScript}</TabsTrigger>
                <TabsTrigger value="coolify">{dict.landing.tabCoolify}</TabsTrigger>
              </TabsList>

              <TabsContent value="thumbmark">
                <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs leading-relaxed">
{`import { BloumeID } from "@bloume/id";

const tm = new BloumeID({
  apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY,
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL,
});

const { visitorId, thumbmark, requestId, confidence, info } = await tm.get();
console.log({ visitorId, thumbmark, dangerLevel: info.dangerLevel, action: info.action });`}
                </pre>
              </TabsContent>

              <TabsContent value="fppro">
                <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs leading-relaxed">
{`import FingerprintJS from "@bloume/id";

// 100% Drop-in replacement for @fingerprintjs/fingerprintjs-pro
const fpPromise = FingerprintJS.load({
  apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY!,
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL!,
});

const agent = await fpPromise;
const result = await agent.get({
  extendedResult: true,
  linkedId: "user_account_42",
  tag: { checkoutStep: "payment" },
});
console.log(result.visitorId, result.requestId, result.visitorFound, result.ipLocation);`}
                </pre>
              </TabsContent>

              <TabsContent value="script">
                <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs leading-relaxed">
{`<script src="\${BLOUMEID_PUBLIC_URL}/sdk/v1/bloumeid.js"></script>
<script>
  // Supports both new window.BloumeID() and window.BloumeID.load()
  window.BloumeID.load({
    apiKey: "bid_pub_YOUR_SITE_KEY",
    endpoint: "\${BLOUMEID_PUBLIC_URL}"
  }).then((agent) => agent.get({ extendedResult: true }))
    .then((res) => console.log(res.visitorId, res.requestId, res.incognito));
</script>`}
                </pre>
              </TabsContent>

              <TabsContent value="coolify">
                <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs leading-relaxed">
{`# Option 1: All-in-One Stack (Web + PostgreSQL 17 + Valkey 8 + Auto GeoLite2)
docker compose -f docker-compose.yml up -d --build

# Option 2: External / Managed PostgreSQL & Redis (Coolify External DBs)
docker compose -f docker-compose.external-db.yml up -d --build

# Option 3: Coolify Single-Container Dockerfile Buildpack (Root ./Dockerfile)
docker build -t bloumeid:v1.0.0 -f Dockerfile .`}
                </pre>
              </TabsContent>
            </Tabs>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border bg-card/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:px-6">
          <div className="flex items-center gap-2">
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
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
              {dict.landing.navGithub}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
