import { describe, expect, it } from "vitest";
import { cn } from "../src/lib/utils";
import { buttonVariants } from "../src/components/ui/button";
import { badgeVariants } from "../src/components/ui/badge";
import {
  computePaginationMeta,
  paginateArray,
  parsePaginationParams,
} from "../src/lib/pagination";
import { GET as sdkBundleGET, OPTIONS as sdkBundleOPTIONS } from "../src/app/sdk/v1/bloumeid.js/route";

describe("Cosmic Night UI primitives", () => {
  it("merges class names cleanly with cn()", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("generates button and badge variant classes", () => {
    expect(buttonVariants({ variant: "default" })).toContain("bg-primary");
    expect(badgeVariants({ variant: "destructive" })).toContain("bg-destructive");
  });

  it("clamps pagination parameters safely against INT4 OFFSET overflows and invalid bounds", () => {
    const overflow = parsePaginationParams(new URLSearchParams("page=99999999999&pageSize=500"));
    expect(overflow.page).toBe(100_000);
    expect(overflow.pageSize).toBe(100);
    expect(overflow.skip).toBe(9_999_900);

    const invalid = parsePaginationParams(new URLSearchParams("page=-3&pageSize=0"));
    expect(invalid.page).toBe(1);
    expect(invalid.pageSize).toBe(25);

    const empty = paginateArray([], 5, 10);
    expect(empty.items).toEqual([]);
    expect(empty.pagination.page).toBe(1);
    expect(empty.pagination.totalPages).toBe(1);

    const meta = computePaginationMeta(Number.NaN, -1, Number.POSITIVE_INFINITY);
    expect(meta.page).toBe(1);
    expect(meta.pageSize).toBe(1);
    expect(meta.totalItems).toBe(0);
  });

  it("serves the UMD SDK bundle with ETag 304 revalidation and CORS preflight", async () => {
    const preflight = await sdkBundleOPTIONS();
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");

    const res = await sdkBundleGET(new Request("http://localhost:3000/sdk/v1/bloumeid.js"));
    expect([200, 503]).toContain(res.status);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    if (res.status === 200) {
      const etag = res.headers.get("etag");
      expect(etag).toBeTruthy();
      const revalidated = await sdkBundleGET(
        new Request("http://localhost:3000/sdk/v1/bloumeid.js", {
          headers: { "If-None-Match": etag! },
        })
      );
      expect(revalidated.status).toBe(304);
    } else {
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });
});
