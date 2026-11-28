"use client";

import * as React from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CodeTabItem {
  id: string;
  label: string;
  code: string;
}

interface CodeTabsBlockProps {
  title?: string;
  tabs: CodeTabItem[];
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}

export function CodeTabsBlock({
  title,
  tabs,
  copyLabel,
  copiedLabel,
  className,
}: CodeTabsBlockProps) {
  const [activeId, setActiveId] = React.useState<string>(tabs[0]?.id ?? "");
  const [copied, setCopied] = React.useState(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const activeTab = React.useMemo(
    () => tabs.find((t) => t.id === activeId) ?? tabs[0],
    [tabs, activeId]
  );

  const lines = React.useMemo(
    () => (activeTab ? activeTab.code.trimEnd().split("\n") : []),
    [activeTab]
  );

  const handleCopy = React.useCallback(async () => {
    if (!activeTab) return;
    try {
      await navigator.clipboard.writeText(activeTab.code);
      setCopied(true);
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, 1800);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  }, [activeTab]);

  if (!activeTab) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-slate-950 text-slate-100 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 bg-slate-900/90 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {title && (
            <span className="mr-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Terminal className="h-3.5 w-3.5 text-indigo-400" />
              {title}
            </span>
          )}
          {tabs.map((tab) => {
            const isSelected = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveId(tab.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  isSelected
                    ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-inset ring-indigo-500/40"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-700"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-300">{copiedLabel}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span>{copyLabel}</span>
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/60">
                <td className="w-8 select-none pr-3 text-right align-top text-[11px] text-slate-600">
                  {idx + 1}
                </td>
                <td className="whitespace-pre text-slate-200">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
