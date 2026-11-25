"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleJsonViewer({
  data,
  title,
  defaultExpanded = false,
}: {
  data: unknown;
  title: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const formatted = React.useMemo(() => JSON.stringify(data, null, 2), [data]);

  return (
    <div className="rounded-lg border border-border bg-secondary/30">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold text-foreground hover:bg-secondary/50"
      >
        <span>{title}</span>
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {expanded ? (
        <pre className="max-h-96 overflow-auto border-t border-border p-4 font-mono text-xs text-muted-foreground">
          {formatted}
        </pre>
      ) : null}
    </div>
  );
}
