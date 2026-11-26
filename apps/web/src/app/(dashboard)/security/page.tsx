"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import type { PublicVisitorDTO } from "@/types";

export default function SecurityCenterPage() {
  const { dict } = useI18n();
  const [visitors, setVisitors] = React.useState<PublicVisitorDTO[]>([]);

  React.useEffect(() => {
    fetch("/api/admin/visitors")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { visitors?: PublicVisitorDTO[] } | null) => {
        if (data?.visitors) setVisitors(data.visitors);
      })
      .catch(() => undefined);
  }, []);

  const blocked = visitors.filter((v) => v.trustStatus === "blocked");
  const trusted = visitors.filter((v) => v.trustStatus === "trusted");

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

