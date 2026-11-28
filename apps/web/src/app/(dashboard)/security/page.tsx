"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { DataPagination } from "@/components/ui/data-pagination";
import type { PaginationMeta, PublicVisitorDTO } from "@/types";

export default function SecurityCenterPage() {
  const { dict, timeRange, selectedSiteId, refreshTick } = useI18n();
  const [blocked, setBlocked] = React.useState<PublicVisitorDTO[]>([]);
  const [trusted, setTrusted] = React.useState<PublicVisitorDTO[]>([]);
  const [blockedPage, setBlockedPage] = React.useState(1);
  const [trustedPage, setTrustedPage] = React.useState(1);
  const [blockedMeta, setBlockedMeta] = React.useState<PaginationMeta>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [trustedMeta, setTrustedMeta] = React.useState<PaginationMeta>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const securityFilterKey = `${timeRange}|${selectedSiteId}`;
  const prevSecurityFilterKeyRef = React.useRef(securityFilterKey);

  React.useEffect(() => {
    if (prevSecurityFilterKeyRef.current !== securityFilterKey) {
      prevSecurityFilterKeyRef.current = securityFilterKey;
      if (blockedPage !== 1 || trustedPage !== 1) {
        setBlockedPage(1);
        setTrustedPage(1);
        return undefined;
      }
    }

    const controller = new AbortController();
    const baseParams = { period: timeRange, siteId: selectedSiteId, pageSize: "10" };
    const blockedParams = new URLSearchParams({
      ...baseParams,
      trustStatus: "blocked",
      page: String(blockedPage),
    });
    const trustedParams = new URLSearchParams({
      ...baseParams,
      trustStatus: "trusted",
      page: String(trustedPage),
    });

    void Promise.all([
      fetch(`/api/admin/visitors?${blockedParams.toString()}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { visitors?: PublicVisitorDTO[]; pagination?: PaginationMeta } | null) => {
          if (data?.visitors && !controller.signal.aborted) {
            setBlocked(data.visitors);
            if (data.pagination) setBlockedMeta(data.pagination);
          }
        })
        .catch(() => undefined),
      fetch(`/api/admin/visitors?${trustedParams.toString()}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { visitors?: PublicVisitorDTO[]; pagination?: PaginationMeta } | null) => {
          if (data?.visitors && !controller.signal.aborted) {
            setTrusted(data.visitors);
            if (data.pagination) setTrustedMeta(data.pagination);
          }
        })
        .catch(() => undefined),
    ]);

    return () => controller.abort();
  }, [securityFilterKey, timeRange, selectedSiteId, refreshTick, blockedPage, trustedPage]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {dict.securityPage.title}
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {dict.securityPage.subtitle}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{dict.securityPage.corsProtection}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <Badge variant="success">{dict.common.active}</Badge>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{dict.securityPage.masterKeyStatus}</CardTitle>
            <Lock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <Badge variant="success">{dict.common.active}</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{dict.securityPage.blockedVisitors}</CardTitle>
            <Ban className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            {blocked.length === 0 ? (
              <p className="text-xs text-muted-foreground">{dict.common.none}</p>
            ) : (
              blocked.map((v) => (
                <div
                  key={v.publicId}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-2.5"
                >
                  <Link href={`/visitors/${v.publicId}`} className="text-primary hover:underline">
                    <CopyableMono
                      value={v.publicId}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </Link>
                  <Badge variant="destructive">{v.maxDangerLevel} / 5</Badge>
                </div>
              ))
            )}
            <DataPagination
              page={blockedMeta.page}
              pageSize={blockedMeta.pageSize}
              totalItems={blockedMeta.totalItems}
              totalPages={blockedMeta.totalPages}
              onPageChange={setBlockedPage}
              compact
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{dict.securityPage.trustedVisitors}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            {trusted.length === 0 ? (
              <p className="text-xs text-muted-foreground">{dict.common.none}</p>
            ) : (
              trusted.map((v) => (
                <div
                  key={v.publicId}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-2.5"
                >
                  <Link href={`/visitors/${v.publicId}`} className="text-primary hover:underline">
                    <CopyableMono
                      value={v.publicId}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </Link>
                  <Badge variant="success">{dict.visitors.statusTrusted}</Badge>
                </div>
              ))
            )}
            <DataPagination
              page={trustedMeta.page}
              pageSize={trustedMeta.pageSize}
              totalItems={trustedMeta.totalItems}
              totalPages={trustedMeta.totalPages}
              onPageChange={setTrustedPage}
              compact
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

