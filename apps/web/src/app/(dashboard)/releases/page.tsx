"use client";

import * as React from "react";
import { CheckCircle2, FileText, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReleaseNotesPage() {
  const { dict } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-[#d946ef]" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {dict.releasesPage.title}
          </h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {dict.releasesPage.subtitle}
        </p>
      </div>

      <Card className="border-[#635bff]/35 bg-[#100e1a]">
        <CardHeader className="border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-[#d946ef]" />
              <CardTitle className="text-lg">{dict.releasesPage.v1Title}</CardTitle>
            </div>
            <Badge className="bg-[#635bff] font-mono text-xs text-white">v1.0.0</Badge>
          </div>
          <CardDescription className="font-mono text-xs">
            {dict.releasesPage.v1Date}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {[
            dict.releasesPage.v1Item1,
            dict.releasesPage.v1Item2,
            dict.releasesPage.v1Item3,
            dict.releasesPage.v1Item4,
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#0b0a12] p-4 text-sm text-slate-200"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

