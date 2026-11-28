"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Globe,
  LayoutDashboard,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { APP_VERSION_TAG } from "@/lib/version";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PreviewTab = "overview" | "events" | "visitors" | "rules";
type PreviewPeriod = "1h" | "24h" | "7d" | "30d";

const PERIOD_MULTIPLIER: Record<PreviewPeriod, number> = {
  "1h": 0.12,
  "24h": 1,
  "7d": 6.4,
  "30d": 24.8,
};

export function LandingPanelPreview() {
  const { dict } = useI18n();
  const [activeTab, setActiveTab] = React.useState<PreviewTab>("overview");
  const [period, setPeriod] = React.useState<PreviewPeriod>("24h");

  const mult = PERIOD_MULTIPLIER[period];
  const totalEvents = Math.round(14820 * mult).toLocaleString();
  const uniqueVisitors = Math.round(4910 * mult).toLocaleString();
  const highRisk = Math.round(312 * mult).toLocaleString();

  const navItems: Array<{ id: PreviewTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "overview", label: dict.landing.previewNavOverview, icon: LayoutDashboard },
    { id: "events", label: dict.landing.previewNavEvents, icon: Activity },
    { id: "visitors", label: dict.landing.previewNavVisitors, icon: Users },
    { id: "rules", label: dict.landing.previewNavRules, icon: Shield },
  ];

  return (
    <section id="panel-preview" className="scroll-mt-20 space-y-6">
      <div className="text-center">
        <Badge variant="outline" className="mb-2 font-mono text-[11px]">
          <LayoutDashboard className="mr-1.5 h-3.5 w-3.5 text-primary" />
          <span>{dict.landing.previewSectionBadge}</span>
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {dict.landing.previewSectionTitle}
        </h2>
        <p className="mx-auto mt-1 max-w-2xl text-sm text-muted-foreground">
          {dict.landing.previewSectionSubtitle}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl">
        {/* Top Window Chrome */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-secondary/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">
              id.bloume.fr/{activeTab === "overview" ? "dashboard" : activeTab} · {APP_VERSION_TAG}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              {(["1h", "24h", "7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md px-2 py-0.5 font-mono text-[11px] font-medium transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Link href="/dashboard">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                <span>{dict.landing.adminConsole}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Authentic Sidebar + Main Workspace */}
        <div className="grid min-h-[420px] md:grid-cols-12">
          <aside className="border-b border-border/60 bg-background/60 p-3 md:col-span-3 md:border-b-0 md:border-r">
            <div className="mb-4 px-2">
              <BrandLogo variant="full" size="sm" showVersion />
            </div>
            <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all",
                      isActive
                        ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="p-5 md:col-span-9">
            {activeTab === "overview" ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-secondary/20 p-3.5">
                    <p className="text-xs text-muted-foreground">{dict.landing.kpiIdentifications}</p>
                    <p className="mt-1 font-mono text-2xl font-bold">{totalEvents}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3.5">
                    <p className="text-xs text-muted-foreground">{dict.dashboard.uniqueVisitors}</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-emerald-500">
                      {uniqueVisitors}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3.5">
                    <p className="text-xs text-muted-foreground">{dict.landing.kpiThreatsBlocked}</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-rose-500">{highRisk}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2.5 rounded-xl border border-border bg-secondary/15 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        <span>{dict.landing.topNetworksTitle}</span>
                      </span>
                      <span className="font-mono text-muted-foreground">{period}</span>
                    </div>
                    {[
                      { label: "FR · AS3215 Orange S.A.", pct: 48 },
                      { label: "FR · AS12322 Free SAS", pct: 29 },
                      { label: "DE · AS24940 Hetzner (DC)", pct: 14 },
                    ].map((row) => (
                      <div key={row.label} className="space-y-1">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span>{row.label}</span>
                          <span className="text-muted-foreground">{row.pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full bg-primary" style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2.5 rounded-xl border border-border bg-secondary/15 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{dict.dashboard.cardPlatform}</span>
                      <span className="font-mono text-muted-foreground">{period}</span>
                    </div>
                    {[
                      { name: dict.dashboard.platformDesktop, pct: 58, color: "bg-sky-400" },
                      { name: dict.dashboard.platformPhone, pct: 37, color: "bg-emerald-400" },
                      { name: dict.dashboard.platformTablet, pct: 5, color: "bg-purple-400" },
                    ].map((p) => (
                      <div key={p.name} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-1.5 text-xs">
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", p.color)} />
                          <span>{p.name}</span>
                        </span>
                        <span className="font-mono text-muted-foreground">{p.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "events" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{dict.events.title}</h3>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {period}
                  </Badge>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">{dict.playground.requestIdLabel}</th>
                        <th className="px-3 py-2">IP / ASN</th>
                        <th className="px-3 py-2">{dict.events.colAction}</th>
                        <th className="px-3 py-2">{dict.visitors.maxDanger}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {[
                        { id: "req_749201884201", ip: "185.220.101.19 (AS24940)", action: "block", danger: 5 },
                        { id: "req_749201884198", ip: "185.159.156.42 (AS212238)", action: "flag", danger: 3 },
                        { id: "req_749201884172", ip: "90.63.241.14 (AS3215)", action: "allow", danger: 0 },
                      ].map((e) => (
                        <tr key={e.id}>
                          <td className="px-3 py-2">{e.id}</td>
                          <td className="px-3 py-2 text-muted-foreground">{e.ip}</td>
                          <td className="px-3 py-2">
                            <Badge variant={e.action === "block" ? "destructive" : e.action === "flag" ? "warning" : "success"}>
                              {e.action}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{e.danger}/5</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {activeTab === "visitors" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{dict.visitors.title}</h3>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {period}
                  </Badge>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">{dict.visitors.visitorId}</th>
                        <th className="px-3 py-2">{dict.visitors.visitCount}</th>
                        <th className="px-3 py-2">{dict.common.status}</th>
                        <th className="px-3 py-2">{dict.visitors.maxDanger}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {[
                        { id: "vis_749201880102", visits: 14, status: "trusted", danger: 0 },
                        { id: "vis_749201880109", visits: 4, status: "neutral", danger: 2 },
                        { id: "vis_749201880115", visits: 9, status: "blocked", danger: 5 },
                      ].map((v) => (
                        <tr key={v.id}>
                          <td className="px-3 py-2 text-primary">{v.id}</td>
                          <td className="px-3 py-2">{v.visits}</td>
                          <td className="px-3 py-2">
                            <Badge variant={v.status === "blocked" ? "destructive" : v.status === "trusted" ? "success" : "secondary"}>
                              {v.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{v.danger}/5</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {activeTab === "rules" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{dict.rules.title}</h3>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="space-y-2.5">
                  {[
                    { name: "Block Tor Exit Nodes & Headless CDP", cond: "isTor == true && dangerLevel >= 4", action: "block" },
                    { name: "Challenge Anti-Detect & Prototype Hooks", cond: "isSpoofed == true", action: "challenge" },
                  ].map((r) => (
                    <div key={r.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/20 p-3">
                      <div>
                        <p className="text-xs font-semibold">{r.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{r.cond}</p>
                      </div>
                      <Badge variant={r.action === "block" ? "destructive" : "warning"}>
                        <ShieldAlert className="mr-1 h-3 w-3" />
                        {r.action}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
