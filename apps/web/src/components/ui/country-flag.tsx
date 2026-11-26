"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Crisp inline SVG Country Flag renderer for Windows/Linux/macOS browsers
 * (avoids Windows lack of Unicode Regional Indicator Emoji flag rendering).
 */
export function CountryFlag({
  code,
  className,
}: {
  code?: string | null;
  className?: string;
}) {
  const iso = (code ?? "").trim().toUpperCase().slice(0, 2);

  const renderFlagSvg = () => {
    switch (iso) {
      case "FR":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="8" height="16" x="0" fill="#002395" />
            <rect width="8" height="16" x="8" fill="#ffffff" />
            <rect width="8" height="16" x="16" fill="#ed2939" />
          </svg>
        );
      case "CH":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="24" height="16" fill="#da291c" />
            <rect width="3.2" height="10" x="10.4" y="3" fill="#ffffff" />
            <rect width="10" height="3.2" x="7" y="6.4" fill="#ffffff" />
          </svg>
        );
      case "US":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="24" height="16" fill="#b22234" />
            <rect width="24" height="2.2" y="2.2" fill="#ffffff" />
            <rect width="24" height="2.2" y="6.6" fill="#ffffff" />
            <rect width="24" height="2.2" y="11" fill="#ffffff" />
            <rect width="11" height="8.8" x="0" y="0" fill="#3c3b6e" />
            <circle cx="3" cy="2.5" r="0.8" fill="#ffffff" />
            <circle cx="5.5" cy="2.5" r="0.8" fill="#ffffff" />
            <circle cx="8" cy="2.5" r="0.8" fill="#ffffff" />
            <circle cx="4.2" cy="4.5" r="0.8" fill="#ffffff" />
            <circle cx="6.8" cy="4.5" r="0.8" fill="#ffffff" />
            <circle cx="3" cy="6.5" r="0.8" fill="#ffffff" />
            <circle cx="5.5" cy="6.5" r="0.8" fill="#ffffff" />
            <circle cx="8" cy="6.5" r="0.8" fill="#ffffff" />
          </svg>
        );
      case "DE":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="24" height="5.33" y="0" fill="#000000" />
            <rect width="24" height="5.33" y="5.33" fill="#dd0000" />
            <rect width="24" height="5.34" y="10.66" fill="#ffce00" />
          </svg>
        );
      case "NL":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="24" height="5.33" y="0" fill="#ae1c28" />
            <rect width="24" height="5.33" y="5.33" fill="#ffffff" />
            <rect width="24" height="5.34" y="10.66" fill="#21468b" />
          </svg>
        );
      case "GB":
      case "UK":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="24" height="16" fill="#012169" />
            <path d="M0,0 L24,16 M24,0 L0,16" stroke="#ffffff" strokeWidth="2.8" />
            <path d="M0,0 L24,16 M24,0 L0,16" stroke="#c8102e" strokeWidth="1.4" />
            <path d="M12,0 L12,16 M0,8 L24,8" stroke="#ffffff" strokeWidth="4.5" />
            <path d="M12,0 L12,16 M0,8 L24,8" stroke="#c8102e" strokeWidth="2.5" />
          </svg>
        );
      case "CA":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="6" height="16" x="0" fill="#ff0000" />
            <rect width="12" height="16" x="6" fill="#ffffff" />
            <rect width="6" height="16" x="18" fill="#ff0000" />
            <path d="M12,3.5 L13.8,7 L16,6.5 L14.5,10 L12.5,10 L12.5,13 L11.5,13 L11.5,10 L9.5,10 L8,6.5 L10.2,7 Z" fill="#ff0000" />
          </svg>
        );
      case "IT":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="8" height="16" x="0" fill="#009246" />
            <rect width="8" height="16" x="8" fill="#ffffff" />
            <rect width="8" height="16" x="16" fill="#ce2b37" />
          </svg>
        );
      case "MA":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="24" height="16" fill="#c1272d" />
            <polygon
              points="12,4.2 13.1,7.6 16.7,7.6 13.8,9.7 14.9,13.1 12,11 9.1,13.1 10.2,9.7 7.3,7.6 10.9,7.6"
              fill="none"
              stroke="#006233"
              strokeWidth="1.2"
            />
          </svg>
        );
      case "PT":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="9.5" height="16" x="0" fill="#006600" />
            <rect width="14.5" height="16" x="9.5" fill="#ff0000" />
            <circle cx="9.5" cy="8" r="3.2" fill="#ffcc00" />
          </svg>
        );
      case "IN":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="24" height="5.33" y="0" fill="#ff9933" />
            <rect width="24" height="5.33" y="5.33" fill="#ffffff" />
            <rect width="24" height="5.34" y="10.66" fill="#138808" />
            <circle cx="12" cy="8" r="2" fill="none" stroke="#000080" strokeWidth="0.9" />
          </svg>
        );
      case "BE":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="8" height="16" x="0" fill="#000000" />
            <rect width="8" height="16" x="8" fill="#fae042" />
            <rect width="8" height="16" x="16" fill="#ed2939" />
          </svg>
        );
      case "SN":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="8" height="16" x="0" fill="#00853f" />
            <rect width="8" height="16" x="8" fill="#fdef42" />
            <rect width="8" height="16" x="16" fill="#e31b23" />
            <circle cx="12" cy="8" r="1.8" fill="#00853f" />
          </svg>
        );
      case "ES":
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="24" height="4" y="0" fill="#aa151b" />
            <rect width="24" height="8" y="4" fill="#f1bf00" />
            <rect width="24" height="4" y="12" fill="#aa151b" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 16" className="h-full w-full">
            <rect width="24" height="16" fill="#1e293b" />
            <text
              x="12"
              y="11"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {iso || "GL"}
            </text>
          </svg>
        );
    }
  };

  return (
    <span
      className={cn(
        "inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] shadow-xs ring-1 ring-white/15",
        className
      )}
      title={iso}
    >
      {renderFlagSvg()}
    </span>
  );
}

