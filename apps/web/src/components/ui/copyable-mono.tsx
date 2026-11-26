"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopyableMonoProps {
  value: string;
  displayValue?: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}

export function CopyableMono({
  value,
  displayValue,
  copyLabel,
  copiedLabel,
  className,
}: CopyableMonoProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for non-secure context
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-secondary/50 px-2 py-0.5 font-mono text-xs text-foreground",
        className
      )}
    >
      <span className="truncate">{displayValue ?? value}</span>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? copiedLabel : copyLabel}
        aria-label={copied ? copiedLabel : copyLabel}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-primary focus:outline-none"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}

