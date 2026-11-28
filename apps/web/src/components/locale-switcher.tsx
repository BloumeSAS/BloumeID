"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n";
import { useI18n } from "@/i18n/provider";

function LocaleFlagSvg({ code }: { code: Locale }) {
  switch (code) {
    case "fr":
      return (
        <svg viewBox="0 0 24 16" className="h-3.5 w-5 shrink-0 rounded-[2px]" aria-hidden>
          <rect width="8" height="16" fill="#0055A4" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#EF4135" />
        </svg>
      );
    case "en":
      return (
        <svg viewBox="0 0 24 16" className="h-3.5 w-5 shrink-0 rounded-[2px]" aria-hidden>
          <rect width="24" height="16" fill="#012169" />
          <path d="M0,0 L24,16 M24,0 L0,16" stroke="#FFFFFF" strokeWidth="3" />
          <path d="M0,0 L24,16 M24,0 L0,16" stroke="#C8102E" strokeWidth="1.5" />
          <path d="M12,0 V16 M0,8 H24" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M12,0 V16 M0,8 H24" stroke="#C8102E" strokeWidth="3" />
        </svg>
      );
    case "es":
      return (
        <svg viewBox="0 0 24 16" className="h-3.5 w-5 shrink-0 rounded-[2px]" aria-hidden>
          <rect width="24" height="4" fill="#AA151B" />
          <rect y="4" width="24" height="8" fill="#F1BF00" />
          <rect y="12" width="24" height="4" fill="#AA151B" />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 24 16" className="h-3.5 w-5 shrink-0 rounded-[2px]" aria-hidden>
          <rect width="24" height="5.33" fill="#000000" />
          <rect y="5.33" width="24" height="5.34" fill="#DD0000" />
          <rect y="10.67" width="24" height="5.33" fill="#FFCE00" />
        </svg>
      );
    case "pt":
      return (
        <svg viewBox="0 0 24 16" className="h-3.5 w-5 shrink-0 rounded-[2px]" aria-hidden>
          <rect width="9.6" height="16" fill="#006600" />
          <rect x="9.6" width="14.4" height="16" fill="#FF0000" />
          <circle cx="9.6" cy="8" r="3" fill="#FFCC00" />
        </svg>
      );
    case "it":
      return (
        <svg viewBox="0 0 24 16" className="h-3.5 w-5 shrink-0 rounded-[2px]" aria-hidden>
          <rect width="8" height="16" fill="#009246" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#CE2B37" />
        </svg>
      );
    case "nl":
      return (
        <svg viewBox="0 0 24 16" className="h-3.5 w-5 shrink-0 rounded-[2px]" aria-hidden>
          <rect width="24" height="5.33" fill="#AE1C28" />
          <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
          <rect y="10.67" width="24" height="5.33" fill="#21468B" />
        </svg>
      );
    case "ja":
      return (
        <svg viewBox="0 0 24 16" className="h-3.5 w-5 shrink-0 rounded-[2px]" aria-hidden>
          <rect width="24" height="16" fill="#FFFFFF" />
          <circle cx="12" cy="8" r="4.5" fill="#BC002D" />
        </svg>
      );
  }
}

export function LocaleSwitcher({
  variant = "outline",
  testId = "locale-switcher",
}: {
  variant?: "outline" | "ghost";
  testId?: string;
}) {
  const { locale, setLocale, dict } = useI18n();
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = SUPPORTED_LOCALES.find((item) => item.code === locale) ?? SUPPORTED_LOCALES[0]!;

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        type="button"
        variant={variant}
        size="sm"
        data-testid={testId}
        aria-label={dict.common.language}
        aria-expanded={open}
        className="h-8 gap-1.5 px-2.5 font-mono text-xs"
        onClick={() => setOpen((prev) => !prev)}
      >
        <LocaleFlagSvg code={current.code} />
        <span>{current.iso}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-44 rounded-lg border border-border bg-card p-1 shadow-xl"
        >
          {SUPPORTED_LOCALES.map((item) => {
            const active = item.code === locale;
            return (
              <button
                key={item.code}
                type="button"
                role="menuitem"
                data-testid={`locale-option-${item.code}`}
                onClick={() => {
                  setLocale(item.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                  active
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-foreground hover:bg-secondary/60"
                }`}
              >
                <span className="flex items-center gap-2">
                  <LocaleFlagSvg code={item.code} />
                  <span>{item.nativeName}</span>
                </span>
                <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  {item.iso}
                  {active ? <Check className="h-3 w-3 text-primary" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
