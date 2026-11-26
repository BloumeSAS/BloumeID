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
import {
  Activity,
  AlertTriangle,
  Bot,
  Cpu,
  Database,
  GitBranch,
  Globe,
  Network,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
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
  const { dict, timeRange, selectedSiteId } = useI18n();
  const [metrics, setMetrics] = React.useState<DashboardMetricsDTO | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<PublicFingerprintEventDTO | null>(null);

  const loadMetrics = React.useCallback(async () => {
    const params = new URLSearchParams({ period: timeRange, siteId: selectedSiteId });
    const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as DashboardMetricsDTO;
      setMetrics(data);
    }
  }, [timeRange, selectedSiteId]);

  React.useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.dashboard.title}</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">{dict.dashboard.subtitle}</p>
      </div>

      {/* Primary 4 Cap-Style KPI Cards */}
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
                {metrics?.throughputPerMin ?? 4.8} {dict.dashboard.throughputUnit}
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
                {metrics?.returnRatePercent ?? 42}% {dict.dashboard.returnRateUnit}
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

      {/* Secondary 4 Deep Telemetry KPI Cards */}
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
                {metrics?.vpnSharePercent ?? 28}%
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
            <div className="font-mono text-xl font-bold">{metrics?.avgCollectionMs ?? 11} ms</div>
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

      {/* Stacked Traffic Timeline & Threat Vector Breakdown */}
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

      {/* Leaderboards: Top Countries, Top ASNs, Browser & OS Breakdown */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm">{dict.dashboard.topCountriesTitle}</CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            {(metrics?.topCountries ?? []).map((c) => (
              <div key={c.country} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{c.country}</span>
                  <span className="font-mono text-muted-foreground">{c.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, c.count * 2.5)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm">{dict.dashboard.topAsnsTitle}</CardTitle>
            <Network className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(metrics?.topAsns ?? []).map((a) => (
              <div
                key={a.asnNumber}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-2.5 py-1.5 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <CopyableMono
                    value={`AS${a.asnNumber}`}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{a.asnOrg}</p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {a.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{dict.dashboard.browserBreakdownTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(metrics?.browserDistribution ?? []).map((b) => (
              <div key={b.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{b.name}</span>
                  <span className="font-mono text-muted-foreground">{b.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${Math.min(100, b.count * 1.8)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{dict.dashboard.osBreakdownTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(metrics?.osDistribution ?? []).map((os) => (
              <div key={os.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{os.name}</span>
                  <span className="font-mono text-muted-foreground">{os.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, os.count * 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Live Risk Detections Table (Responsive Table + Overflow Scroll) */}
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
