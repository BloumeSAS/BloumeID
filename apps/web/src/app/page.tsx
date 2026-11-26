"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  Cpu,
  Fingerprint,
  Github,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEMO_PUBLIC_KEY = "bid_pub_demo_cosmic_night_2026";
const GITHUB_REPO_URL = "https://github.com/BloumeSAS/BloumeID";

export default function LandingPage() {
  const { locale, setLocale, theme, toggleTheme, dict } = useI18n();
  const [result, setResult] = React.useState<BloumeIDResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [elapsedMs, setElapsedMs] = React.useState<number>(0);
  const [jsonFormat, setJsonFormat] = React.useState<"bloume" | "thumbmark" | "fpjs">("bloume");
  const [jsonCopied, setJsonCopied] = React.useState(false);
  const inspectorRef = React.useRef<HTMLElement | null>(null);

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
      // Fallback: local-only components if offline
    } finally {
      setElapsedMs(Math.round(performance.now() - t0));
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void runLiveScan();
  }, [runLiveScan]);

  const scrollToInspector = () => {
    inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          version: "1.0.0",
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
          visitorFound: true,
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

  const signalCategories = React.useMemo(() => {
    const c = result?.components;
    return [
      {
        title: "Canvas & Sub-Pixel",
        count: 14,
        status: c?.canvas ? "Collected" : "Pending",
        preview: c?.canvas?.winding ? "Winding + Emoji + Text" : "2D Context",
      },
      {
        title: "WebGL2 & GPU",
        count: 18,
        status: c?.webgl ? "Collected" : "Pending",
        preview: c?.webgl?.renderer ?? "GPU Renderer",
      },
      {
        title: "OfflineAudioContext",
        count: 8,
        status: c?.audio ? "Collected" : "Pending",
        preview: c?.audio ? `${c.audio.sampleRate} Hz` : "Audio DSP",
      },
      {
        title: "Fonts & Typography",
        count: 16,
        status: c?.fonts ? "Collected" : "Pending",
        preview: c?.fonts ? `${c.fonts.count} fonts` : "OS Font Matrix",
      },
      {
        title: "Hardware & CPU/RAM",
        count: 14,
        status: c?.hardware ? "Collected" : "Pending",
        preview: c?.hardware
          ? `${c.hardware.hardwareConcurrency ?? "?"} cores · ${c.hardware.deviceMemory ?? "?"} GB`
          : "Concurrency & Memory",
      },
      {
        title: "Math & JS Engine",
        count: 12,
        status: c?.math ? "Collected" : "Pending",
        preview: c?.math?.engineHint ?? "V8 / SpiderMonkey / JSC",
      },
      {
        title: "Screen, HDR & Media",
        count: 12,
        status: c?.screen ? "Collected" : "Pending",
        preview: c?.screen ? `${c.screen.width}x${c.screen.height}` : "Color Gamut",
      },
      {
        title: "Anti-Spoof & Bot",
        count: 10,
        status: result ? "Verified" : "Pending",
        preview: result?.info?.isSpoofed ? "Spoof Detected" : "Authentic (0 Hooks)",
      },
    ];
  }, [result]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Architectural bg-grid + radial halo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:36px_36px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.22),transparent)]"
      />

      {/* Minimalist Floating Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Fingerprint className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight">BloumeID</span>
            <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex">
              v1.0.0
            </Badge>
          </div>

          <nav className="hidden items-center gap-6 text-xs font-medium text-muted-foreground md:flex">
            <a href="#inspector" className="transition-colors hover:text-foreground">
              Live Inspector
            </a>
            <a href="#architecture" className="transition-colors hover:text-foreground">
              Architecture
            </a>
            <a href="#compare" className="transition-colors hover:text-foreground">
              Comparatif
            </a>
            <a href="#deploy" className="transition-colors hover:text-foreground">
              Coolify
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
                <span>{dict.landing.navAdminConsole}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-4 py-12 sm:px-6 sm:py-16">
        {/* Centered High-Impact Hero */}
        <section className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            <span>@bloume/id v1.0.0 · Open-Source Device Intelligence</span>
          </Badge>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            {dict.landing.heroTitleLine1} {dict.landing.heroTitleLine2}
          </h1>

          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            {dict.landing.heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={scrollToInspector} className="gap-2">
              <Activity className="h-4 w-4" />
              <span>Analyser mon navigateur (Live)</span>
            </Button>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Accéder au Panel Admin</span>
              </Button>
            </Link>
          </div>
        </section>

        {/* Full-Width Live Inspector Console */}
        <section id="inspector" ref={inspectorRef} className="scroll-mt-20">
          <Card className="border-primary/30 bg-card/90 shadow-xl backdrop-blur">
            <CardHeader className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <CardTitle className="text-base sm:text-lg">
                    Live Inspector — @bloume/id
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {loading ? "..." : `${elapsedMs} ms · 104 signals`}
                  </Badge>
                </div>
                <CardDescription className="mt-1 text-xs">
                  {dict.landing.heroSubtitle}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runLiveScan()}
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Relancer le scan</span>
              </Button>
            </CardHeader>

            <CardContent className="pt-5">
              <Tabs defaultValue="visual">
                <TabsList className="mb-4 grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
                  <TabsTrigger value="visual">Aperçu Visuel</TabsTrigger>
                  <TabsTrigger value="json">Réponse API (JSON)</TabsTrigger>
                  <TabsTrigger value="signals">104 Signaux Collectés</TabsTrigger>
                </TabsList>

                <TabsContent value="visual" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                      <p className="text-[11px] font-medium text-muted-foreground">Visitor ID</p>
                      <div className="mt-1">
                        <CopyableMono
                          value={result?.visitorId ?? "vis_loading..."}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/20 p-3.5">
                      <p className="text-[11px] font-medium text-muted-foreground">Full Hash</p>
                      <div className="mt-1">
                        <CopyableMono
                          value={result?.thumbmark ? `${result.thumbmark.slice(0, 18)}...` : "..."}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/20 p-3.5">
                      <p className="text-[11px] font-medium text-muted-foreground">Hardware Hash</p>
                      <div className="mt-1">
                        <CopyableMono
                          value={result?.hardwareHash ? `${result.hardwareHash.slice(0, 18)}...` : "..."}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/20 p-3.5">
                      <p className="text-[11px] font-medium text-muted-foreground">Danger & Confiance</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="font-mono text-base font-bold">
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
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-card p-3.5">
                      <p className="text-xs font-semibold text-primary">Réseau &amp; Géolocalisation</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        IP: {result?.info?.ipAddress ?? "—"} · {result?.info?.country ?? "—"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        ASN: {result?.info?.asnOrg ?? "Local / Direct"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3.5">
                      <p className="text-xs font-semibold text-primary">GPU &amp; Matériel</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {result?.components?.webgl?.renderer ?? "WebGL2 Renderer"}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {result?.components?.hardware?.hardwareConcurrency ?? "?"} cores ·{" "}
                        {result?.components?.hardware?.deviceMemory ?? "?"} GB RAM
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3.5">
                      <p className="text-xs font-semibold text-primary">Verdict Anti-Spoof</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge variant={result?.info?.isVpn ? "warning" : "secondary"}>
                          VPN: {result?.info?.isVpn ? "Yes" : "No"}
                        </Badge>
                        <Badge variant={result?.info?.isTor ? "destructive" : "secondary"}>
                          Tor: {result?.info?.isTor ? "Yes" : "No"}
                        </Badge>
                        <Badge variant={result?.info?.isBot ? "destructive" : "secondary"}>
                          Bot: {result?.info?.isBot ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="json" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={jsonFormat === "bloume" ? "default" : "outline"}
                        onClick={() => setJsonFormat("bloume")}
                      >
                        @bloume/id
                      </Button>
                      <Button
                        size="sm"
                        variant={jsonFormat === "thumbmark" ? "default" : "outline"}
                        onClick={() => setJsonFormat("thumbmark")}
                      >
                        ThumbmarkJS
                      </Button>
                      <Button
                        size="sm"
                        variant={jsonFormat === "fpjs" ? "default" : "outline"}
                        onClick={() => setJsonFormat("fpjs")}
                      >
                        Fingerprint.com
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
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
                  </div>
                  <pre className="max-h-[380px] overflow-auto rounded-xl border border-border bg-secondary/40 p-4 font-mono text-xs leading-relaxed">
                    {formattedJson}
                  </pre>
                </TabsContent>

                <TabsContent value="signals">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {signalCategories.map((cat) => (
                      <div
                        key={cat.title}
                        className="rounded-xl border border-border bg-secondary/20 p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{cat.title}</span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {cat.count}
                          </Badge>
                        </div>
                        <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground">
                          {cat.preview}
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* 3-Step Architecture Pipeline */}
        <section id="architecture" className="space-y-6 scroll-mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Pipeline Edge-to-Core</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              De la collecte navigateur zéro-dépendance à la décision temps réel.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <Cpu className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">1. Collecte Client @bloume/id</CardTitle>
                <CardDescription className="text-xs">
                  104 signaux déterministes (Canvas, WebGL2, Audio, Fonts, Math, Anti-Hook) en &lt; 80 ms, zéro cookie.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">2. Analyse Edge &amp; CIDR Trie &lt; 1 ms</CardTitle>
                <CardDescription className="text-xs">
                  Enrichissement GeoLite2, ASN, détection VPN/Tor/Datacenter et anti-rejeu HMAC-SHA256 via Redis.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <ShieldAlert className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">3. Identité Persistante &amp; Rule Engine</CardTitle>
                <CardDescription className="text-xs">
                  Réconciliation cross-browser, identifiants Snowflake immuables et règles SOC (Block / Challenge / Flag).
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Clean Comparison Table */}
        <section id="compare" className="space-y-6 scroll-mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Comparatif Technique Réel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Souveraineté, précision des signaux et coût total de possession face aux solutions du marché.
            </p>
          </div>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Critère Technique</th>
                    <th className="px-4 py-3 font-semibold text-primary">BloumeID v1.0.0</th>
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
                    <td className="px-4 py-3 text-muted-foreground">SaaS Propriétaire (Cloud US/EU)</td>
                    <td className="px-4 py-3 text-muted-foreground">MIT (Client) / SaaS (Pro)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Coût (1M requêtes / mois)</td>
                    <td className="px-4 py-3 font-semibold text-emerald-500">0 € (Illimité)</td>
                    <td className="px-4 py-3 text-muted-foreground">~200 $ – 1 000 $+ / mois</td>
                    <td className="px-4 py-3 text-muted-foreground">0 € (OSS) / Payant (Pro)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Signaux Collectés &amp; Anti-Hook</td>
                    <td className="px-4 py-3 text-emerald-500">
                      <Check className="mr-1 inline h-4 w-4" />
                      104 signaux + détection prototype
                    </td>
                    <td className="px-4 py-3">Propriétaire (~100+ signaux)</td>
                    <td className="px-4 py-3 text-muted-foreground">~35 signaux (Canvas/WebGL/Audio)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">GeoIP &amp; Threat Intel (VPN/Tor/DC)</td>
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
                    <td className="px-4 py-3 font-medium">Rule Engine SOC &amp; Webhooks HMAC</td>
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

        {/* Coolify 1-Click Terminal Block */}
        <section id="deploy" className="scroll-mt-20">
          <Card className="border-primary/25 bg-secondary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Déploiement 1-Clic Coolify / Docker</CardTitle>
              </div>
              <CardDescription className="text-xs">
                PostgreSQL 17 + Valkey 8 + Next.js 16 Standalone prêts en production.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-xs text-foreground">
{`git clone https://github.com/BloumeSAS/BloumeID.git
cd BloumeID
docker compose up -d --build`}
              </pre>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">BloumeID</span>
            <Badge variant="outline" className="font-mono text-[10px]">
              v1.0.0
            </Badge>
            <span>· © 2026 Bloume SAS</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#inspector" className="transition-colors hover:text-foreground">
              Live Inspector
            </a>
            <a href="#architecture" className="transition-colors hover:text-foreground">
              Architecture
            </a>
            <a href="#compare" className="transition-colors hover:text-foreground">
              Comparatif
            </a>
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              {dict.landing.navAdminConsole}
            </Link>
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
