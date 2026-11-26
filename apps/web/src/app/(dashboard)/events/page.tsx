"use client";

import * as React from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
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
import type { PublicFingerprintEventDTO } from "@/types";

export default function EventsAuditPage() {
  const { dict, selectedSiteId } = useI18n();
  const [events, setEvents] = React.useState<PublicFingerprintEventDTO[]>([]);
  const [query, setQuery] = React.useState("");
  const [minDanger, setMinDanger] = React.useState(0);
  const [vector, setVector] = React.useState<"all" | "bot" | "vpntor" | "spoofed" | "crossbrowser">(
    "all"
  );
  const [livePolling, setLivePolling] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<PublicFingerprintEventDTO | null>(null);

  const loadEvents = React.useCallback(async () => {
    const params = new URLSearchParams({
      siteId: selectedSiteId,
      q: query,
      minDanger: String(minDanger),
      vector,
    });
    const res = await fetch(`/api/admin/events?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { events: PublicFingerprintEventDTO[] };
      setEvents(data.events);
    }
  }, [selectedSiteId, query, minDanger, vector]);

  React.useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  React.useEffect(() => {
    if (!livePolling) return;
    const id = setInterval(() => {
      void loadEvents();
    }, 5000);
    return () => clearInterval(id);
  }, [livePolling, loadEvents]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.events.title}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{dict.events.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

      <Card>
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
                  <TableHead>{dict.events.colTime}</TableHead>
                  <TableHead>{dict.events.colRequest}</TableHead>
                  <TableHead>{dict.events.colVisitor}</TableHead>
                  <TableHead>{dict.events.colNetwork}</TableHead>
                  <TableHead>{dict.events.colEnvironment}</TableHead>
                  <TableHead>{dict.events.colAction}</TableHead>
                  <TableHead>{dict.events.colDanger}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((evt) => (
                  <TableRow
                    key={evt.publicId}
                    onClick={() => setSelectedEvent(evt)}
                    className="cursor-pointer"
                  >
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <CopyableMono
                        value={evt.publicId}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </TableCell>
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
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <CopyableMono
                          value={evt.ipAddress}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {evt.country ?? "--"} • {evt.asnNumber ? `AS${evt.asnNumber}` : "--"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-medium">
                        {evt.browser ?? "Browser"} / {evt.os ?? "OS"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {evt.isBot ? <Badge variant="destructive">{dict.flags.bot}</Badge> : null}
                        {evt.isSpoofed ? (
                          <Badge variant="warning">{dict.flags.spoofed}</Badge>
                        ) : null}
                        {evt.isTor ? <Badge variant="destructive">{dict.flags.tor}</Badge> : null}
                        {evt.isVpn ? <Badge variant="secondary">{dict.flags.vpn}</Badge> : null}
                      </div>
                    </TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selectedEvent)}
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

