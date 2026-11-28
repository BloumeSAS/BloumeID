"use client";

import * as React from "react";
import { Bot, EyeOff, Globe, ShieldAlert, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { DashboardMetricsDTO } from "@/types";

export default function SmartSignalsPage() {
  const { dict, timeRange, selectedSiteId, refreshTick } = useI18n();
  const [metrics, setMetrics] = React.useState<DashboardMetricsDTO | null>(null);
  const [toggles, setToggles] = React.useState({
    bots: true,
    fraud: true,
    network: true,
    spoof: true,
    incognito: true,
  });

  React.useEffect(() => {
    const params = new URLSearchParams({ period: timeRange, siteId: selectedSiteId });
    fetch(`/api/admin/dashboard?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DashboardMetricsDTO | null) => {
        if (data) setMetrics(data);
      })
      .catch(() => undefined);
  }, [timeRange, selectedSiteId, refreshTick]);

  const datacenterCount =
    metrics?.vectorDistribution.find((v) => v.vector.includes("Datacenter"))?.count ?? 0;

  const cards = [
    {
      key: "bots" as const,
      title: dict.smartSignals.botsTitle,
      desc: dict.smartSignals.botsDesc,
      icon: Bot,
      color: "text-rose-500",
      count: metrics?.vectorDistribution.find((v) => v.vector.includes("Bot"))?.count ?? 0,
    },
    {
      key: "fraud" as const,
      title: dict.smartSignals.fraudTitle,
      desc: dict.smartSignals.fraudDesc,
      icon: ShieldAlert,
      color: "text-amber-500",
      count: metrics?.highRiskDetections ?? 0,
    },
    {
      key: "network" as const,
      title: dict.smartSignals.networkTitle,
      desc: dict.smartSignals.networkDesc,
      icon: Globe,
      color: "text-sky-500",
      count: (metrics?.vpnTorCount ?? 0) + datacenterCount,
    },
    {
      key: "spoof" as const,
      title: dict.smartSignals.spoofTitle,
      desc: dict.smartSignals.spoofDesc,
      icon: Sparkles,
      color: "text-primary",
      count: metrics?.vectorDistribution.find((v) => v.vector.includes("Spoof"))?.count ?? 0,
    },
    {
      key: "incognito" as const,
      title: dict.smartSignals.incognitoTitle,
      desc: dict.smartSignals.incognitoDesc,
      icon: EyeOff,
      color: "text-emerald-500",
      count: metrics?.vectorDistribution.find((v) => v.vector.includes("Incognito"))?.count ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {dict.smartSignals.title}
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {dict.smartSignals.subtitle}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key} className="flex flex-col justify-between">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${c.color}`} />
                    <CardTitle className="text-base">{c.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{c.desc}</CardDescription>
                </div>
                <Switch
                  checked={toggles[c.key]}
                  ariaLabel={c.title}
                  onCheckedChange={(v) => setToggles((prev) => ({ ...prev, [c.key]: v }))}
                />
              </CardHeader>
              <CardContent className="flex items-center justify-between border-t border-border/60 pt-4">
                <span className="font-mono text-2xl font-bold text-foreground">{c.count}</span>
                <Badge variant={toggles[c.key] ? "success" : "secondary"}>
                  {toggles[c.key] ? dict.smartSignals.activeSignals : dict.common.disabled}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

