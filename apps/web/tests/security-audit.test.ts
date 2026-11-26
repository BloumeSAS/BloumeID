import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { POST as fingerprintPOST } from "../src/app/api/v1/fingerprint/route";
import { DEMO_PUBLIC_KEY } from "../src/lib/engine/repository";

describe("Phase 8 — Final Security Audit, Zero-'any' Check & UMD Bundle Execution", () => {
  it("verifies zero explicit 'any' across all TypeScript source files in apps/web and packages/bloumeid", () => {
    const roots = [
      path.resolve(__dirname, "../src"),
      path.resolve(__dirname, "../../../packages/bloumeid/src"),
    ];

    const collectTsFiles = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...collectTsFiles(full));
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
          files.push(full);
        }
      }
      return files;
    };

    const allFiles = roots.flatMap(collectTsFiles);
    expect(allFiles.length).toBeGreaterThan(20);

    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf8");
      const hasExplicitAny = /:\s*any\b|as\s+any\b|<any>/m.test(content);
      expect(hasExplicitAny, `Explicit 'any' forbidden in ${file}`).toBe(false);
    }
  });

  it("blocks disallowed CORS origins and expired anti-replay timestamps on POST /api/v1/fingerprint", async () => {
    const disallowedCorsRes = await fingerprintPOST(
      new Request("http://localhost:3000/api/v1/fingerprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://untrusted-phishing-domain.org",
          "X-BloumeID-Key": DEMO_PUBLIC_KEY,
        },
        body: JSON.stringify({}),
      })
    );
    expect(disallowedCorsRes.status).toBe(403);

    const expiredTimestampRes = await fingerprintPOST(
      new Request("http://localhost:3000/api/v1/fingerprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://app.bloume.io",
          "X-BloumeID-Key": DEMO_PUBLIC_KEY,
        },
        body: JSON.stringify({
          timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes old (> 5 min window)
          nonce: "nonce_expired_12345",
          signature: "a".repeat(64),
          fullHash: "b".repeat(64),
          hardwareHash: "c".repeat(64),
          components: {},
        }),
      })
    );
    expect(expiredTimestampRes.status).toBe(400);
  });

  it("loads and executes the compiled UMD bundle (public/sdk/v1/bloumeid.js) in a browser-like VM context", async () => {
    const umdPath = path.resolve(__dirname, "../public/sdk/v1/bloumeid.js");
    expect(fs.existsSync(umdPath)).toBe(true);
    const code = fs.readFileSync(umdPath, "utf8");
    expect(code.length).toBeGreaterThan(1000);
    expect(code.length).toBeLessThan(150 * 1024);

    const sandboxWindow: Record<string, unknown> = {
      navigator: {
        userAgent: "Mozilla/5.0 Chrome/131.0.0.0",
        language: "fr-FR",
        languages: ["fr-FR", "en-US"],
        hardwareConcurrency: 8,
        maxTouchPoints: 0,
        platform: "Win32",
        vendor: "Google Inc.",
        cookieEnabled: true,
      },
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24,
      },
      TextEncoder,
      Uint8Array,
      Uint32Array,
      DataView,
      ArrayBuffer,
      Intl,
      Date,
      Math,
      Error,
      Promise,
      setTimeout,
      clearTimeout,
    };
    sandboxWindow.window = sandboxWindow;
    sandboxWindow.globalThis = sandboxWindow;

    const context = vm.createContext(sandboxWindow);
    vm.runInContext(code, context);

    const exportedGlobal = sandboxWindow.BloumeID as
      | { BloumeID?: new (cfg?: unknown) => { getFingerprint: () => Promise<string> } }
      | (new (cfg?: unknown) => { getFingerprint: () => Promise<string> });

    const Ctor =
      typeof exportedGlobal === "function"
        ? exportedGlobal
        : exportedGlobal?.BloumeID;

    expect(typeof Ctor).toBe("function");
    const instance = new Ctor!({ options: { exclude: ["webrtc", "audio", "webgpu"] } });
    const fp = await instance.getFingerprint();
    expect(fp).toHaveLength(64);
  });
});

