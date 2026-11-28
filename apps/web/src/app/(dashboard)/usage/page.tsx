"use client";

import * as React from "react";
import { Activity, BarChart3, Download } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginateArray } from "@/lib/pagination";
import type { PublicSiteDTO } from "@/types";

export default function UsagePage() {
  const { dict, selectedSiteId, refreshTick } = useI18n();
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);
  const [periodEvents, setPeriodEvents] = React.useState<number | null>(null);
  const [fpProPercent, setFpProPercent] = React.useState<number>(0);
  const [thumbmarkPercent, setThumbmarkPercent] = React.useState<number>(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    setPage(1);
  }, [selectedSiteId]);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/sites?all=true", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { sites?: PublicSiteDTO[] } | null) => {
        if (data?.sites && !controller.signal.aborted) setSites(data.sites);
      })
      .catch(() => undefined);

    const params = new URLSearchParams({ period: "30d", siteId: selectedSiteId });
    fetch(`/api/admin/dashboard?${params.toString()}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            totalEvents?: number;
            recentHighRiskEvents?: Array<{ linkedId: string | null; tag: unknown }>;
          } | null
        ) => {
          if (typeof data?.totalEvents === "number" && !controller.signal.aborted) {
            setPeriodEvents(data.totalEvents);
            const evts = data.recentHighRiskEvents ?? [];
            if (data.totalEvents === 0 || evts.length === 0) {
              setFpProPercent(0);
              setThumbmarkPercent(0);
            } else {
              const fpTagged = evts.filter((e) => Boolean(e.linkedId) || Boolean(e.tag)).length;
              const fpPct = Math.round((fpTagged / evts.length) * 100);
              setFpProPercent(fpPct);
              setThumbmarkPercent(100 - fpPct);
            }
          }
        }
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, [selectedSiteId, refreshTick]);

  const scopedSites = React.useMemo(
    () => (selectedSiteId === "all" ? sites : sites.filter((s) => s.publicId === selectedSiteId)),
    [sites, selectedSiteId]
  );
  const siteSum30d = scopedSites.reduce((acc, s) => acc + (s.requests30d ?? 0), 0);
  const total30d = Math.max(periodEvents ?? 0, siteSum30d);
  const paginatedSites = React.useMemo(
    () => paginateArray(scopedSites, page, pageSize),
    [scopedSites, page, pageSize]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.usagePage.title}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{dict.usagePage.subtitle}</p>
        </div>

        <a href="/api/admin/settings?export=csv" download>
          <Button type="button" variant="outline" size="sm">
            <Download className="h-4 w-4" />
            <span>{dict.settings.exportCsv}</span>
          </Button>
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{dict.usagePage.totalRequests30d}</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="font-mono text-2xl font-bold">
            {total30d.toLocaleString()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{dict.usagePage.thumbmarkCalls}</CardTitle>
            <Activity className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent className="font-mono text-2xl font-bold">
            {thumbmarkPercent}%
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{dict.usagePage.fpProCalls}</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="font-mono text-2xl font-bold">{fpProPercent}%</CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {paginatedSites.items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-xs text-muted-foreground">
              {dict.common.noSitesYet}
            </CardContent>
          </Card>
        ) : null}
        {paginatedSites.items.map((s) => (
          <Card key={s.publicId}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.name}</span>
                  <CopyableMono
                    value={s.publicId}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <Badge variant="outline">
                  {dict.sites.requests24h}: {s.requests24h ?? 0}
                </Badge>
                <Badge variant="secondary">
                  {dict.sites.requests30d}: {s.requests30d ?? 0}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataPagination
        page={paginatedSites.pagination.page}
        pageSize={paginatedSites.pagination.pageSize}
        totalItems={paginatedSites.pagination.totalItems}
        totalPages={paginatedSites.pagination.totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

