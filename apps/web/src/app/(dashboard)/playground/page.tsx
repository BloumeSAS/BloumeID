"use client";

import * as React from "react";
import { BloumeID, type BloumeIDResult } from "@bloumeid/sdk";
import { Cpu, Layers, Play, ShieldCheck, Volume2 } from "lucide-react";
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
            <Card className="border-primary/30">
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
                    {Math.round(result.confidence.score * 100)}%
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

          {/* Structured 4-Column Signal Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{dict.playground.signalMatrixTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Layers className="h-4 w-4" />
                  <span>{dict.playground.gpuSection}</span>
                </div>
                <p className="font-mono text-xs">{result.components.webgl.unmaskedRenderer}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {result.components.webgl.unmaskedVendor} • MaxTex:{" "}
                  {result.components.webgl.maxTextureSize} • Ext:{" "}
                  {result.components.webgl.extensionsCount}
                </p>
                <CopyableMono
                  value={result.components.canvas.hash}
                  displayValue={`Canvas: ${result.components.canvas.hash.slice(0, 20)}...`}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                  <Volume2 className="h-4 w-4" />
                  <span>{dict.playground.audioSection}</span>
                </div>
                <p className="font-mono text-xs">
                  SampleRate: {result.components.audio.sampleRate} Hz • Sum:{" "}
                  {result.components.audio.sumValue}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Voices: {result.components.speech.voiceCount} ({result.components.speech.defaultVoice})
                </p>
                <CopyableMono
                  value={result.components.audio.sampleHash}
                  displayValue={`Audio: ${result.components.audio.sampleHash.slice(0, 20)}...`}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Cpu className="h-4 w-4" />
                  <span>{dict.playground.systemSection}</span>
                </div>
                <p className="font-mono text-xs">
                  {result.components.hardware.platform} ({result.components.hardware.architectureHint}) •{" "}
                  {result.components.hardware.hardwareConcurrency} Threads •{" "}
                  {result.components.hardware.deviceMemory || 8} GB RAM
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Screen: {result.components.screen.width}×{result.components.screen.height}@
                  {result.components.screen.devicePixelRatio}x • Fonts:{" "}
                  {result.components.fonts.count} • Engine: {result.components.math.engineHint}
                </p>
                <CopyableMono
                  value={result.hardwareHash}
                  displayValue={`HW: ${result.hardwareHash.slice(0, 22)}...`}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{dict.playground.antiSpoofSection}</span>
                </div>
                <p className="font-mono text-xs">
                  Webdriver: {String(result.components.antiSpoof.webdriver)} • WorkerMismatch:{" "}
                  {String(result.components.antiSpoof.workerMismatch)}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Canvas2xNoise: {String(result.components.antiSpoof.canvasNoiseDetected)} •
                  Audio2xNoise: {String(result.components.antiSpoof.audioNoiseDetected)}
                </p>
              </div>
            </CardContent>
          </Card>

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
