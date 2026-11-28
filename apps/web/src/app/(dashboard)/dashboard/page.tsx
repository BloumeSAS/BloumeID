"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Bot,
  Cpu,
  Database,
  GitBranch,
  Globe,
  Laptop,
  LayoutGrid,
  List,
  Monitor,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CollapsibleJsonViewer } from "@/components/collapsible-json";
import { CountryFlag } from "@/components/ui/country-flag";
import { InteractiveWorldMap } from "@/components/world-map";
import { cn } from "@/lib/utils";
import type { DashboardMetricsDTO, PublicFingerprintEventDTO } from "@/types";

const PLATFORM_COLORS = ["#86efac", "#60a5fa", "#c084fc"] as const;

function OsBrandIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes("ios") || n.includes("macos") || n.includes("ipados") || n.includes("apple")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current text-zinc-200">
        <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
      </svg>
    );
  }
  if (n.includes("windows")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current text-sky-400">
        <path d="M3 5.557L10.355 4.5v7.105H3V5.557zm0 12.886l7.355 1.057v-7.03H3v5.973zm8.148 1.167L21 21v-8.53h-9.852v7.14zm0-15.22v7.215H21V3l-9.852 1.39z" />
      </svg>
    );
  }
  if (n.includes("android")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current text-emerald-400">
        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" />
      </svg>
    );
  }
  return <Laptop className="h-4 w-4 shrink-0 text-amber-400" />;
}

function formatCompactCount(n: number): string {
  if (n >= 1000) {
    const k = (n / 1000).toFixed(1).replace(/\.0$/, "");
    return `${k}k`;
  }
  return String(n);
}

export default function DashboardPage() {
  const { dict, timeRange, selectedSiteId, refreshTick } = useI18n();
  const [metrics, setMetrics] = React.useState<DashboardMetricsDTO | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<PublicFingerprintEventDTO | null>(null);
  const [locationView, setLocationView] = React.useState<"list" | "map">("list");
  const [networkSearch, setNetworkSearch] = React.useState("");
  const [showNetworkSearch, setShowNetworkSearch] = React.useState(false);
  const [osTab, setOsTab] = React.useState<"os" | "browsers">("os");

  // PRO View Preset & Custom Widget Visibility Configuration
  const [viewPreset, setViewPreset] = React.useState<"all" | "executive" | "soc" | "network">("all");
  const [showWidgetConfig, setShowWidgetConfig] = React.useState(false);
  const [visibleWidgets, setVisibleWidgets] = React.useState({
    primaryKpis: true,
    secondaryKpis: true,
    timelineCharts: true,
    trycapGrid: true,
    liveStream: true,
  });

  const applyViewPreset = (preset: "all" | "executive" | "soc" | "network") => {
    setViewPreset(preset);
    if (preset === "all") {
      setVisibleWidgets({
        primaryKpis: true,
        secondaryKpis: true,
        timelineCharts: true,
        trycapGrid: true,
        liveStream: true,
      });
    } else if (preset === "executive") {
      setVisibleWidgets({
        primaryKpis: true,
        secondaryKpis: false,
        timelineCharts: true,
        trycapGrid: true,
        liveStream: false,
      });
    } else if (preset === "soc") {
      setVisibleWidgets({
        primaryKpis: true,
        secondaryKpis: true,
        timelineCharts: true,
        trycapGrid: false,
        liveStream: true,
      });
    } else if (preset === "network") {
      setLocationView("map");
      setVisibleWidgets({
        primaryKpis: false,
        secondaryKpis: true,
        timelineCharts: false,
        trycapGrid: true,
        liveStream: true,
      });
    }
  };

  const abortRef = React.useRef<AbortController | null>(null);

  const loadMetrics = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const params = new URLSearchParams({ period: timeRange, siteId: selectedSiteId });
      const res = await fetch(`/api/admin/dashboard?${params.toString()}`, {
        signal: controller.signal,
      });
      if (res.ok && !controller.signal.aborted) {
        const data = (await res.json()) as DashboardMetricsDTO;
        setMetrics(data);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        throw err;
      }
    }
  }, [timeRange, selectedSiteId]);

  React.useEffect(() => {
    void loadMetrics();
    return () => abortRef.current?.abort();
  }, [loadMetrics, refreshTick]);

  const filteredNetworks = React.useMemo(() => {
    const list = metrics?.topAsns ?? [];
    if (!networkSearch.trim()) return list;
    const q = networkSearch.toLowerCase();
    return list.filter(
      (a) =>
        a.asnOrg.toLowerCase().includes(q) ||
        String(a.asnNumber).includes(q) ||
        `as${a.asnNumber}`.includes(q)
    );
  }, [metrics?.topAsns, networkSearch]);

  const platformData = React.useMemo(() => {
    if (metrics?.platformDistribution && metrics.platformDistribution.length > 0) {
      return metrics.platformDistribution;
    }
    return [
      { name: "Phone", count: 0, share: 0 },
      { name: "Desktop", count: 0, share: 0 },
      { name: "Tablet", count: 0, share: 0 },
    ];
  }, [metrics?.platformDistribution]);

  const maxCountryCount = React.useMemo(() => {
    const counts = (metrics?.topCountries ?? []).map((c) => c.count);
    return Math.max(1, ...counts);
  }, [metrics?.topCountries]);

  const maxNetworkCount = React.useMemo(() => {
    const counts = (metrics?.topAsns ?? []).map((a) => a.count);
    return Math.max(1, ...counts);
  }, [metrics?.topAsns]);

  const maxOsCount = React.useMemo(() => {
    const counts = (metrics?.osDistribution ?? []).map((o) => o.count);
    return Math.max(1, ...counts);
  }, [metrics?.osDistribution]);

  const maxBrowserCount = React.useMemo(() => {
    const counts = (metrics?.browserDistribution ?? []).map((b) => b.count);
    return Math.max(1, ...counts);
  }, [metrics?.browserDistribution]);

  const totalBrowserCount = React.useMemo(() => {
    return (metrics?.browserDistribution ?? []).reduce((acc, b) => acc + b.count, 0) || 1;
  }, [metrics?.browserDistribution]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header + PRO View Configuration & Preset Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.dashboard.title}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{dict.dashboard.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-2xs">
            {(
              [
                ["all", dict.common.presetAll],
                ["executive", dict.common.presetExecutive],
                ["soc", dict.common.presetSoc],
                ["network", dict.common.presetNetwork],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyViewPreset(key)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  viewPreset === key
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowWidgetConfig((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
              showWidgetConfig
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{dict.common.toggleWidgets}</span>
          </button>
        </div>
      </div>

      {/* Collapsible PRO Widget Customizer */}
      {showWidgetConfig ? (
        <Card className="border-primary/35 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <LayoutGrid className="h-4 w-4" />
              <span>{dict.common.viewConfig}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["primaryKpis", dict.dashboard.totalEvents],
                  ["secondaryKpis", dict.dashboard.crossBrowserMatches],
                  ["timelineCharts", dict.dashboard.trafficTrendTitle],
                  ["trycapGrid", `${dict.dashboard.cardLocation} & ${dict.dashboard.cardNetworks}`],
                  ["liveStream", dict.dashboard.liveRiskFeedTitle],
                ] as const
              ).map(([wKey, wLabel]) => (
                <button
                  key={wKey}
                  type="button"
                  onClick={() =>
                    setVisibleWidgets((prev) => ({ ...prev, [wKey]: !prev[wKey] }))
                  }
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                    visibleWidgets[wKey]
                      ? "border-primary/40 bg-primary/15 text-foreground"
                      : "border-border bg-background/50 text-muted-foreground opacity-60"
                  )}
                >
                  {visibleWidgets[wKey] ? "✓ " : "+ "}
                  {wLabel}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Primary 4 Cap-Style KPI Cards */}
      {visibleWidgets.primaryKpis ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/25">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {dict.dashboard.totalEvents}
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold">{metrics?.totalEvents ?? 0}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {metrics?.throughputPerMin ?? 0} {dict.dashboard.throughputUnit}
              </span>
            </div>
            <p className="mt-1 text-xs text-emerald-500">
              +{metrics?.totalEventsDelta ?? 0}% {dict.dashboard.vsPreviousPeriod}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {dict.dashboard.uniqueVisitors}
            </CardTitle>
            <Users className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold">{metrics?.uniqueVisitors ?? 0}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {metrics?.returnRatePercent ?? 0}% {dict.dashboard.returnRateUnit}
              </span>
            </div>
            <p className="mt-1 text-xs text-emerald-500">
              +{metrics?.uniqueVisitorsDelta ?? 0}% {dict.dashboard.vsPreviousPeriod}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {dict.dashboard.highRiskDetections}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">{metrics?.highRiskDetections ?? 0}</div>
            <p className="mt-1 text-xs text-amber-500">
              {metrics?.highRiskDelta ?? 0}% {dict.dashboard.vsPreviousPeriod}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {dict.dashboard.botBlockedRate}
            </CardTitle>
            <Bot className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">{metrics?.botSpoofRate ?? 0}%</div>
            <p className="mt-1 text-xs text-rose-500">
              +{metrics?.botSpoofDelta ?? 0}% {dict.dashboard.vsPreviousPeriod}
            </p>
          </CardContent>
        </Card>
      </div>
      ) : null}

      {/* Secondary 4 Deep Telemetry KPI Cards */}
      {visibleWidgets.secondaryKpis ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {dict.dashboard.crossBrowserMatches}
            </CardTitle>
            <GitBranch className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xl font-bold">{metrics?.crossBrowserMatches ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {dict.dashboard.vpnTorTraffic}
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold">{metrics?.vpnTorCount ?? 0}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {metrics?.vpnSharePercent ?? 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {dict.dashboard.avgCollectionTime}
            </CardTitle>
            <Cpu className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xl font-bold">{metrics?.avgCollectionMs ?? 0} ms</div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {dict.dashboard.activeTrieCidrs}
            </CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xl font-bold">
              {(metrics?.activeTrieCidrs ?? 54133).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
      ) : null}

      {/* Stacked Traffic Timeline & Threat Vector Breakdown */}
      {visibleWidgets.timelineCharts ? (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">
              {dict.dashboard.trafficTrendTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.trendSeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="bucket" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  stackId="1"
                  dataKey="clean"
                  stroke="#10b981"
                  fill="rgba(16, 185, 129, 0.25)"
                />
                <Area
                  type="monotone"
                  stackId="1"
                  dataKey="suspicious"
                  stroke="#f59e0b"
                  fill="rgba(245, 158, 11, 0.28)"
                />
                <Area
                  type="monotone"
                  stackId="1"
                  dataKey="highRisk"
                  stroke="#ef4444"
                  fill="rgba(239, 68, 68, 0.35)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">
              {dict.dashboard.threatBreakdownTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.vectorDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="vector" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      ) : null}

      {/* ==========================================================================
          TRYCAP.DEV 2x2 TELEMETRY GRID:
          1. Location (List View with horizontal bars + World Map SVG Toggle)
          2. Networks (ISP / ASN Leaderboard with Brand Badges, bar fill, count & %)
          3. Platform (Donut Ring Chart: Phone / Desktop / Tablet)
          4. OS & Browsers (Horizontal shaded bar rows with OS icons, count & %)
         ========================================================================== */}
      {visibleWidgets.trycapGrid ? (
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. LOCATION CARD (List / Map Toggle) */}
        <Card className="flex flex-col justify-between border-border/90 bg-card/95">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">{dict.dashboard.cardLocation}</CardTitle>
            <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
              <button
                type="button"
                onClick={() => setLocationView("list")}
                aria-label={dict.dashboard.viewList}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  locationView === "list"
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLocationView("map")}
                aria-label={dict.dashboard.viewMap}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  locationView === "map"
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Globe className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="max-h-[420px] flex-1 overflow-y-auto pr-2">
            {locationView === "list" ? (
              (metrics?.topCountries ?? []).length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                  <Globe className="h-6 w-6 opacity-40" />
                  <span>{dict.common.noDataPeriod}</span>
                </div>
              ) : (
              <div className="space-y-1.5">
                {(metrics?.topCountries ?? []).map((c) => {
                  const widthPct = Math.max(8, Math.round((c.count / maxCountryCount) * 100));
                  return (
                    <div
                      key={c.country}
                      className="group relative flex items-center justify-between overflow-hidden rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/40"
                    >
                      {/* Shaded Horizontal Bar Pill behind label (TryCap style) */}
                      <div
                        className="pointer-events-none absolute inset-y-0.5 left-0 rounded-lg bg-secondary/65 transition-all group-hover:bg-primary/15"
                        style={{ width: `${widthPct}%` }}
                      />
                      <div className="relative z-10 flex items-center gap-2.5">
                        <CountryFlag code={c.code ?? c.country.slice(0, 2)} />
                        <span className="font-medium text-foreground">{c.country}</span>
                      </div>
                      <div className="relative z-10 flex items-center gap-4 font-mono text-xs">
                        <span className="font-semibold text-foreground">
                          {formatCompactCount(c.count)}
                        </span>
                        <span className="w-9 text-right text-muted-foreground">
                          {c.share ?? 1}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              )
            ) : (
              /* Authentic Natural Earth 110m Choropleth World Map (TryCap style) */
              <InteractiveWorldMap countries={metrics?.topCountries ?? []} />
            )}
          </CardContent>
        </Card>

        {/* 2. NETWORKS CARD (TryCap ISP / ASN Leaderboard with Brand Icons & Search) */}
        <Card className="flex flex-col justify-between border-border/90 bg-card/95">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {dict.dashboard.cardNetworks}
              </CardTitle>
              <button
                type="button"
                onClick={() => setShowNetworkSearch((s) => !s)}
                aria-label={dict.dashboard.searchNetworks}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            {showNetworkSearch ? (
              <Input
                value={networkSearch}
                onChange={(e) => setNetworkSearch(e.target.value)}
                placeholder={dict.dashboard.searchNetworks}
                className="h-8 text-xs"
              />
            ) : null}
          </CardHeader>

          <CardContent className="max-h-[420px] flex-1 overflow-y-auto pr-2">
            {filteredNetworks.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <Search className="h-6 w-6 opacity-40" />
                <span>{dict.common.noDataPeriod}</span>
              </div>
            ) : (
            <div className="space-y-1.5">
              {filteredNetworks.map((net) => {
                const widthPct = Math.max(8, Math.round((net.count / maxNetworkCount) * 100));
                return (
                  <div
                    key={net.asnNumber}
                    className="group relative flex items-center justify-between overflow-hidden rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-secondary/40"
                  >
                    {/* Shaded Horizontal Progress Pill behind Network Row */}
                    <div
                      className="pointer-events-none absolute inset-y-0.5 left-0 rounded-lg bg-secondary/65 transition-all group-hover:bg-primary/15"
                      style={{ width: `${widthPct}%` }}
                    />

                    <div className="relative z-10 flex min-w-0 items-center gap-2.5 pr-3">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-extrabold text-white shadow-xs"
                        style={{ backgroundColor: net.brandColor ?? "#6366f1" }}
                        title={`AS${net.asnNumber}`}
                      >
                        {net.badgeText ?? "AS"}
                      </span>
                      <span className="truncate font-medium text-foreground">{net.asnOrg}</span>
                      <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                        AS{net.asnNumber}
                      </span>
                      {net.isRisk ? (
                        <Badge variant="warning" className="px-1.5 py-0 text-[9px]">
                          VPN/DC
                        </Badge>
                      ) : null}
                    </div>

                    <div className="relative z-10 flex shrink-0 items-center gap-4 font-mono text-xs">
                      <span className="font-semibold text-foreground">
                        {formatCompactCount(net.count)}
                      </span>
                      <span className="w-9 text-right text-muted-foreground">
                        {net.share ?? 1}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </CardContent>
        </Card>

        {/* 3. PLATFORM CARD (TryCap Donut Ring Chart: Phone / Desktop / Tablet) */}
        <Card className="border-border/90 bg-card/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{dict.dashboard.cardPlatform}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-between gap-6 pt-2 sm:flex-row sm:px-8">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={4}
                    cornerRadius={8}
                    stroke="none"
                  >
                    {platformData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full max-w-xs space-y-3">
              {platformData.map((item, idx) => {
                const color = PLATFORM_COLORS[idx % PLATFORM_COLORS.length];
                const label =
                  item.name === "Phone"
                    ? dict.dashboard.platformPhone
                    : item.name === "Desktop"
                      ? dict.dashboard.platformDesktop
                      : dict.dashboard.platformTablet;
                const Icon =
                  item.name === "Phone"
                    ? Smartphone
                    : item.name === "Desktop"
                      ? Monitor
                      : Tablet;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/20 px-3.5 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{label}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="font-bold text-foreground">
                        {formatCompactCount(item.count)}
                      </span>
                      <span className="w-9 text-right text-muted-foreground">{item.share}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 4. OS & BROWSERS CARD (TryCap Horizontal Shaded Bar Rows with Switcher) */}
        <Card className="border-border/90 bg-card/95">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              {osTab === "os" ? dict.dashboard.cardOs : dict.dashboard.cardBrowsers}
            </CardTitle>
            <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setOsTab("os")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  osTab === "os"
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {dict.dashboard.cardOs}
              </button>
              <button
                type="button"
                onClick={() => setOsTab("browsers")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  osTab === "browsers"
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {dict.dashboard.cardBrowsers}
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-1.5">
            {osTab === "os" ? (
              (metrics?.osDistribution ?? []).length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                  <Monitor className="h-6 w-6 opacity-40" />
                  <span>{dict.common.noDataPeriod}</span>
                </div>
              ) : (
                (metrics?.osDistribution ?? []).map((os) => {
                  const widthPct = Math.max(8, Math.round((os.count / maxOsCount) * 100));
                  return (
                    <div
                      key={os.name}
                      className="group relative flex items-center justify-between overflow-hidden rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/40"
                    >
                      <div
                        className="pointer-events-none absolute inset-y-0.5 left-0 rounded-lg bg-secondary/65 transition-all group-hover:bg-primary/15"
                        style={{ width: `${widthPct}%` }}
                      />
                      <div className="relative z-10 flex items-center gap-2.5">
                        <OsBrandIcon name={os.name} />
                        <span className="font-medium text-foreground">{os.name}</span>
                      </div>
                      <div className="relative z-10 flex items-center gap-4 font-mono text-xs">
                        <span className="font-semibold text-foreground">
                          {formatCompactCount(os.count)}
                        </span>
                        <span className="w-9 text-right text-muted-foreground">
                          {os.share ?? 1}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            ) : (metrics?.browserDistribution ?? []).length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <Globe className="h-6 w-6 opacity-40" />
                <span>{dict.common.noDataPeriod}</span>
              </div>
            ) : (
              (metrics?.browserDistribution ?? []).map((b) => {
                const widthPct = Math.max(8, Math.round((b.count / maxBrowserCount) * 100));
                const share = Math.max(1, Math.round((b.count / totalBrowserCount) * 100));
                return (
                  <div
                    key={b.name}
                    className="group relative flex items-center justify-between overflow-hidden rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/40"
                  >
                    <div
                      className="pointer-events-none absolute inset-y-0.5 left-0 rounded-lg bg-secondary/65 transition-all group-hover:bg-primary/15"
                      style={{ width: `${widthPct}%` }}
                    />
                    <div className="relative z-10 flex items-center gap-2.5">
                      <Globe className="h-4 w-4 text-sky-400" />
                      <span className="font-medium text-foreground">{b.name}</span>
                    </div>
                    <div className="relative z-10 flex items-center gap-4 font-mono text-xs">
                      <span className="font-semibold text-foreground">
                        {formatCompactCount(b.count)}
                      </span>
                      <span className="w-9 text-right text-muted-foreground">{share}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
      ) : null}

      {/* Live Risk Detections Table (Responsive Table + Overflow Scroll) */}
      {visibleWidgets.liveStream ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.dashboard.liveRiskFeedTitle}</CardTitle>
          <CardDescription>{dict.dashboard.liveRiskFeedSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.playground.requestIdLabel}</TableHead>
                  <TableHead>{dict.visitors.visitorId}</TableHead>
                  <TableHead>IP / ASN</TableHead>
                  <TableHead>{dict.playground.detectedFlags}</TableHead>
                  <TableHead>{dict.events.colAction}</TableHead>
                  <TableHead>{dict.visitors.maxDanger}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(metrics?.recentHighRiskEvents ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                      {dict.common.noDataPeriod}
                    </TableCell>
                  </TableRow>
                ) : null}
                {(metrics?.recentHighRiskEvents ?? []).map((evt) => (
                  <TableRow
                    key={evt.publicId}
                    onClick={() => setSelectedEvent(evt)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <CopyableMono
                        value={evt.publicId}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </TableCell>
                    <TableCell>
                      <CopyableMono
                        value={evt.visitorPublicId}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <CopyableMono
                          value={evt.ipAddress}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                        {evt.asnNumber ? (
                          <CopyableMono
                            value={`AS${evt.asnNumber} ${evt.asnOrg ?? ""}`}
                            copyLabel={dict.common.copy}
                            copiedLabel={dict.common.copied}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {evt.isBot ? <Badge variant="destructive">{dict.flags.bot}</Badge> : null}
                        {evt.isSpoofed ? (
                          <Badge variant="warning">{dict.flags.spoofed}</Badge>
                        ) : null}
                        {evt.isTor ? <Badge variant="destructive">{dict.flags.tor}</Badge> : null}
                        {evt.isVpn ? <Badge variant="secondary">{dict.flags.vpn}</Badge> : null}
                        {evt.isDatacenter ? (
                          <Badge variant="outline">{dict.flags.datacenter}</Badge>
                        ) : null}
                        {evt.crossBrowserMatched ? (
                          <Badge variant="success">{dict.flags.crossBrowser}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          evt.ruleAction === "block"
                            ? "destructive"
                            : evt.ruleAction === "challenge"
                              ? "warning"
                              : "outline"
                        }
                      >
                        {evt.ruleAction}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          evt.dangerLevel >= 4
                            ? "destructive"
                            : evt.dangerLevel >= 2
                              ? "warning"
                              : "success"
                        }
                      >
                        {evt.dangerLevel} / 5
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      ) : null}

      <Sheet
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        title={dict.dashboard.drawerTitle}
        description={dict.dashboard.drawerSubtitle}
        closeLabel={dict.common.close}
      >
        {selectedEvent ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{dict.playground.requestIdLabel}</p>
                <CopyableMono
                  value={selectedEvent.publicId}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{dict.visitors.visitorId}</p>
                <CopyableMono
                  value={selectedEvent.visitorPublicId}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{dict.playground.thumbmarkLabel}</p>
                <CopyableMono
                  value={selectedEvent.fullHash}
                  displayValue={`${selectedEvent.fullHash.slice(0, 18)}...`}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{dict.visitors.hardwareHash}</p>
                <CopyableMono
                  value={selectedEvent.hardwareHash}
                  displayValue={`${selectedEvent.hardwareHash.slice(0, 18)}...`}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>
            </div>

            {selectedEvent.ja4Hash ? (
              <div>
                <p className="text-xs text-muted-foreground">JA4 TLS</p>
                <CopyableMono
                  value={selectedEvent.ja4Hash}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>
            ) : null}

            <CollapsibleJsonViewer
              title={dict.visitors.rawComponents}
              data={selectedEvent.components}
              defaultExpanded
            />
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
