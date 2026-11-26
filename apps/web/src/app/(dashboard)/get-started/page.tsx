"use client";

import * as React from "react";
import Link from "next/link";
import { BloumeID, type BloumeIDResult } from "@bloumeid/sdk";
import {
  CheckCircle2,
  KeyRound,
  Play,
  Rocket,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableMono } from "@/components/ui/copyable-mono";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PublicSiteDTO } from "@/types";

export default function GetStartedPage() {
  const { dict } = useI18n();
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);
  const [testResult, setTestResult] = React.useState<BloumeIDResult | null>(null);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/sites")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { sites?: PublicSiteDTO[] } | null) => {
        if (data?.sites) setSites(data.sites);
      })
      .catch(() => undefined);
  }, []);

  const primarySite = sites[0];
  const pubKey = primarySite?.publicKey ?? "bid_pub_demo_cosmic_night_2026";
  const secKey = primarySite?.secretKeyPlain ?? primarySite?.secretKeyHint ?? "bid_sec_...";

  const handleRunTest = async () => {
    setTesting(true);
    try {
      const sdk = new BloumeID({
        apiKey: pubKey,
        endpoint: typeof window !== "undefined" ? window.location.origin : "",
      });
      const res = await sdk.get();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {dict.getStarted.title}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {dict.getStarted.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/sites">
            <Button type="button" variant="outline" size="sm">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <span>{dict.getStarted.manageKeysBtn}</span>
            </Button>
          </Link>
          <Link href="/playground">
            <Button type="button" size="sm">
              <TerminalSquare className="h-3.5 w-3.5" />
              <span>{dict.getStarted.openPlaygroundBtn}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Step 1: Active API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.getStarted.step1Title}</CardTitle>
          <CardDescription>{dict.getStarted.step1Desc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">{dict.sites.publicKey}</p>
            <div className="mt-2">
              <CopyableMono
                value={pubKey}
                copyLabel={dict.common.copy}
                copiedLabel={dict.common.copied}
              />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">{dict.sites.secretKey}</p>
            <div className="mt-2">
              <CopyableMono
                value={secKey}
                copyLabel={dict.common.copy}
                copiedLabel={dict.common.copied}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Client SDK Drop-In Snippets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.getStarted.step2Title}</CardTitle>
          <CardDescription>{dict.getStarted.step2Desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="thumbmark">
            <TabsList className="flex-wrap">
              <TabsTrigger value="thumbmark">{dict.sites.tabNpm}</TabsTrigger>
              <TabsTrigger value="fp">{dict.sites.tabFpPro}</TabsTrigger>
              <TabsTrigger value="script">{dict.sites.tabScript}</TabsTrigger>
            </TabsList>

            <TabsContent value="thumbmark">
              <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs text-foreground">
{`pnpm add @bloumeid/sdk

import { BloumeID } from "@bloumeid/sdk";

const tm = new BloumeID({
  apiKey: "${pubKey}",
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL
});

const result = await tm.get();
console.log(result.visitorId, result.thumbmark, result.info.dangerLevel);`}
              </pre>
            </TabsContent>

            <TabsContent value="fp">
              <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs text-foreground">
{`import FingerprintJS from "@bloumeid/sdk";

const fpPromise = FingerprintJS.load({
  apiKey: "${pubKey}",
  endpoint: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_URL
});

const fp = await fpPromise;
const result = await fp.get({ extendedResult: true, linkedId: "account_42" });
console.log(result.visitorId, result.requestId, result.ipLocation);`}
              </pre>
            </TabsContent>

            <TabsContent value="script">
              <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs text-foreground">
{`<script src="http://localhost:3000/sdk/v1/bloumeid.js"></script>
<script>
  const client = new window.BloumeID({
    apiKey: "${pubKey}",
    endpoint: "http://localhost:3000"
  });
  client.get().then((res) => console.log(res.visitorId, res.requestId));
</script>`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Step 3 & Step 4 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{dict.getStarted.step3Title}</CardTitle>
            <CardDescription>{dict.getStarted.step3Desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs text-foreground">
{`import { BloumeIDServer } from "@bloumeid/sdk/server";

const server = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!,
  endpoint: process.env.BLOUMEID_PUBLIC_URL!
});

const verified = await server.verifyRequest(requestId);
if (verified.dangerLevel >= 3 || verified.flags.isBot) {
  throw new Error("Blocked high-risk request");
}`}
            </pre>
          </CardContent>
        </Card>

        <Card className="border-primary/35">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{dict.getStarted.step4Title}</CardTitle>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <CardDescription>{dict.getStarted.step4Desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={handleRunTest}
              disabled={testing}
              className="w-full"
            >
              <Play className="h-4 w-4" />
              <span>{testing ? dict.playground.running : dict.getStarted.sendTestBtn}</span>
            </Button>

            {testResult ? (
              <div className="space-y-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{dict.getStarted.testSuccess}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      {dict.playground.visitorIdLabel}
                    </p>
                    <CopyableMono
                      value={testResult.visitorId}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      {dict.playground.requestIdLabel}
                    </p>
                    <CopyableMono
                      value={testResult.requestId}
                      copyLabel={dict.common.copy}
                      copiedLabel={dict.common.copied}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="success">{testResult.info.collectorCount} signals</Badge>
                  <Badge variant="outline" className="font-mono">
                    {testResult.info.durationMs} ms
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    Danger: {testResult.info.dangerLevel}/5
                  </Badge>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
