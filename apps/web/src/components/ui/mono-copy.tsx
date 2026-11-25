"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MonoCopyProps {
  value: string;
  truncate?: number;
  className?: string;
  copyAriaLabel?: string;
}

export function MonoCopy({
  value,
  truncate,
  className,
  copyAriaLabel = "Copy identifier",
}: MonoCopyProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored in headless environments without clipboard permission
    }
  };

  const displayed =
    truncate && value.length > truncate ? `${value.slice(0, truncate)}…` : value;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/50 px-2 py-0.5 font-mono text-xs text-foreground",
        className
      )}
      title={value}
    >
      <span className="select-all">{displayed}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copyAriaLabel}
        className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-primary focus:outline-none"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}
