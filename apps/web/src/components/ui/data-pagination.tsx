"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

export interface DataPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  compact?: boolean;
}

function buildPageNumbers(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);

  if (left > 2) pages.push("ellipsis");
  for (let p = left; p <= right; p += 1) {
    pages.push(p);
  }
  if (right < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function DataPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  isLoading = false,
  compact = false,
}: DataPaginationProps) {
  const { dict } = useI18n();
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const from = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(totalItems, safePage * pageSize);

  const summaryText =
    totalItems === 0
      ? dict.pagination.noResults
      : dict.pagination.showingRange
          .replace("{from}", from.toLocaleString())
          .replace("{to}", to.toLocaleString())
          .replace("{total}", totalItems.toLocaleString());

  const pageNumbers = React.useMemo(
    () => buildPageNumbers(safePage, safeTotalPages),
    [safePage, safeTotalPages]
  );

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono">{summaryText}</span>
        {onPageSizeChange ? (
          <label className="inline-flex items-center gap-1.5">
            <select
              value={pageSize}
              disabled={isLoading}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label={dict.pagination.perPage}
              className="h-7 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span>{dict.pagination.perPage}</span>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {!compact ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={isLoading || safePage <= 1}
            onClick={() => onPageChange(1)}
            title={dict.pagination.firstPage}
            aria-label={dict.pagination.firstPage}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={isLoading || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          title={dict.pagination.previousPage}
          aria-label={dict.pagination.previousPage}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {!compact ? (
          pageNumbers.map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`e-${idx}`} className="px-1.5 font-mono text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant={item === safePage ? "default" : "outline"}
                size="sm"
                className="h-7 min-w-7 px-2 font-mono text-xs"
                disabled={isLoading}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            )
          )
        ) : (
          <span className="px-2 font-mono text-[11px]">
            {dict.pagination.pageOf
              .replace("{page}", String(safePage))
              .replace("{totalPages}", String(safeTotalPages))}
          </span>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={isLoading || safePage >= safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
          title={dict.pagination.nextPage}
          aria-label={dict.pagination.nextPage}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {!compact ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={isLoading || safePage >= safeTotalPages}
            onClick={() => onPageChange(safeTotalPages)}
            title={dict.pagination.lastPage}
            aria-label={dict.pagination.lastPage}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
