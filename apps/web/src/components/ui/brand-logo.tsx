"use client";

import * as React from "react";
import { useI18n } from "@/i18n/provider";
import { APP_VERSION_TAG } from "@/lib/version";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BrandLogoVariant = "icon" | "full";
export type BrandLogoSize = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<BrandLogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  showVersion?: boolean;
  className?: string;
}

export function BrandLogo({
  variant = "full",
  size = "md",
  showVersion = false,
  className,
}: BrandLogoProps) {
  const { dict } = useI18n();
  const px = SIZE_PX[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <img
        src="/brand/logo.png"
        alt={dict.common.brandName}
        width={px}
        height={px}
        draggable={false}
        className="shrink-0 rounded-lg object-contain select-none shadow-sm"
        style={{ width: px, height: px }}
      />
      {variant === "full" ? (
        <span className="inline-flex items-center gap-2">
          <span className="font-bold tracking-tight text-foreground">{dict.common.brandName}</span>
          {showVersion ? (
            <Badge variant="outline" className="font-mono text-[10px]">
              {APP_VERSION_TAG}
            </Badge>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
