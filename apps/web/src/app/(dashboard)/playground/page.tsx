"use client";

import * as React from "react";
import { BloumeID, FingerprintJS, type BloumeIDResult } from "@bloume/id";
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
  const [apiMode, setApiMode] = React.useState<"thumbmark" | "fppro">("thumbmark");
  const [result, setResult] = React.useState<BloumeIDResult | null>(null);
  const [running, setRunning] = React.useState(false);

  const runLiveProbe = React.useCallback(async () => {
    setRunning(true);
    try {
      const endpoint = typeof window !== "undefined" ? window.location.origin : "";
      if (apiMode === "fppro") {
        const agent = await FingerprintJS.load({
          apiKey: DEMO_PUBLIC_KEY,
          endpoint,
        });
        const res = await agent.get({
          extendedResult: true,
          linkedId: "playground_live_user",
          tag: { mode: "Fingerprint.com Pro Compatibility" },
        });
        setResult(res);
      } else {
        const sdk = new BloumeID({
          apiKey: DEMO_PUBLIC_KEY,
          endpoint,
        });
        const res = await sdk.get();
        setResult(res);
      }
    } finally {
      setRunning(false);
    }
  }, [apiMode]);

  React.useEffect(() => {
    void runLiveProbe();
  }, [runLiveProbe]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.playground.title}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{dict.playground.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={apiMode === "thumbmark" ? "default" : "ghost"}
              onClick={() => setApiMode("thumbmark")}
            >
              {dict.playground.modeThumbmark}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={apiMode === "fppro" ? "default" : "ghost"}
              onClick={() => setApiMode("fppro")}
            >
              {dict.playground.modeFingerprintPro}
            </Button>
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
                  {result.info.action ? (
                    <Badge variant="outline" className="font-mono uppercase">
                      {result.info.action}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{dict.playground.durationLabel}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-sky-500" />
                <span className="font-mono text-2xl font-bold">{result.info.durationMs} ms</span>
                <Badge variant="outline" className="ml-auto font-mono">
                  {result.info.collectorCount} signals
                </Badge>
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
                  value={result.components.webgl.pixelRenderHash ?? result.components.canvas.hash}
                  displayValue={`PixelHash: ${(result.components.webgl.pixelRenderHash ?? result.components.canvas.hash).slice(0, 18)}...`}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-500">
                  <Volume2 className="h-4 w-4" />
                  <span>{dict.playground.audioSection}</span>
                </div>
                <p className="font-mono text-xs">
                  SampleRate: {result.components.audio.sampleRate} Hz • Sum:{" "}
                  {result.components.audio.sumValue}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  AV1: {String(result.components.mediaCodecs?.av1Supported ?? false)} • Opus:{" "}
                  {String(result.components.mediaCodecs?.opusSupported ?? false)} • Voices:{" "}
                  {result.components.speech.voiceCount}
                </p>
                <CopyableMono
                  value={result.components.audio.sampleHash}
                  displayValue={`Audio: ${result.components.audio.sampleHash.slice(0, 20)}...`}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
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
                  {result.components.screen.devicePixelRatio}x • EmojiAscent:{" "}
                  {result.components.canvas.emojiAscentSum ?? 0}
                </p>
                <CopyableMono
                  value={result.hardwareHash}
                  displayValue={`HW: ${result.hardwareHash.slice(0, 22)}...`}
                  copyLabel={dict.common.copy}
                  copiedLabel={dict.common.copied}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{dict.playground.antiSpoofSection}</span>
                </div>
                <p className="font-mono text-xs">
                  PrototypeHooks: {String(result.components.antiSpoof.prototypeTampered ?? false)} •
                  VM/SoftwareGPU: {String(result.components.antiSpoof.isVirtualMachine ?? false)}
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
