"use client";

import * as React from "react";
import { AlertTriangle, ArrowRightLeft, Gauge, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalloutVariant = "tip" | "security" | "perf" | "migration";

interface GuideCalloutProps {
  variant: CalloutVariant;
  title: string;
  body: string;
  className?: string;
}

const CALLOUT_STYLES: Record<
  CalloutVariant,
  { container: string; iconWrap: string; title: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  tip: {
    container: "border-indigo-500/30 bg-indigo-500/5",
    iconWrap: "bg-indigo-500/15 text-indigo-400",
    title: "text-indigo-400",
    Icon: Lightbulb,
  },
  security: {
    container: "border-rose-500/35 bg-rose-500/5",
    iconWrap: "bg-rose-500/15 text-rose-400",
    title: "text-rose-400",
    Icon: AlertTriangle,
  },
  perf: {
    container: "border-emerald-500/30 bg-emerald-500/5",
    iconWrap: "bg-emerald-500/15 text-emerald-400",
    title: "text-emerald-400",
    Icon: Gauge,
  },
  migration: {
    container: "border-amber-500/30 bg-amber-500/5",
    iconWrap: "bg-amber-500/15 text-amber-400",
    title: "text-amber-400",
    Icon: ArrowRightLeft,
  },
};

export function GuideCallout({ variant, title, body, className }: GuideCalloutProps) {
  const style = CALLOUT_STYLES[variant];
  const Icon = style.Icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-xs leading-relaxed",
        style.container,
        className
      )}
    >
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", style.iconWrap)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <p className={cn("text-xs font-semibold uppercase tracking-wider", style.title)}>{title}</p>
        <p className="text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
