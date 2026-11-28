import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticatedFromRequest } from "@/lib/auth";
import { parseSafeJsonBody, sanitizeCsvCell } from "@/lib/security";
import { globalThreatTrie } from "@/lib/engine/cidr-trie";
import {
  ensureDefaultTrieSeeded,
  evaluateIpThreatIntel,
  syncAllThreatFeeds,
} from "@/lib/engine/feeds";
import { downloadAndUpdateGeoLite2, getGeoIpStatus } from "@/lib/engine/geoip";
import {
  getDashboardMetrics,
  listThreatFeedStatuses,
  listVisitors,
  purgeOldFingerprintEvents,
} from "@/lib/engine/repository";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sync_feeds") }),
  z.object({ action: z.literal("update_geolite2"), licenseKey: z.string().optional() }),
  z.object({ action: z.literal("lookup_ip"), ipAddress: z.string().min(3).max(128) }),
  z.object({
    action: z.literal("purge_events"),
    retentionDays: z.number().int().min(1).max(3650),
  }),
]);

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  ensureDefaultTrieSeeded();
  const url = new URL(request.url);
  const exportFormat = url.searchParams.get("export");

  if (exportFormat === "json" || exportFormat === "csv") {
    const metrics = await getDashboardMetrics("30d");
    const visitors = await listVisitors();

    if (exportFormat === "json") {
      return new NextResponse(
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            visitors,
            recentEvents: metrics.recentHighRiskEvents,
          },
          null,
          2
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="bloumeid-export.json"',
          },
        }
      );
    }

    const csvHeader =
      "requestId,visitorId,siteId,fullHash,hardwareHash,ipAddress,country,asnNumber,dangerLevel,ruleAction,isBot,isSpoofed,isVpn,isTor,createdAt";
    const csvRows = metrics.recentHighRiskEvents.map((e) =>
      [
        e.publicId,
        e.visitorPublicId,
        e.sitePublicId,
        e.fullHash,
        e.hardwareHash,
        e.ipAddress,
        e.country ?? "",
        e.asnNumber ?? "",
        e.dangerLevel,
        e.ruleAction,
        e.isBot,
        e.isSpoofed,
        e.isVpn,
        e.isTor,
        e.createdAt,
      ]
        .map(sanitizeCsvCell)
        .join(",")
    );

    return new NextResponse([csvHeader, ...csvRows].join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bloumeid-export.csv"',
      },
    });
  }

  const feeds = await listThreatFeedStatuses();
  const geoip = getGeoIpStatus();

  return NextResponse.json(
    {
      trieTotalCidrs: globalThreatTrie.size(),
      feeds,
      geoip,
      retentionDaysDefault: Number(process.env.RETENTION_DAYS ?? 90),
    },
    { status: 200 }
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyResult = await parseSafeJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  const parsed = ActionSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  if (parsed.data.action === "sync_feeds") {
    const syncResult = await syncAllThreatFeeds();
    return NextResponse.json(syncResult, { status: 200 });
  }

  if (parsed.data.action === "update_geolite2") {
    const geoResult = await downloadAndUpdateGeoLite2({
      licenseKey: parsed.data.licenseKey,
    });
    return NextResponse.json(geoResult, { status: 200 });
  }

  if (parsed.data.action === "lookup_ip") {
    const intel = await evaluateIpThreatIntel(parsed.data.ipAddress.trim());
    return NextResponse.json(
      {
        ipAddress: parsed.data.ipAddress.trim(),
        ...intel,
      },
      { status: 200 }
    );
  }

  const purgedCount = await purgeOldFingerprintEvents(parsed.data.retentionDays);
  return NextResponse.json({ purgedCount }, { status: 200 });
}
