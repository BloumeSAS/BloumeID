"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, CheckCircle2, LayoutGrid, List, RotateCcw, Search } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PublicVisitorDTO, VisitorTrustStatus } from "@/types";

export default function VisitorsPage() {
  const { dict, refreshTick } = useI18n();
  const [visitors, setVisitors] = React.useState<PublicVisitorDTO[]>([]);
  const [query, setQuery] = React.useState("");
  const [onlyHighRisk, setOnlyHighRisk] = React.useState(false);
  const [policyFilter, setPolicyFilter] = React.useState<"all" | VisitorTrustStatus>("all");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");

  const loadVisitors = React.useCallback(async (q: string, hr: boolean) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (hr) params.set("highRisk", "true");
    const res = await fetch(`/api/admin/visitors?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { visitors: PublicVisitorDTO[] };
      setVisitors(data.visitors);
    }
  }, []);

  React.useEffect(() => {
    void loadVisitors(query, onlyHighRisk);
  }, [query, onlyHighRisk, loadVisitors, refreshTick]);

  const handleQuickTrust = async (publicId: string, trustStatus: VisitorTrustStatus) => {
    const res = await fetch("/api/admin/visitors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, trustStatus }),
    });
    if (res.ok) {
      setVisitors((prev) =>
        prev.map((v) => (v.publicId === publicId ? { ...v, trustStatus } : v))
      );
    }
  };

  const filteredVisitors = React.useMemo(() => {
    if (policyFilter === "all") return visitors;
    return visitors.filter((v) => v.trustStatus === policyFilter);
  }, [visitors, policyFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.visitors.title}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{dict.visitors.subtitle}</p>
        </div>

        {/* Table vs Cards Grid View Mode Switcher */}
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              viewMode === "table"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span>{dict.common.tableView}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>{dict.common.gridView}</span>
          </button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={dict.visitors.filterPlaceholder}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Policy Status Filter Pills */}
            <div className="inline-flex rounded-lg border border-border bg-secondary/30 p-0.5 text-xs">
              {(
                [
                  ["all", dict.common.allSites],
                  ["neutral", dict.visitors.statusNeutral],
                  ["trusted", dict.visitors.statusTrusted],
                  ["blocked", dict.visitors.statusBlocked],
                ] as const
              ).map(([st, label]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPolicyFilter(st)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    policyFilter === st
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={onlyHighRisk}
                onCheckedChange={setOnlyHighRisk}
                ariaLabel={dict.visitors.onlyHighRisk}
              />
              <span className="text-xs font-medium">{dict.visitors.onlyHighRisk}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {viewMode === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.visitors.visitorId}</TableHead>
                  <TableHead>{dict.visitors.hardwareHash}</TableHead>
                  <TableHead>{dict.visitors.trustStatus}</TableHead>
                  <TableHead>{dict.visitors.visitCount}</TableHead>
                  <TableHead>{dict.visitors.maxDanger}</TableHead>
                  <TableHead>{dict.visitors.tags}</TableHead>
                  <TableHead>{dict.visitors.lastSeen}</TableHead>
                  <TableHead>{dict.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitors.map((v) => (
                  <TableRow key={v.publicId}>
                    <TableCell>
                      <Link
                        href={`/visitors/${v.publicId}`}
                        className="text-primary hover:underline"
                      >
                        <CopyableMono
                          value={v.publicId}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <CopyableMono
                        value={v.hardwareHash}
                        displayValue={`${v.hardwareHash.slice(0, 16)}...`}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          v.trustStatus === "blocked"
                            ? "destructive"
                            : v.trustStatus === "trusted"
                              ? "success"
                              : "outline"
                        }
                      >
                        {v.trustStatus === "blocked"
                          ? dict.visitors.statusBlocked
                          : v.trustStatus === "trusted"
                            ? dict.visitors.statusTrusted
                            : dict.visitors.statusNeutral}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{v.visitCount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          v.maxDangerLevel >= 4
                            ? "destructive"
                            : v.maxDangerLevel >= 2
                              ? "warning"
                              : "success"
                        }
                      >
                        {v.maxDangerLevel} / 5
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {v.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(v.lastSeenAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title={dict.visitors.trustVisitor}
                          onClick={() => handleQuickTrust(v.publicId, "trusted")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title={dict.visitors.blockVisitor}
                          onClick={() => handleQuickTrust(v.publicId, "blocked")}
                        >
                          <Ban className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title={dict.visitors.resetStatus}
                          onClick={() => handleQuickTrust(v.publicId, "neutral")}
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVisitors.map((v) => (
                <div
                  key={v.publicId}
                  className="flex flex-col justify-between rounded-xl border border-border bg-secondary/20 p-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/visitors/${v.publicId}`}
                        className="text-primary hover:underline"
                      >
                        <CopyableMono
                          value={v.publicId}
                          copyLabel={dict.common.copy}
                          copiedLabel={dict.common.copied}
                        />
                      </Link>
                      <Badge
                        variant={
                          v.maxDangerLevel >= 4
                            ? "destructive"
                            : v.maxDangerLevel >= 2
                              ? "warning"
                              : "success"
                        }
                      >
                        {v.maxDangerLevel} / 5
                      </Badge>
                    </div>

                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        {dict.visitors.hardwareHash}
                      </p>
                      <CopyableMono
                        value={v.hardwareHash}
                        displayValue={`${v.hardwareHash.slice(0, 22)}...`}
                        copyLabel={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {v.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <Badge
                      variant={
                        v.trustStatus === "blocked"
                          ? "destructive"
                          : v.trustStatus === "trusted"
                            ? "success"
                            : "outline"
                      }
                    >
                      {v.trustStatus === "blocked"
                        ? dict.visitors.statusBlocked
                        : v.trustStatus === "trusted"
                          ? dict.visitors.statusTrusted
                          : dict.visitors.statusNeutral}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickTrust(v.publicId, "trusted")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickTrust(v.publicId, "blocked")}
                      >
                        <Ban className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
