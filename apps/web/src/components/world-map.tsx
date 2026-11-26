"use client";

import * as React from "react";
import { useI18n } from "@/i18n/provider";
import { WORLD_COUNTRY_PATHS } from "./world-map-data";
import { CountryFlag } from "./ui/country-flag";

export interface CountryTrafficPoint {
  country: string;
  code?: string;
  count: number;
  share?: number;
}

export function InteractiveWorldMap({
  countries,
}: {
  countries: CountryTrafficPoint[];
}) {
  const { dict } = useI18n();
  const [hovered, setHovered] = React.useState<{
    id: string;
    name: string;
    count: number;
    share: number;
  } | null>(null);

  const byIso = React.useMemo(() => {
    const map = new Map<string, { country: string; count: number; share: number }>();
    for (const c of countries) {
      const code = (c.code ?? c.country.slice(0, 2)).toUpperCase();
      map.set(code, {
        country: c.country,
        count: c.count,
        share: c.share ?? 1,
      });
    }
    return map;
  }, [countries]);

  const maxCount = React.useMemo(() => {
    let m = 1;
    for (const c of countries) {
      if (c.count > m) m = c.count;
    }
    return m;
  }, [countries]);

  const getCountryFill = (isoCode: string, isHovered: boolean): string => {
    const stat = byIso.get(isoCode);
    if (!stat || stat.count <= 0) {
      return isHovered ? "#334155" : "#1e293b";
    }
    const ratio = stat.count / maxCount;
    if (ratio >= 0.65) {
      return isHovered ? "#93c5fd" : "#60a5fa";
    }
    if (ratio >= 0.2) {
      return isHovered ? "#60a5fa" : "#3b82f6";
    }
    if (ratio >= 0.06) {
      return isHovered ? "#3b82f6" : "#2563eb";
    }
    return isHovered ? "#3b82f6" : "#1d4ed8";
  };

  return (
    <div className="relative flex h-[370px] w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-background/40 p-2">
      {/* Floating Hover Tooltip */}
      {hovered ? (
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md">
          <CountryFlag code={hovered.id} />
          <span className="font-semibold text-foreground">{hovered.name}</span>
          <span className="font-mono font-bold text-primary">
            {hovered.count.toLocaleString()}
          </span>
          <span className="font-mono text-muted-foreground">({hovered.share}%)</span>
        </div>
      ) : null}

      <svg
        viewBox="0 0 880 460"
        className="h-full w-full select-none"
        role="img"
        aria-label={dict.landing.worldMapAriaLabel}
      >
        <g>
          {WORLD_COUNTRY_PATHS.map((country) => {
            const stat = byIso.get(country.id);
            const isHovered = hovered?.id === country.id;
            const hasTraffic = Boolean(stat && stat.count > 0);
            return (
              <path
                key={`${country.id}-${country.name}`}
                d={country.d}
                fill={getCountryFill(country.id, isHovered)}
                stroke="#0f172a"
                strokeWidth={hasTraffic ? "0.8" : "0.5"}
                className="cursor-pointer transition-colors duration-150"
                onMouseEnter={() =>
                  setHovered({
                    id: country.id,
                    name: stat?.country ?? country.name,
                    count: stat?.count ?? 0,
                    share: stat?.share ?? 0,
                  })
                }
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

