"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Code2, Cpu, Layers, Search, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { APP_VERSION_TAG } from "@/lib/version";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GuidesPage() {
  const { dict } = useI18n();
  const [search, setSearch] = React.useState("");
  const q = search.trim().toLowerCase();

  const archCards = React.useMemo(
    () => [
      {
        title: dict.guides.archSignalTitle,
        what: dict.guides.archSignalWhat,
        why: dict.guides.archSignalWhy,
        how: dict.guides.archSignalHow,
      },
      {
        title: dict.guides.archReconcileTitle,
        what: dict.guides.archReconcileWhat,
        why: dict.guides.archReconcileWhy,
        how: dict.guides.archReconcileHow,
      },
      {
        title: dict.guides.archNetworkTitle,
        what: dict.guides.archNetworkWhat,
        why: dict.guides.archNetworkWhy,
        how: dict.guides.archNetworkHow,
      },
    ],
    [dict]
  );

  const panelPages = React.useMemo(
    () => [
      { route: "/dashboard", title: dict.nav.dashboard, desc: dict.dashboard.subtitle },
      { route: "/sites", title: dict.nav.sites, desc: dict.sites.subtitle },
      { route: "/events", title: dict.nav.events, desc: dict.events.subtitle },
      { route: "/visitors", title: dict.nav.visitors, desc: dict.visitors.subtitle },
      { route: "/smart-signals", title: dict.nav.smartSignals, desc: dict.smartSignals.subtitle },
      { route: "/rules", title: dict.nav.rules, desc: dict.rules.subtitle },
      { route: "/security", title: dict.nav.security, desc: dict.securityPage.subtitle },
      { route: "/webhooks", title: dict.nav.webhooks, desc: dict.webhooksPage.subtitle },
      { route: "/usage", title: dict.nav.usage, desc: dict.usagePage.subtitle },
      { route: "/settings", title: dict.nav.settings, desc: dict.settings.subtitle },
      { route: "/health", title: dict.nav.health, desc: dict.healthPage.subtitle },
    ],
    [dict]
  );

  const sdkGuides = React.useMemo(
    () => [
      {
        title: dict.guides.sdkInstallTitle,
        code: `pnpm add @bloume/id\n# or <script src="https://id.bloume.fr/sdk/v1/bloumeid.js"></script>`,
      },
      {
        title: dict.guides.sdkThumbmarkTitle,
        code: `import { BloumeID } from "@bloume/id";\n\nconst bloume = new BloumeID({\n  apiKey: "bid_pub_...",\n  endpoint: "https://id.bloume.fr",\n});\nconst res = await bloume.get({ linkedId: "user_42" });`,
      },
      {
        title: dict.guides.sdkFpTitle,
        code: `import FingerprintJS from "@bloume/id";\n\nconst agent = await FingerprintJS.load({ apiKey: "bid_pub_...", endpoint: "https://id.bloume.fr" });\nconst { visitorId, requestId } = await agent.get({ extendedResult: true });`,
      },
      {
        title: dict.guides.sdkServerTitle,
        code: `import { BloumeIDServer } from "@bloume/id/server";\n\nconst server = new BloumeIDServer({\n  secretKey: process.env.BLOUMEID_SECRET_KEY!,\n  endpoint: process.env.BLOUMEID_PUBLIC_URL!,\n});\nconst verified = await server.verifyRequest(requestId);\nconst visitor = await server.getVisitor(verified.visitorId);`,
      },
      {
        title: dict.guides.sdkOptionsTitle,
        code: `const bloume = new BloumeID({\n  apiKey: "bid_pub_...",\n  endpoint: "https://id.bloume.fr",\n  options: {\n    exclude: ["fonts", "speech"],\n    timeout: 4000,\n    debug: false,\n  },\n});`,
      },
    ],
    [dict]
  );

  const filteredArch = archCards.filter(
    (c) =>
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.what.toLowerCase().includes(q) ||
      c.why.toLowerCase().includes(q) ||
      c.how.toLowerCase().includes(q)
  );
  const filteredPages = panelPages.filter(
    (p) => !q || p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.route.includes(q)
  );
  const filteredSdk = sdkGuides.filter(
    (s) => !q || s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{dict.guides.title}</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {APP_VERSION_TAG}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{dict.guides.subtitle}</p>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict.guides.searchPlaceholder}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="architecture">
        <TabsList className="flex-wrap">
          <TabsTrigger value="architecture" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>{dict.guides.tabArchitecture}</span>
          </TabsTrigger>
          <TabsTrigger value="panel" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{dict.guides.tabPanel}</span>
          </TabsTrigger>
          <TabsTrigger value="sdk" className="gap-1.5">
            <Code2 className="h-3.5 w-3.5" />
            <span>{dict.guides.tabSdk}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="architecture" className="space-y-4 pt-3">
          {filteredArch.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-xs text-muted-foreground">
                {dict.guides.noResults}
              </CardContent>
            </Card>
          ) : (
            filteredArch.map((card) => (
              <Card key={card.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cpu className="h-4 w-4 text-primary" />
                    <span>{card.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-secondary/20 p-3">
                    <p className="mb-1 font-semibold text-primary">{dict.guides.whatLabel}</p>
                    <p className="leading-relaxed text-muted-foreground">{card.what}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/20 p-3">
                    <p className="mb-1 font-semibold text-emerald-500">{dict.guides.whyLabel}</p>
                    <p className="leading-relaxed text-muted-foreground">{card.why}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/20 p-3">
                    <p className="mb-1 font-semibold text-sky-400">{dict.guides.howLabel}</p>
                    <p className="leading-relaxed text-muted-foreground">{card.how}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="panel" className="space-y-4 pt-3">
          {filteredPages.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-xs text-muted-foreground">
                {dict.guides.noResults}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPages.map((pg) => (
                <Link key={pg.route} href={pg.route}>
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">{pg.title}</CardTitle>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {pg.route}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs leading-relaxed">
                        {pg.desc}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sdk" className="space-y-4 pt-3">
          {filteredSdk.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-xs text-muted-foreground">
                {dict.guides.noResults}
              </CardContent>
            </Card>
          ) : (
            filteredSdk.map((item) => (
              <Card key={item.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs leading-relaxed">
                    {item.code}
                  </pre>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
