"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  closeLabel: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  className,
}: SheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-card p-6 text-card-foreground shadow-2xl",
          className
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={closeLabel}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
