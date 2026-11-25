import { describe, expect, it } from "vitest";
import { cn } from "../src/lib/utils";
import { buttonVariants } from "../src/components/ui/button";
import { badgeVariants } from "../src/components/ui/badge";

describe("Cosmic Night UI primitives", () => {
  it("merges class names cleanly with cn()", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("generates button and badge variant classes", () => {
    expect(buttonVariants({ variant: "default" })).toContain("bg-primary");
    expect(badgeVariants({ variant: "destructive" })).toContain("bg-destructive");
  });
});
