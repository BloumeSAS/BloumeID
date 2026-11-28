"use client";

import * as React from "react";
import { Cpu, Database, Globe, HeartPulse, Server } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { APP_VERSION } from "@/lib/version";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthResponse {
  status: string;
  version: string;
  workerId: number;
  threatTrieCidrs: number;
  badAsnCount?: number;
  sdkBundleSizeKb?: number;
  geoipLoaded: boolean;
  geoipMode: string;
  timestamp: string;
}

export default function HealthPage() {
  const { dict } = useI18n();
  const [health, setHealth] = React.useState<HealthResponse | null>(null);

  React.useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: HealthResponse | null) => {
        if (data) setHealth(data);
      })
      .catch(() => undefined);
  }, []);

  const items = [
    {
      title: dict.healthPage.dbCard,
      icon: Database,
      value: "PostgreSQL 17 + Prisma",
      ok: health?.status === "ok",
    },
    {
      title: dict.healthPage.redisCard,
      icon: Server,
      value: "Valkey / Redis 8",
      ok: health?.status === "ok",
    },
    {
      title: dict.healthPage.trieCard,
      icon: Cpu,
      value: `${(health?.threatTrieCidrs ?? 0).toLocaleString()} CIDRs / ${(health?.badAsnCount ?? 0).toLocaleString()} ASNs`,
      ok: (health?.threatTrieCidrs ?? 0) > 0,
    },
    {
      title: dict.healthPage.geoipCard,
      icon: Globe,
      value: health?.geoipLoaded ? "GeoLite2-City + ASN" : health?.geoipMode ?? "open_mirror",
      ok: Boolean(health),
    },
    {
      title: dict.healthPage.sdkCard,
      icon: HeartPulse,
      value: `v${health?.version ?? APP_VERSION} (${health?.sdkBundleSizeKb ?? 42} KB)`,
      ok: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.healthPage.title}</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">{dict.healthPage.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {item.value}
                </span>
                <Badge variant={item.ok ? "success" : "warning"}>{dict.healthPage.healthy}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

