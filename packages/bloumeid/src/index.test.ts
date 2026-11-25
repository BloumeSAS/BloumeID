import { describe, it, expect } from "vitest";
import { BloumeID } from "./index";

describe("BloumeID SDK Bootstrap", () => {
  it("instantiates with default options", () => {
    const client = new BloumeID({ apiKey: "bid_pub_test" });
    expect(client.getOptions().apiKey).toBe("bid_pub_test");
  });
});
