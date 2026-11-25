"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { GitBranch, Save } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleJsonViewer } from "@/components/collapsible-json";
import type { PublicFingerprintEventDTO, PublicVisitorDTO } from "@/types";

export default function VisitorDetailPage() {
  const { dict } = useI18n();
  const params = useParams<{ visitorId: string }>();
  const visitorId = params.visitorId;

  const [visitor, setVisitor] = React.useState<PublicVisitorDTO | null>(null);
  const [events, setEvents] = React.useState<PublicFingerprintEventDTO[]>([]);
  const [tagsInput, setTagsInput] = React.useState("");
  const [notesInput, setNotesInput] = React.useState("");

  React.useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/visitors?visitorId=${encodeURIComponent(visitorId)}`);
      if (res.ok) {
        const data = (await res.json()) as {
          visitor: PublicVisitorDTO;
          events: PublicFingerprintEventDTO[];
        };
        setVisitor(data.visitor);
        setEvents(data.events);
        setTagsInput(data.visitor.tags.join(", "));
        setNotesInput(data.visitor.notes ?? "");
      }
    }
    if (visitorId) {
      void load();
    }
  }, [visitorId]);

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

  if (!visitor) {
    return <p className="text-sm text-muted-foreground">{dict.common.loading}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{dict.visitors.detailTitle}</h1>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>

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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{evt.browser ?? "Browser"}</Badge>
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
          {events.map((evt) => (
            <div key={evt.publicId} className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
