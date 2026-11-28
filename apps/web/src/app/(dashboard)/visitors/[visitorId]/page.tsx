"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Ban, CheckCircle2, GitBranch, GitMerge, RotateCcw, Save } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleJsonViewer } from "@/components/collapsible-json";
import { paginateArray } from "@/lib/pagination";
import type { PublicFingerprintEventDTO, PublicVisitorDTO, VisitorTrustStatus } from "@/types";

export default function VisitorDetailPage() {
  const { dict } = useI18n();
  const params = useParams<{ visitorId: string }>();
  const visitorId = params.visitorId;

  const [visitor, setVisitor] = React.useState<PublicVisitorDTO | null>(null);
  const [events, setEvents] = React.useState<PublicFingerprintEventDTO[]>([]);
  const [timelinePage, setTimelinePage] = React.useState(1);
  const [timelinePageSize, setTimelinePageSize] = React.useState(10);
  const [tagsInput, setTagsInput] = React.useState("");
  const [notesInput, setNotesInput] = React.useState("");
  const [mergeSourceId, setMergeSourceId] = React.useState("");
  const [mergeStatus, setMergeStatus] = React.useState<string | null>(null);
  const [mergeError, setMergeError] = React.useState<string | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);

  const loadProfile = React.useCallback(async (signal?: AbortSignal) => {
    if (!visitorId) return;
    setLoadFailed(false);
    try {
      const res = await fetch(
        `/api/admin/visitors?visitorId=${encodeURIComponent(visitorId)}`,
        { signal }
      );
      if (signal?.aborted) return;
      if (res.ok) {
        const data = (await res.json()) as {
          visitor: PublicVisitorDTO;
          events: PublicFingerprintEventDTO[];
        };
        setVisitor(data.visitor);
        setEvents(data.events);
        setTagsInput(data.visitor.tags.join(", "));
        setNotesInput(data.visitor.notes ?? "");
      } else {
        setVisitor(null);
        setLoadFailed(true);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setLoadFailed(true);
      }
    }
  }, [visitorId]);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadProfile(controller.signal);
    return () => controller.abort();
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitor) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch("/api/admin/visitors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicId: visitor.publicId,
        tags,
        notes: notesInput.trim() || null,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { visitor: PublicVisitorDTO };
      setVisitor(data.visitor);
    }
  };

  const handleTrustChange = async (trustStatus: VisitorTrustStatus) => {
    if (!visitor) return;
    const res = await fetch("/api/admin/visitors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicId: visitor.publicId,
        trustStatus,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { visitor: PublicVisitorDTO };
      setVisitor(data.visitor);
    }
  };

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitor || !mergeSourceId.trim()) return;
    setMergeError(null);
    setMergeStatus(null);
    const res = await fetch("/api/admin/visitors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicId: visitor.publicId,
        mergeSourceVisitorId: mergeSourceId.trim(),
      }),
    });
    if (res.ok) {
      setMergeSourceId("");
      setMergeStatus(dict.visitors.mergedSuccess);
      await loadProfile();
    } else {
      const err = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as {
        error?: string;
      };
      setMergeError(err.error ?? `HTTP ${res.status}`);
    }
  };

  if (loadFailed) {
    return (
      <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
        <p className="font-medium">{dict.common.none}</p>
        <p className="font-mono text-xs">{visitorId}</p>
      </div>
    );
  }

  if (!visitor) {
    return <p className="text-sm text-muted-foreground">{dict.common.loading}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {dict.visitors.detailTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <CopyableMono
              value={visitor.publicId}
              copyLabel={dict.common.copy}
              copiedLabel={dict.common.copied}
            />
            <Badge
              variant={
                visitor.maxDangerLevel >= 4
                  ? "destructive"
                  : visitor.maxDangerLevel >= 2
                    ? "warning"
                    : "success"
              }
            >
              {visitor.maxDangerLevel} / 5
            </Badge>
            <Badge
              variant={
                visitor.trustStatus === "blocked"
                  ? "destructive"
                  : visitor.trustStatus === "trusted"
                    ? "success"
                    : "outline"
              }
            >
              {visitor.trustStatus === "blocked"
                ? dict.visitors.statusBlocked
                : visitor.trustStatus === "trusted"
                  ? dict.visitors.statusTrusted
                  : dict.visitors.statusNeutral}
            </Badge>
          </div>
        </div>

        {/* One-Click Block / Whitelist / Reset Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleTrustChange("trusted")}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>{dict.visitors.trustVisitor}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => handleTrustChange("blocked")}
          >
            <Ban className="h-3.5 w-3.5" />
            <span>{dict.visitors.blockVisitor}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => handleTrustChange("neutral")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{dict.visitors.resetStatus}</span>
          </Button>
        </div>
      </div>

      {mergeStatus ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-500">
          {mergeStatus}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{dict.visitors.identityGraphTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
              <p className="text-xs text-muted-foreground">{dict.visitors.hardwareHash}</p>
              <CopyableMono
                value={visitor.hardwareHash}
                copyLabel={dict.common.copy}
                copiedLabel={dict.common.copied}
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              {events.map((evt) => (
                <div
                  key={evt.publicId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/20 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {evt.browser ?? "Browser"} • {evt.os ?? "OS"}
                    </Badge>
                    <CopyableMono
                      value={evt.ipAddress}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </div>
                  {evt.crossBrowserMatched ? (
                    <Badge variant="success">{dict.visitors.crossBrowserBadge}</Badge>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Merge Visitor IDs Tool */}
            <form
              onSubmit={handleMerge}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4"
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="merge-source">{dict.visitors.mergeTitle}</Label>
                <Input
                  id="merge-source"
                  value={mergeSourceId}
                  onChange={(e) => setMergeSourceId(e.target.value)}
                  placeholder={dict.visitors.mergePlaceholder}
                  className="font-mono text-xs"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                <GitMerge className="h-4 w-4" />
                <span>{dict.visitors.mergeButton}</span>
              </Button>
            </form>
            {mergeStatus ? (
              <p className="text-xs text-emerald-500">{mergeStatus}</p>
            ) : null}
            {mergeError ? (
              <p className="text-xs text-destructive">{mergeError}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.visitors.notesLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="visitor-tags">{dict.visitors.tags}</Label>
                <Input
                  id="visitor-tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder={dict.visitors.tagsPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitor-notes">{dict.visitors.notesLabel}</Label>
                <Textarea
                  id="visitor-notes"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder={dict.visitors.notesPlaceholder}
                />
              </div>
              <Button type="submit" size="sm">
                <Save className="h-4 w-4" />
                <span>{dict.visitors.saveAnnotation}</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.visitors.timelineTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paginateArray(events, timelinePage, timelinePageSize).items.map((evt) => (
            <div key={evt.publicId} className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CopyableMono
                    value={evt.publicId}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                  <CopyableMono
                    value={evt.ipAddress}
                    copyLabel={dict.common.copy}
                    copiedLabel={dict.common.copied}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(evt.createdAt).toLocaleString()}
                </span>
              </div>
              <CollapsibleJsonViewer
                title={dict.visitors.rawComponents}
                data={evt.components}
              />
            </div>
          ))}
          <DataPagination
            page={timelinePage}
            pageSize={timelinePageSize}
            totalItems={events.length}
            totalPages={Math.max(1, Math.ceil(events.length / timelinePageSize))}
            onPageChange={setTimelinePage}
            onPageSizeChange={(size) => {
              setTimelinePageSize(size);
              setTimelinePage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
