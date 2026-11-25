"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
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
import type { PublicVisitorDTO } from "@/types";

export default function VisitorsPage() {
  const { dict } = useI18n();
  const [visitors, setVisitors] = React.useState<PublicVisitorDTO[]>([]);
  const [query, setQuery] = React.useState("");
  const [onlyHighRisk, setOnlyHighRisk] = React.useState(false);

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
  }, [query, onlyHighRisk, loadVisitors]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{dict.visitors.title}</h1>
        <p className="text-sm text-muted-foreground">{dict.visitors.subtitle}</p>
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
          <div className="flex items-center gap-2">
            <Switch
              checked={onlyHighRisk}
              onCheckedChange={setOnlyHighRisk}
              ariaLabel={dict.visitors.onlyHighRisk}
            />
            <span className="text-xs font-medium">{dict.visitors.onlyHighRisk}</span>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.visitors.visitorId}</TableHead>
                <TableHead>{dict.visitors.hardwareHash}</TableHead>
                <TableHead>{dict.visitors.visitCount}</TableHead>
                <TableHead>{dict.visitors.maxDanger}</TableHead>
                <TableHead>{dict.visitors.tags}</TableHead>
                <TableHead>{dict.visitors.lastSeen}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitors.map((v) => (
                <TableRow key={v.publicId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
                    </div>
                  </TableCell>
                  <TableCell>
                    <CopyableMono
                      value={v.hardwareHash}
                      displayValue={`${v.hardwareHash.slice(0, 16)}...`}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
