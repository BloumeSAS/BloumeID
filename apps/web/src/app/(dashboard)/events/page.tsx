"use client";

import * as React from "react";
import {
  Columns3,
  Download,
  PanelRight,
  PanelRightClose,
  RefreshCw,
  Search,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { CountryFlag } from "@/components/ui/country-flag";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CollapsibleJsonViewer } from "@/components/collapsible-json";
import { cn } from "@/lib/utils";
import type { PaginationMeta, PublicFingerprintEventDTO } from "@/types";

export default function EventsAuditPage() {
  const { dict, selectedSiteId, timeRange, refreshTick } = useI18n();
  const [events, setEvents] = React.useState<PublicFingerprintEventDTO[]>([]);
  const [query, setQuery] = React.useState("");
  const [minDanger, setMinDanger] = React.useState(0);
  const [vector, setVector] = React.useState<"all" | "bot" | "vpntor" | "spoofed" | "crossbrowser">(
    "all"
  );
  const [actionFilter, setActionFilter] = React.useState<"all" | "block" | "challenge">("all");
  const [livePolling, setLivePolling] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<PublicFingerprintEventDTO | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // PRO View Configuration: Split Master-Detail vs Drawer + Custom Column Visibility
  const [inspectorMode, setInspectorMode] = React.useState<"split" | "drawer">("split");
  const [showColumnMenu, setShowColumnMenu] = React.useState(false);
  const [visibleCols, setVisibleCols] = React.useState({
    time: true,
    request: true,
    visitor: true,
    network: true,
    environment: true,
    action: true,
    danger: true,
  });

  const abortRef = React.useRef<AbortController | null>(null);

  const loadEvents = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        siteId: selectedSiteId,
        period: timeRange,
        q: query,
        minDanger: String(minDanger),
        vector,
        action: actionFilter,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/admin/events?${params.toString()}`, {
        signal: controller.signal,
      });
      if (res.ok && !controller.signal.aborted) {
        const data = (await res.json()) as {
          events: PublicFingerprintEventDTO[];
          pagination?: PaginationMeta;
        };
        setEvents(data.events);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch {
      // Transient network abort or outage keeps existing list until next poll
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [selectedSiteId, timeRange, query, minDanger, vector, actionFilter, page, pageSize]);

  const eventsFilterKey = `${selectedSiteId}|${timeRange}|${query}|${minDanger}|${vector}|${actionFilter}`;
  const prevEventsFilterKeyRef = React.useRef(eventsFilterKey);

  React.useEffect(() => {
    if (prevEventsFilterKeyRef.current !== eventsFilterKey) {
      prevEventsFilterKeyRef.current = eventsFilterKey;
      if (page !== 1) {
        setPage(1);
        return () => abortRef.current?.abort();
      }
    }
    void loadEvents();
    return () => abortRef.current?.abort();
  }, [eventsFilterKey, page, loadEvents, refreshTick]);

  React.useEffect(() => {
    if (!livePolling) return;
    const id = setInterval(() => {
      void loadEvents();
    }, 5000);
    return () => clearInterval(id);
  }, [livePolling, loadEvents]);

  const filteredEvents = React.useMemo(() => {
    if (actionFilter === "all") return events;
    return events.filter((e) => e.ruleAction === actionFilter);
  }, [events, actionFilter]);

  const applyQuickPreset = (preset: "all" | "blocked" | "challenged" | "tor" | "spoof") => {
    if (preset === "all") {
      setMinDanger(0);
      setVector("all");
      setActionFilter("all");
    } else if (preset === "blocked") {
      setMinDanger(0);
      setVector("all");
      setActionFilter("block");
    } else if (preset === "challenged") {
      setMinDanger(0);
      setVector("all");
      setActionFilter("challenge");
    } else if (preset === "tor") {
      setMinDanger(3);
      setVector("vpntor");
      setActionFilter("all");
    } else if (preset === "spoof") {
      setMinDanger(2);
      setVector("spoofed");
      setActionFilter("all");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header + PRO View Switcher (Split Forensic View vs Drawer + Column Chooser) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.events.title}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{dict.events.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Split View vs Drawer View Toggle */}
          <div className="hidden items-center rounded-xl border border-border bg-card p-1 lg:inline-flex">
            <button
              type="button"
              onClick={() => setInspectorMode("split")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                inspectorMode === "split"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PanelRight className="h-3.5 w-3.5" />
              <span>{dict.common.splitView}</span>
            </button>
            <button
              type="button"
              onClick={() => setInspectorMode("drawer")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                inspectorMode === "drawer"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PanelRightClose className="h-3.5 w-3.5" />
              <span>{dict.common.drawerView}</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowColumnMenu((s) => !s)}
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>{dict.common.columnsConfig}</span>
          </Button>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
            <Switch
              checked={livePolling}
              onCheckedChange={setLivePolling}
              ariaLabel={dict.events.livePolling}
            />
            <span className="text-xs font-medium">{dict.events.livePolling}</span>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={loadEvents}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{dict.common.refresh}</span>
          </Button>

          <a href="/api/admin/settings?export=csv" download>
            <Button type="button" variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              <span>{dict.events.exportCsv}</span>
            </Button>
          </a>
        </div>
      </div>

      {/* Column Visibility Configuration Bar */}
      {showColumnMenu ? (
        <Card className="border-primary/35 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span className="text-xs font-semibold text-primary">
              {dict.common.columnsConfig}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["time", dict.events.colTime],
                  ["request", dict.events.colRequest],
                  ["visitor", dict.events.colVisitor],
                  ["network", dict.events.colNetwork],
                  ["environment", dict.events.colEnvironment],
                  ["action", dict.events.colAction],
                  ["danger", dict.events.colDanger],
                ] as const
              ).map(([cKey, cLabel]) => (
                <button
                  key={cKey}
                  type="button"
                  onClick={() =>
                    setVisibleCols((prev) => ({ ...prev, [cKey]: !prev[cKey] }))
                  }
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                    visibleCols[cKey]
                      ? "border-primary/40 bg-primary/15 text-foreground"
                      : "border-border bg-background/60 text-muted-foreground opacity-60"
                  )}
                >
                  {visibleCols[cKey] ? "✓ " : "+ "}
                  {cLabel}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick SOC Filter Presets Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {dict.events.quickPresets}:
        </span>
        {(
          [
            ["all", dict.events.presetAllTraffic],
            ["blocked", dict.events.presetBlocked],
            ["challenged", dict.events.presetChallenged],
            ["tor", dict.events.presetTorExit],
            ["spoof", dict.events.presetSpoof],
          ] as const
        ).map(([pKey, pLabel]) => (
          <button
            key={pKey}
            type="button"
            onClick={() => applyQuickPreset(pKey)}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {pLabel}
          </button>
        ))}
      </div>

      {/* Main Split Grid (Table + Live Forensic Side Pane in Split Mode) */}
      <div
        className={cn(
          "grid gap-6",
          inspectorMode === "split" ? "lg:grid-cols-12" : "grid-cols-1"
        )}
      >
        <Card className={cn(inspectorMode === "split" ? "lg:col-span-7 xl:col-span-8" : "")}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={dict.events.searchPlaceholder}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={minDanger}
                onChange={(e) => setMinDanger(Number(e.target.value))}
                aria-label={dict.events.filterAllDanger}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
              >
                <option value={0}>{dict.events.filterAllDanger}</option>
                <option value={3}>{dict.events.filterHighDanger}</option>
                <option value={5}>{dict.events.filterCriticalDanger}</option>
              </select>

              <select
                value={vector}
                onChange={(e) =>
                  setVector(
                    e.target.value as "all" | "bot" | "vpntor" | "spoofed" | "crossbrowser"
                  )
                }
                aria-label={dict.events.filterAllFlags}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
              >
                <option value="all">{dict.events.filterAllFlags}</option>
                <option value="bot">{dict.events.filterBots}</option>
                <option value="vpntor">{dict.events.filterVpnTor}</option>
                <option value="spoofed">{dict.events.filterSpoofed}</option>
                <option value="crossbrowser">{dict.events.filterCrossBrowser}</option>
              </select>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleCols.time ? <TableHead>{dict.events.colTime}</TableHead> : null}
                    {visibleCols.request ? <TableHead>{dict.events.colRequest}</TableHead> : null}
                    {visibleCols.visitor ? <TableHead>{dict.events.colVisitor}</TableHead> : null}
                    {visibleCols.network ? <TableHead>{dict.events.colNetwork}</TableHead> : null}
                    {visibleCols.environment ? (
                      <TableHead>{dict.events.colEnvironment}</TableHead>
                    ) : null}
                    {visibleCols.action ? <TableHead>{dict.events.colAction}</TableHead> : null}
                    {visibleCols.danger ? <TableHead>{dict.events.colDanger}</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                        {dict.common.noDataPeriod}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {filteredEvents.map((evt) => {
                    const isSelected = selectedEvent?.publicId === evt.publicId;
                    return (
                      <TableRow
                        key={evt.publicId}
                        onClick={() => setSelectedEvent(evt)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected ? "bg-primary/10" : ""
                        )}
                      >
                        {visibleCols.time ? (
                          <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                            {new Date(evt.createdAt).toLocaleTimeString()}
                          </TableCell>
                        ) : null}
                        {visibleCols.request ? (
                          <TableCell>
                            <CopyableMono
                              value={evt.publicId}
                              copyLabel={dict.common.copy}
                              copiedLabel={dict.common.copied}
                            />
                          </TableCell>
                        ) : null}
                        {visibleCols.visitor ? (
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <CopyableMono
                                value={evt.visitorPublicId}
                                copyLabel={dict.common.copy}
                                copiedLabel={dict.common.copied}
                              />
                              {evt.linkedId ? (
                                <Badge variant="outline" className="w-fit font-mono text-[10px]">
                                  {evt.linkedId}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : null}
                        {visibleCols.network ? (
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <CountryFlag code={evt.country} />
                                <CopyableMono
                                  value={evt.ipAddress}
                                  copyLabel={dict.common.copy}
                                  copiedLabel={dict.common.copied}
                                />
                              </div>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {evt.country ?? "--"} •{" "}
                                {evt.asnNumber ? `AS${evt.asnNumber} ${evt.asnOrg ?? ""}` : "--"}
                              </span>
                            </div>
                          </TableCell>
                        ) : null}
                        {visibleCols.environment ? (
                          <TableCell className="text-xs">
                            <p className="font-medium">
                              {evt.browser ?? "Browser"} / {evt.os ?? "OS"}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {evt.isBot ? (
                                <Badge variant="destructive">{dict.flags.bot}</Badge>
                              ) : null}
                              {evt.isSpoofed ? (
                                <Badge variant="warning">{dict.flags.spoofed}</Badge>
                              ) : null}
                              {evt.isTor ? (
                                <Badge variant="destructive">{dict.flags.tor}</Badge>
                              ) : null}
                              {evt.isVpn ? (
                                <Badge variant="secondary">{dict.flags.vpn}</Badge>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : null}
                        {visibleCols.action ? (
                          <TableCell>
                            <Badge
                              variant={
                                evt.ruleAction === "block"
                                  ? "destructive"
                                  : evt.ruleAction === "challenge"
                                    ? "warning"
                                    : "outline"
                              }
                            >
                              {evt.ruleAction}
                            </Badge>
                          </TableCell>
                        ) : null}
                        {visibleCols.danger ? (
                          <TableCell>
                            <Badge
                              variant={
                                evt.dangerLevel >= 4
                                  ? "destructive"
                                  : evt.dangerLevel >= 2
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {evt.dangerLevel} / 5
                            </Badge>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="px-4 pb-4">
              <DataPagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
                isLoading={isLoading}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Live Docked Master-Detail Forensic Inspector (when in Split View) */}
        {inspectorMode === "split" ? (
          <Card className="hidden h-fit max-h-[780px] overflow-y-auto border-primary/30 lg:col-span-5 lg:block xl:col-span-4">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-semibold">
                {dict.dashboard.drawerTitle}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{dict.dashboard.drawerSubtitle}</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {selectedEvent ? (
                <>
                  <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-border bg-secondary/20 p-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        {dict.playground.requestIdLabel}
                      </p>
                      <CopyableMono
                        value={selectedEvent.publicId}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        {dict.visitors.visitorId}
                      </p>
                      <CopyableMono
                        value={selectedEvent.visitorPublicId}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">IP / ASN</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <CountryFlag code={selectedEvent.country} />
                        <CopyableMono
                          value={selectedEvent.ipAddress}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    </div>
                    {selectedEvent.ja4Hash ? (
                      <div>
                        <p className="text-[11px] text-muted-foreground">JA4 TLS Fingerprint</p>
                        <CopyableMono
                          value={selectedEvent.ja4Hash}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </div>
                    ) : null}
                  </div>

                  <CollapsibleJsonViewer
                    title={dict.visitors.rawComponents}
                    data={selectedEvent}
                    defaultExpanded
                  />
                </>
              ) : (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  {dict.events.selectEventPrompt}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Slide-Over Sheet Inspector (used on Mobile or when Drawer mode is chosen) */}
      <Sheet
        open={Boolean(selectedEvent) && inspectorMode === "drawer"}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        title={dict.dashboard.drawerTitle}
        description={dict.dashboard.drawerSubtitle}
        closeLabel={dict.common.close}
      >
        {selectedEvent ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{dict.playground.requestIdLabel}</p>
                <CopyableMono
                  value={selectedEvent.publicId}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{dict.visitors.visitorId}</p>
                <CopyableMono
                  value={selectedEvent.visitorPublicId}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>
            </div>
            <CollapsibleJsonViewer
              title={dict.visitors.rawComponents}
              data={selectedEvent}
              defaultExpanded
            />
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
