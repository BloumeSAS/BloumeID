import type { PaginationMeta } from "@/types";

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultPageSize = 25,
  maxPageSize = 100
): { page: number; pageSize: number; skip: number; take: number; hasExplicitPage: boolean } {
  const hasExplicitPage = searchParams.has("page") || searchParams.has("pageSize");
  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawPageSize = Number(searchParams.get("pageSize") ?? String(defaultPageSize));

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(maxPageSize, Math.floor(rawPageSize))
      : defaultPageSize;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    hasExplicitPage,
  };
}

export function computePaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta {
  const safeTotal = Math.max(0, totalItems);
  const totalPages = Math.max(1, Math.ceil(safeTotal / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return {
    page: currentPage,
    pageSize,
    totalItems: safeTotal,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; pagination: PaginationMeta } {
  const meta = computePaginationMeta(page, pageSize, items.length);
  const start = (meta.page - 1) * meta.pageSize;
  return {
    items: items.slice(start, start + meta.pageSize),
    pagination: meta,
  };
}
