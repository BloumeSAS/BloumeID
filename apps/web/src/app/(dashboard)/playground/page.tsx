"use client";

import * as React from "react";
import { BloumeID, type BloumeIDResult } from "@bloumeid/sdk";
import { Cpu, Play } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { CollapsibleJsonViewer } from "@/components/collapsible-json";

const DEMO_PUBLIC_KEY = "bid_pub_demo_cosmic_night_2026";

export default function PlaygroundPage() {
  const { dict } = useI18n();
  const [result, setResult] = React.useState<BloumeIDResult | null>(null);
  const [running, setRunning] = React.useState(false);

  const runLiveProbe = React.useCallback(async () => {
    setRunning(true);
    try {
      const sdk = new BloumeID({
        apiKey: DEMO_PUBLIC_KEY,
        endpoint: typeof window !== "undefined" ? window.location.origin : "",
      });
      const res = await sdk.get();
      setResult(res);
    } finally {
      setRunning(false);
    }
  }, []);

  React.useEffect(() => {
    void runLiveProbe();
  }, [runLiveProbe]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.playground.title}</h1>
          <p className="text-sm text-muted-foreground">{dict.playground.subtitle}</p>
        </div>

        <Button
          type="button"
          data-testid="run-playground-probe"
          onClick={runLiveProbe}
          disabled={running}
        >
          <Play className="h-4 w-4" />
          <span>{running ? dict.playground.running : dict.playground.runProbe}</span>
        </Button>
      </div>

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{dict.playground.visitorIdLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <CopyableMono
                  value={result.visitorId}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{dict.playground.thumbmarkLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <CopyableMono
                  value={result.thumbmark}
                  displayValue={`${result.thumbmark.slice(0, 22)}...`}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{dict.playground.requestIdLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <CopyableMono
                  value={result.requestId}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{dict.playground.dangerGaugeLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-3xl font-bold text-primary">
                    {result.info.dangerLevel} / 5
                  </span>
                  <Badge
                    variant={
                      result.info.dangerLevel >= 4
                        ? "destructive"
                        : result.info.dangerLevel >= 2
                          ? "warning"
                          : "success"
                    }
                  >
                    {result.confidence.score * 100}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{dict.playground.durationLabel}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-sky-400" />
                <span className="font-mono text-2xl font-bold">{result.info.durationMs} ms</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{dict.playground.detectedFlags}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {result.info.isBot ? <Badge variant="destructive">{dict.flags.bot}</Badge> : null}
                {result.info.isSpoofed ? (
                  <Badge variant="warning">{dict.flags.spoofed}</Badge>
                ) : null}
                {result.info.isIncognito ? (
                  <Badge variant="secondary">{dict.flags.incognito}</Badge>
                ) : null}
                {result.info.isVpn ? <Badge variant="secondary">{dict.flags.vpn}</Badge> : null}
                {result.info.isTor ? <Badge variant="destructive">{dict.flags.tor}</Badge> : null}
                {!result.info.isBot && !result.info.isSpoofed && !result.info.isTor ? (
                  <Badge variant="success">{dict.flags.clean}</Badge>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <CollapsibleJsonViewer
            title={dict.playground.rawJsonTitle}
            data={result}
            defaultExpanded
          />
        </>
      ) : null}
    </div>
  );
}
