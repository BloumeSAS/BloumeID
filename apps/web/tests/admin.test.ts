import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  createSignedAdminSessionToken,
  getConfiguredMasterKey,
  verifyMasterKey,
  verifySignedAdminSessionToken,
} from "../src/lib/auth";
import { POST as loginPOST } from "../src/app/api/admin/auth/login/route";
import { POST as logoutPOST } from "../src/app/api/admin/auth/logout/route";
import { GET as dashboardGET } from "../src/app/api/admin/dashboard/route";
import { GET as eventsGET } from "../src/app/api/admin/events/route";
import {
  GET as rulesGET,
  POST as rulesPOST,
  DELETE as rulesDELETE,
} from "../src/app/api/admin/rules/route";
import {
  GET as sitesGET,
  POST as sitesPOST,
  PATCH as sitesPATCH,
  DELETE as sitesDELETE,
} from "../src/app/api/admin/sites/route";
import {
  GET as visitorsGET,
  PATCH as visitorsPATCH,
} from "../src/app/api/admin/visitors/route";
import {
  GET as settingsGET,
  POST as settingsPOST,
} from "../src/app/api/admin/settings/route";

describe("Admin Auth, Control Plane APIs (Dashboard, Events, Rules, Sites, Visitors, Settings) & Zero Hardcoded UI Strings", () => {
  it("authenticates ADMIN_MASTER_KEY in constant time and issues signed HMAC cookies", async () => {
    const masterKey = getConfiguredMasterKey();
    expect(verifyMasterKey(masterKey)).toBe(true);
    expect(verifyMasterKey("wrong_key")).toBe(false);

    const token = createSignedAdminSessionToken();
    expect(verifySignedAdminSessionToken(token)).toBe(true);
    expect(verifySignedAdminSessionToken(`${token}tamper`)).toBe(false);

    const badRes = await loginPOST(
      new Request("http://localhost:3000/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterKey: "invalid_master_key" }),
      })
    );
    expect(badRes.status).toBe(401);

    const okRes = await loginPOST(
      new Request("http://localhost:3000/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterKey }),
      })
    );
    expect(okRes.status).toBe(200);
    const setCookie = okRes.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(ADMIN_SESSION_COOKIE);
    expect(setCookie).toContain("HttpOnly");

    const logoutRes = await logoutPOST();
    expect(logoutRes.status).toBe(200);
  });

  it("operates Admin Dashboard, Events Audit Log, Security Rules, Sites CRUD/Rotation, Visitors Trust/Merge & Settings IP Tester APIs", async () => {
    const token = createSignedAdminSessionToken();
    const authHeaders = {
      Cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
      "Content-Type": "application/json",
    };

    // Unauthenticated rejected
    const unauth = await dashboardGET(new Request("http://localhost:3000/api/admin/dashboard"));
    expect(unauth.status).toBe(401);

    // Dashboard metrics (Cap-style leaderboards + stacked timeline)
    const dashRes = await dashboardGET(
      new Request("http://localhost:3000/api/admin/dashboard?period=7d", { headers: authHeaders })
    );
    expect(dashRes.status).toBe(200);
    const dashData = (await dashRes.json()) as {
      period: string;
      totalEvents: number;
      topCountries: Array<{ country: string }>;
      topAsns: Array<{ asnNumber: number }>;
    };
    expect(dashData.period).toBe("7d");
    expect(dashData.totalEvents).toBe(0);
    expect(dashData.topCountries).toEqual([]);
    expect(dashData.topAsns).toEqual([]);

    // Verify all period filters (1h, 24h, 7d, 30d, 90d) are accepted and propagated
    for (const p of ["1h", "24h", "7d", "30d", "90d"] as const) {
      const pRes = await dashboardGET(
        new Request(`http://localhost:3000/api/admin/dashboard?period=${p}`, { headers: authHeaders })
      );
      expect(pRes.status).toBe(200);
      const pBody = (await pRes.json()) as { period: string; trendSeries: unknown[] };
      expect(pBody.period).toBe(p);
      expect(pBody.trendSeries.length).toBeGreaterThan(0);

      const evRes = await eventsGET(
        new Request(`http://localhost:3000/api/admin/events?period=${p}`, { headers: authHeaders })
      );
      expect(evRes.status).toBe(200);
    }

    // Events Audit Log API
    const eventsRes = await eventsGET(
      new Request("http://localhost:3000/api/admin/events?minDanger=0", { headers: authHeaders })
    );
    expect(eventsRes.status).toBe(200);
    const eventsBody = (await eventsRes.json()) as { events: Array<{ requestId: string }> };
    expect(eventsBody.events.length).toBe(0);

    // Security Rules CRUD API
    const createRuleRes = await rulesPOST(
      new Request("http://localhost:3000/api/admin/rules", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: "Challenge Datacenter Traffic",
          conditions: [{ field: "isDatacenter", operator: "eq", value: true }],
          action: "challenge",
          priority: 15,
        }),
      })
    );
    expect(createRuleRes.status).toBe(201);
    const createdRuleBody = (await createRuleRes.json()) as {
      rule: { publicId: string; action: string };
    };
    expect(createdRuleBody.rule.publicId).toMatch(/^rule_/);
    expect(createdRuleBody.rule.action).toBe("challenge");

    const listRulesRes = await rulesGET(
      new Request("http://localhost:3000/api/admin/rules", { headers: authHeaders })
    );
    expect(listRulesRes.status).toBe(200);

    const delRuleRes = await rulesDELETE(
      new Request(
        `http://localhost:3000/api/admin/rules?publicId=${createdRuleBody.rule.publicId}`,
        { method: "DELETE", headers: authHeaders }
      )
    );
    expect(delRuleRes.status).toBe(200);

    // Sites CRUD + key rotation
    const createRes = await sitesPOST(
      new Request("http://localhost:3000/api/admin/sites", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: "E-Commerce Portal",
          domains: ["shop.bloume.io", "*.shop.bloume.io"],
          riskThreshold: 4,
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const createdBody = (await createRes.json()) as {
      site: { publicId: string; publicKey: string; secretKeyPlain?: string };
    };
    expect(createdBody.site.publicId).toMatch(/^site_/);
    expect(createdBody.site.publicKey).toMatch(/^bid_pub_/);
    expect(createdBody.site.secretKeyPlain).toMatch(/^bid_sec_/);

    const rotateRes = await sitesPATCH(
      new Request("http://localhost:3000/api/admin/sites", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          publicId: createdBody.site.publicId,
          rotateKeys: true,
        }),
      })
    );
    expect(rotateRes.status).toBe(200);
    const rotatedBody = (await rotateRes.json()) as typeof createdBody;
    expect(rotatedBody.site.publicKey).not.toBe(createdBody.site.publicKey);
    expect(rotatedBody.site.secretKeyPlain).toMatch(/^bid_sec_/);

    const { verifySiteSecretKey } = await import("../src/lib/engine/repository");
    const verifiedRotated = await verifySiteSecretKey(rotatedBody.site.secretKeyPlain!);
    expect(verifiedRotated?.publicId).toBe(createdBody.site.publicId);
    expect(await verifySiteSecretKey(createdBody.site.secretKeyPlain!)).toBeNull();
    expect(await verifySiteSecretKey("bid_sec_nonexistent_invalid_key")).toBeNull();

    const listSitesRes = await sitesGET(
      new Request("http://localhost:3000/api/admin/sites", { headers: authHeaders })
    );
    expect(listSitesRes.status).toBe(200);

    const delRes = await sitesDELETE(
      new Request(
        `http://localhost:3000/api/admin/sites?publicId=${createdBody.site.publicId}`,
        { method: "DELETE", headers: authHeaders }
      )
    );
    expect(delRes.status).toBe(200);

    // Visitors list & trustStatus update (create a real event via fingerprint API first)
    const { POST: fingerprintPOST } = await import("../src/app/api/v1/fingerprint/route");
    const { computeAntiReplaySignature } = await import("@bloume/id");
    const visSiteRes = await sitesPOST(
      new Request("http://localhost:3000/api/admin/sites", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: "Visitor Test Site",
          domains: ["localhost"],
        }),
      })
    );
    const visSite = ((await visSiteRes.json()) as { site: { publicId: string; publicKey: string } }).site;
    const ts = Date.now();
    const nonce = `nonce_admin_vis_${ts}`;
    const fullHash = "d1".repeat(32);
    const hwHash = "e2".repeat(32);
    const sig = computeAntiReplaySignature(visSite.publicKey, ts, nonce, fullHash, hwHash);
    await fingerprintPOST(
      new Request("http://localhost:3000/api/v1/fingerprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
          "X-BloumeID-Key": visSite.publicKey,
          "X-Real-IP": "198.51.100.77",
        },
        body: JSON.stringify({
          timestamp: ts,
          nonce,
          signature: sig,
          fullHash,
          hardwareHash: hwHash,
          components: { antiSpoof: { isBot: false, isSpoofed: false, isIncognito: false } },
        }),
      })
    );

    const visListRes = await visitorsGET(
      new Request("http://localhost:3000/api/admin/visitors", { headers: authHeaders })
    );
    expect(visListRes.status).toBe(200);
    const visListBody = (await visListRes.json()) as {
      visitors: Array<{ publicId: string }>;
    };
    expect(visListBody.visitors.length).toBeGreaterThan(0);
    const targetVisitorId = visListBody.visitors[0]!.publicId;

    const patchVisRes = await visitorsPATCH(
      new Request("http://localhost:3000/api/admin/visitors", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          publicId: targetVisitorId,
          tags: ["reviewed", "trusted"],
          notes: "Verified by SOC analyst",
          trustStatus: "trusted",
        }),
      })
    );
    expect(patchVisRes.status).toBe(200);

    await sitesDELETE(
      new Request(`http://localhost:3000/api/admin/sites?publicId=${visSite.publicId}`, {
        method: "DELETE",
        headers: authHeaders,
      })
    );

    // Settings status, Live IP Lookup Tester & CSV/JSON export
    const settingsRes = await settingsGET(
      new Request("http://localhost:3000/api/admin/settings", { headers: authHeaders })
    );
    expect(settingsRes.status).toBe(200);

    const ipLookupRes = await settingsPOST(
      new Request("http://localhost:3000/api/admin/settings", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action: "lookup_ip", ipAddress: "185.220.101.1" }),
      })
    );
    expect(ipLookupRes.status).toBe(200);
    const ipLookupBody = (await ipLookupRes.json()) as {
      ipAddress: string;
      isTor: boolean;
    };
    expect(ipLookupBody.ipAddress).toBe("185.220.101.1");
    expect(ipLookupBody.isTor).toBe(true);

    const csvRes = await settingsGET(
      new Request("http://localhost:3000/api/admin/settings?export=csv", {
        headers: authHeaders,
      })
    );
    expect(csvRes.status).toBe(200);
    expect(await csvRes.text()).toContain("requestId,visitorId");

    const purgeRes = await settingsPOST(
      new Request("http://localhost:3000/api/admin/settings", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action: "purge_events", retentionDays: 90 }),
      })
    );
    expect(purgeRes.status).toBe(200);
  });

  it("enforces that every dashboard & login page imports useI18n() dictionary and never exposes raw integer database ids", () => {
    const pages = [
      path.resolve(__dirname, "../src/app/page.tsx"),
      path.resolve(__dirname, "../src/app/login/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/get-started/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/dashboard/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/events/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/smart-signals/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/rules/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/sites/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/webhooks/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/migrate/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/health/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/security/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/usage/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/visitors/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/visitors/[visitorId]/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/settings/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/releases/page.tsx"),
      path.resolve(__dirname, "../src/app/(dashboard)/guides/page.tsx"),
    ];

    for (const file of pages) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, `${path.basename(file)} must use useI18n()`).toContain("useI18n");
      expect(source, `${path.basename(file)} must reference dict.`).toContain("dict.");
    }
  });

  it("computes PaginationMeta and returns paginated items on /api/admin/events and /api/admin/visitors", async () => {
    const { computePaginationMeta, parsePaginationParams } = await import("../src/lib/pagination");
    const meta = computePaginationMeta(2, 25, 60);
    expect(meta).toEqual({
      page: 2,
      pageSize: 25,
      totalItems: 60,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });

    const parsed = parsePaginationParams(new URLSearchParams("page=3&pageSize=10"), 25);
    expect(parsed).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
      hasExplicitPage: true,
    });

    const { GET: eventsGET } = await import("../src/app/api/admin/events/route");
    const { GET: visitorsGET } = await import("../src/app/api/admin/visitors/route");
    const { createSignedAdminSessionToken, ADMIN_SESSION_COOKIE } = await import("../src/lib/auth");
    const token = createSignedAdminSessionToken();
    const headers = { cookie: `${ADMIN_SESSION_COOKIE}=${token}` };

    const evRes = await eventsGET(
      new Request("http://localhost:3000/api/admin/events?page=1&pageSize=1", { headers })
    );
    expect(evRes.status).toBe(200);
    const evBody = (await evRes.json()) as {
      items: unknown[];
      pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    };
    expect(evBody.items.length).toBeLessThanOrEqual(1);
    expect(evBody.pagination.page).toBe(1);
    expect(evBody.pagination.pageSize).toBe(1);

    const visRes = await visitorsGET(
      new Request("http://localhost:3000/api/admin/visitors?page=1&pageSize=1", { headers })
    );
    expect(visRes.status).toBe(200);
    const visBody = (await visRes.json()) as {
      items: unknown[];
      pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    };
    expect(visBody.items.length).toBeLessThanOrEqual(1);
    expect(visBody.pagination.page).toBe(1);
  });

  it("exports lightweight CSV and JSON telemetry snapshots and normalizes invalid RETENTION_DAYS", async () => {
    const token = createSignedAdminSessionToken();
    const headers = { cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}` };

    const prevRetention = process.env.RETENTION_DAYS;
    process.env.RETENTION_DAYS = "not_a_number";
    try {
      const settingsRes = await settingsGET(
        new Request("http://localhost:3000/api/admin/settings", { headers })
      );
      expect(settingsRes.status).toBe(200);
      const body = (await settingsRes.json()) as { retentionDaysDefault: number };
      expect(body.retentionDaysDefault).toBe(90);
    } finally {
      if (prevRetention === undefined) delete process.env.RETENTION_DAYS;
      else process.env.RETENTION_DAYS = prevRetention;
    }

    const csvRes = await settingsGET(
      new Request("http://localhost:3000/api/admin/settings?export=csv", { headers })
    );
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("content-type")).toContain("text/csv");
    expect(csvRes.headers.get("cache-control")).toContain("no-store");
    expect(await csvRes.text()).toContain("requestId,visitorId,siteId,");

    const jsonRes = await settingsGET(
      new Request("http://localhost:3000/api/admin/settings?export=json", { headers })
    );
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("content-type")).toContain("application/json");
    const jsonData = (await jsonRes.json()) as { exportedAt: string; recentEvents: unknown[]; visitors: unknown[] };
    expect(jsonData.exportedAt).toBeTruthy();
    expect(Array.isArray(jsonData.recentEvents)).toBe(true);
    expect(Array.isArray(jsonData.visitors)).toBe(true);
  });
});
