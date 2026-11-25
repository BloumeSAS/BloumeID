"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertTriangle, Bot, Users } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
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
import type { DashboardMetricsDTO, PublicFingerprintEventDTO } from "@/types";

export default function DashboardPage() {
  const { dict } = useI18n();
  const [period, setPeriod] = React.useState<"24h" | "7d" | "30d">("24h");
  const [metrics, setMetrics] = React.useState<DashboardMetricsDTO | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<PublicFingerprintEventDTO | null>(null);

  const loadMetrics = React.useCallback(async (p: "24h" | "7d" | "30d") => {
    const res = await fetch(`/api/admin/dashboard?period=${p}`);
    if (res.ok) {
      const data = (await res.json()) as DashboardMetricsDTO;
      setMetrics(data);
    }
  }, []);

  React.useEffect(() => {
    void loadMetrics(period);
  }, [period, loadMetrics]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground">{dict.dashboard.subtitle}</p>
        </div>

        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {(["24h", "7d", "30d"] as const).map((p) => {
            const label =
              p === "24h"
                ? dict.dashboard.period24h
                : p === "7d"
                  ? dict.dashboard.period7d
                  : dict.dashboard.period30d;
            return (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={period === p ? "default" : "ghost"}
                onClick={() => setPeriod(p)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.dashboard.totalEvents}
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">{metrics?.totalEvents ?? 0}</div>
            <p className="mt-1 text-xs text-emerald-400">
              +{metrics?.totalEventsDelta ?? 0}% {dict.dashboard.vsPreviousPeriod}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.dashboard.uniqueVisitors}
            </CardTitle>
            <Users className="h-4 w-4 text-sky-400" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">{metrics?.uniqueVisitors ?? 0}</div>
            <p className="mt-1 text-xs text-emerald-400">
              +{metrics?.uniqueVisitorsDelta ?? 0}% {dict.dashboard.vsPreviousPeriod}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.dashboard.highRiskDetections}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">{metrics?.highRiskDetections ?? 0}</div>
            <p className="mt-1 text-xs text-amber-300">
              {metrics?.highRiskDelta ?? 0}% {dict.dashboard.vsPreviousPeriod}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dict.dashboard.botBlockedRate}
            </CardTitle>
            <Bot className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">{metrics?.botSpoofRate ?? 0}%</div>
            <p className="mt-1 text-xs text-rose-300">
              +{metrics?.botSpoofDelta ?? 0}% {dict.dashboard.vsPreviousPeriod}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.dashboard.trafficTrendTitle}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.trendSeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(252 26% 18%)" />
                <XAxis dataKey="bucket" stroke="hsl(250 16% 65%)" fontSize={12} />
                <YAxis stroke="hsl(250 16% 65%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(252 40% 8%)",
                    borderColor: "hsl(252 26% 18%)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(263 85% 66%)"
                  fill="hsl(263 85% 66% / 0.25)"
                />
                <Area
                  type="monotone"
                  dataKey="highRisk"
                  stroke="hsl(350 84% 60%)"
                  fill="hsl(350 84% 60% / 0.25)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.dashboard.threatBreakdownTitle}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.vectorDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(252 26% 18%)" />
                <XAxis dataKey="vector" stroke="hsl(250 16% 65%)" fontSize={11} />
                <YAxis stroke="hsl(250 16% 65%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(252 40% 8%)",
                    borderColor: "hsl(252 26% 18%)",
                  }}
                />
                <Bar dataKey="count" fill="hsl(192 85% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.dashboard.liveRiskFeedTitle}</CardTitle>
          <CardDescription>{dict.dashboard.liveRiskFeedSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.playground.requestIdLabel}</TableHead>
                <TableHead>{dict.visitors.visitorId}</TableHead>
                <TableHead>IP / ASN</TableHead>
                <TableHead>{dict.playground.detectedFlags}</TableHead>
                <TableHead>{dict.visitors.maxDanger}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
                      {evt.isSpoofed ? <Badge variant="warning">{dict.flags.spoofed}</Badge> : null}
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
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        title={dict.dashboard.drawerTitle}
        description={dict.dashboard.drawerSubtitle}
        closeLabel={dict.common.close}
      >
        {selectedEvent ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
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
