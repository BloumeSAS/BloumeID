"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Shield, ShieldAlert } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type SupportedErrorCode = 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503;

export function ErrorPageShell({
  code,
  onRetry,
}: {
  code: SupportedErrorCode;
  onRetry?: () => void;
}) {
  const { dict } = useI18n();

  const meta = (() => {
    switch (code) {
      case 400:
        return { title: dict.errors.code400Title, desc: dict.errors.code400Desc };
      case 401:
        return { title: dict.errors.code401Title, desc: dict.errors.code401Desc };
      case 403:
        return { title: dict.errors.code403Title, desc: dict.errors.code403Desc };
      case 404:
        return { title: dict.errors.code404Title, desc: dict.errors.code404Desc };
      case 429:
        return { title: dict.errors.code429Title, desc: dict.errors.code429Desc };
      case 502:
        return { title: dict.errors.code502Title, desc: dict.errors.code502Desc };
      case 503:
        return { title: dict.errors.code503Title, desc: dict.errors.code503Desc };
      default:
        return { title: dict.errors.code500Title, desc: dict.errors.code500Desc };
    }
  })();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.07)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <Card className="relative z-10 w-full max-w-lg border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl">
        <CardContent className="space-y-6 p-8 text-center">
          <div className="flex justify-center">
            <BrandLogo variant="full" size="sm" />
          </div>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="border-primary/40 font-mono text-xs text-primary">
              HTTP {code}
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.desc}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
                <span>{dict.errors.backHome}</span>
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                <Shield className="h-4 w-4 text-primary" />
                <span>{dict.errors.openAdmin}</span>
              </Button>
            </Link>

            {onRetry ? (
              <Button type="button" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4" />
                <span>{dict.errors.retry}</span>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

