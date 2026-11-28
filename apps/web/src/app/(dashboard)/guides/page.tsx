"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Code2,
  Cpu,
  ExternalLink,
  Fingerprint,
  Globe,
  Layers,
  ListChecks,
  Network,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Webhook,
  Workflow,
  X,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { APP_VERSION_TAG } from "@/lib/version";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CodeTabsBlock, type CodeTabItem } from "@/components/guides/code-tabs-block";
import { GuideCallout } from "@/components/guides/guide-callout";
import {
  FAILSAFE_SNIPPETS,
  FP_PRO_SNIPPETS,
  INSTALL_SNIPPETS,
  SERVER_VERIFY_SNIPPETS,
  THUMBMARK_SNIPPETS,
  WEBHOOK_HMAC_SNIPPETS,
  type SnippetGroup,
} from "@/components/guides/guide-snippets";

type ChapterId = "chapter-1" | "chapter-2" | "chapter-3";

interface TocItem {
  id: string;
  chapter: ChapterId;
  label: string;
  isChapter?: boolean;
}

export default function GuidesPage() {
  const { dict } = useI18n();
  const g = dict.guides;

  const [search, setSearch] = React.useState("");
  const [activeChapter, setActiveChapter] = React.useState<ChapterId>("chapter-1");
  const [activeAnchor, setActiveAnchor] = React.useState<string>("chapter-1");
  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const buildTabs = React.useCallback(
    (snippets: SnippetGroup): CodeTabItem[] => [
      { id: "ts", label: g.tabTsNext, code: snippets.tsNext },
      { id: "node", label: g.tabNodeExpress, code: snippets.nodeExpress },
      { id: "html", label: g.tabHtmlCdn, code: snippets.htmlCdn },
      { id: "curl", label: g.tabCurl, code: snippets.curl },
    ],
    [g.tabTsNext, g.tabNodeExpress, g.tabHtmlCdn, g.tabCurl]
  );

  const pipelinePhases = React.useMemo(
    () => [
      {
        num: g.phase1Num,
        title: g.phase1Title,
        badge: g.phase1Badge,
        desc: g.phase1Desc,
        Icon: Fingerprint,
      },
      {
        num: g.phase2Num,
        title: g.phase2Title,
        badge: g.phase2Badge,
        desc: g.phase2Desc,
        Icon: Network,
      },
      {
        num: g.phase3Num,
        title: g.phase3Title,
        badge: g.phase3Badge,
        desc: g.phase3Desc,
        Icon: Layers,
      },
      {
        num: g.phase4Num,
        title: g.phase4Title,
        badge: g.phase4Badge,
        desc: g.phase4Desc,
        Icon: ShieldCheck,
      },
    ],
    [g]
  );

  const archPillars = React.useMemo(
    () => [
      {
        id: "ch1-signals",
        title: g.archSignalTitle,
        what: g.archSignalWhat,
        why: g.archSignalWhy,
        how: g.archSignalHow,
        Icon: Cpu,
      },
      {
        id: "ch1-reconciliation",
        title: g.archReconcileTitle,
        what: g.archReconcileWhat,
        why: g.archReconcileWhy,
        how: g.archReconcileHow,
        Icon: Workflow,
      },
      {
        id: "ch1-network",
        title: g.archNetworkTitle,
        what: g.archNetworkWhat,
        why: g.archNetworkWhy,
        how: g.archNetworkHow,
        Icon: Globe,
      },
    ],
    [g]
  );

  const adminModules = React.useMemo(
    () => [
      {
        id: "mod-dashboard",
        route: "/dashboard",
        title: g.modDashboardTitle,
        goal: g.modDashboardGoal,
        useCases: g.modDashboardUseCases,
        steps: g.modDashboardSteps,
        pitfalls: g.modDashboardPitfalls,
        Icon: Activity,
      },
      {
        id: "mod-sites",
        route: "/sites",
        title: g.modSitesTitle,
        goal: g.modSitesGoal,
        useCases: g.modSitesUseCases,
        steps: g.modSitesSteps,
        pitfalls: g.modSitesPitfalls,
        Icon: Globe,
      },
      {
        id: "mod-events",
        route: "/events",
        title: g.modEventsTitle,
        goal: g.modEventsGoal,
        useCases: g.modEventsUseCases,
        steps: g.modEventsSteps,
        pitfalls: g.modEventsPitfalls,
        Icon: ListChecks,
      },
      {
        id: "mod-visitors",
        route: "/visitors",
        title: g.modVisitorsTitle,
        goal: g.modVisitorsGoal,
        useCases: g.modVisitorsUseCases,
        steps: g.modVisitorsSteps,
        pitfalls: g.modVisitorsPitfalls,
        Icon: Users,
      },
      {
        id: "mod-signals",
        route: "/smart-signals",
        title: g.modSignalsTitle,
        goal: g.modSignalsGoal,
        useCases: g.modSignalsUseCases,
        steps: g.modSignalsSteps,
        pitfalls: g.modSignalsPitfalls,
        Icon: Sparkles,
      },
      {
        id: "mod-rules",
        route: "/rules",
        title: g.modRulesTitle,
        goal: g.modRulesGoal,
        useCases: g.modRulesUseCases,
        steps: g.modRulesSteps,
        pitfalls: g.modRulesPitfalls,
        Icon: Workflow,
      },
      {
        id: "mod-security",
        route: "/security",
        title: g.modSecurityTitle,
        goal: g.modSecurityGoal,
        useCases: g.modSecurityUseCases,
        steps: g.modSecuritySteps,
        pitfalls: g.modSecurityPitfalls,
        Icon: ShieldCheck,
      },
      {
        id: "mod-webhooks",
        route: "/webhooks",
        title: g.modWebhooksTitle,
        goal: g.modWebhooksGoal,
        useCases: g.modWebhooksUseCases,
        steps: g.modWebhooksSteps,
        pitfalls: g.modWebhooksPitfalls,
        Icon: Webhook,
      },
      {
        id: "mod-usage",
        route: "/usage",
        title: g.modUsageTitle,
        goal: g.modUsageGoal,
        useCases: g.modUsageUseCases,
        steps: g.modUsageSteps,
        pitfalls: g.modUsagePitfalls,
        Icon: Cpu,
      },
      {
        id: "mod-settings",
        route: "/settings",
        title: g.modSettingsTitle,
        goal: g.modSettingsGoal,
        useCases: g.modSettingsUseCases,
        steps: g.modSettingsSteps,
        pitfalls: g.modSettingsPitfalls,
        Icon: Settings,
      },
      {
        id: "mod-health",
        route: "/health",
        title: g.modHealthTitle,
        goal: g.modHealthGoal,
        useCases: g.modHealthUseCases,
        steps: g.modHealthSteps,
        pitfalls: g.modHealthPitfalls,
        Icon: Server,
      },
    ],
    [g]
  );

  const signalMatrixRows = React.useMemo(
    () => [
      { cat: g.sigCat1, sig: g.sigSig1, stab: g.sigStab1, purp: g.sigPurp1 },
      { cat: g.sigCat2, sig: g.sigSig2, stab: g.sigStab2, purp: g.sigPurp2 },
      { cat: g.sigCat3, sig: g.sigSig3, stab: g.sigStab3, purp: g.sigPurp3 },
      { cat: g.sigCat4, sig: g.sigSig4, stab: g.sigStab4, purp: g.sigPurp4 },
      { cat: g.sigCat5, sig: g.sigSig5, stab: g.sigStab5, purp: g.sigPurp5 },
      { cat: g.sigCat6, sig: g.sigSig6, stab: g.sigStab6, purp: g.sigPurp6 },
    ],
    [g]
  );

  const errorRows = React.useMemo(
    () => [
      { code: g.err401Code, meaning: g.err401Meaning, cause: g.err401Cause, fix: g.err401Fix },
      { code: g.err403Code, meaning: g.err403Meaning, cause: g.err403Cause, fix: g.err403Fix },
      { code: g.err429Code, meaning: g.err429Meaning, cause: g.err429Cause, fix: g.err429Fix },
      { code: g.err503Code, meaning: g.err503Meaning, cause: g.err503Cause, fix: g.err503Fix },
    ],
    [g]
  );

  const matchesText = React.useCallback(
    (...values: string[]) => {
      if (!query) return true;
      return values.some((v) => v.toLowerCase().includes(query));
    },
    [query]
  );

  const ch1MatchesIntro = matchesText(
    g.ch1Title,
    g.ch1IntroTitle,
    g.ch1IntroDesc,
    g.ch1CompareCookie,
    g.ch1CompareSaas,
    g.ch1CompareBloume
  );
  const ch1MatchesPipeline = matchesText(
    g.pipelineTitle,
    g.pipelineSubtitle,
    ...pipelinePhases.flatMap((p) => [p.title, p.badge, p.desc])
  );
  const filteredPillars = archPillars.filter((p) => matchesText(p.title, p.what, p.why, p.how));

  const filteredModules = adminModules.filter((m) =>
    matchesText(m.route, m.title, m.goal, m.useCases, m.steps, m.pitfalls)
  );
  const ch2WebhookMatches = matchesText(
    g.ch2WebhookSnippetTitle,
    g.ch2WebhookCallout,
    WEBHOOK_HMAC_SNIPPETS.tsNext,
    WEBHOOK_HMAC_SNIPPETS.curl
  );

  const ch3InstallMatches = matchesText(g.sdkInstallTitle, g.sdkInstallDesc, INSTALL_SNIPPETS.tsNext, INSTALL_SNIPPETS.htmlCdn);
  const ch3DualMatches = matchesText(
    g.sdkDualTitle,
    g.sdkThumbmarkTitle,
    g.sdkFpTitle,
    g.ch3MigrationCallout,
    THUMBMARK_SNIPPETS.tsNext,
    FP_PRO_SNIPPETS.tsNext
  );
  const ch3ServerMatches = matchesText(
    g.sdkServerTitle,
    g.sdkServerDesc,
    g.ch3ServerSecurityCallout,
    SERVER_VERIFY_SNIPPETS.tsNext,
    SERVER_VERIFY_SNIPPETS.curl
  );
  const filteredSignals = signalMatrixRows.filter((r) => matchesText(r.cat, r.sig, r.stab, r.purp));
  const filteredErrors = errorRows.filter((e) =>
    matchesText(e.code, e.meaning, e.cause, e.fix, g.sdkFailsafeTitle, FAILSAFE_SNIPPETS.tsNext)
  );

  const totalMatchCount =
    (ch1MatchesIntro ? 1 : 0) +
    (ch1MatchesPipeline ? 1 : 0) +
    filteredPillars.length +
    filteredModules.length +
    (ch2WebhookMatches ? 1 : 0) +
    (ch3InstallMatches ? 1 : 0) +
    (ch3DualMatches ? 1 : 0) +
    (ch3ServerMatches ? 1 : 0) +
    (filteredSignals.length > 0 ? 1 : 0) +
    (filteredErrors.length > 0 ? 1 : 0);

  const tocItems: TocItem[] = React.useMemo(
    () => [
      { id: "chapter-1", chapter: "chapter-1", label: g.tocChapter1, isChapter: true },
      { id: "ch1-pipeline", chapter: "chapter-1", label: g.pipelineTitle },
      { id: "ch1-pillars", chapter: "chapter-1", label: g.ch1ConceptsTitle },
      { id: "chapter-2", chapter: "chapter-2", label: g.tocChapter2, isChapter: true },
      { id: "mod-sites", chapter: "chapter-2", label: g.modSitesTitle },
      { id: "mod-webhooks", chapter: "chapter-2", label: g.modWebhooksTitle },
      { id: "chapter-3", chapter: "chapter-3", label: g.tocChapter3, isChapter: true },
      { id: "sdk-install", chapter: "chapter-3", label: g.sdkInstallTitle },
      { id: "sdk-server", chapter: "chapter-3", label: g.sdkServerTitle },
      { id: "sdk-signals", chapter: "chapter-3", label: g.signalsTableTitle },
      { id: "sdk-errors", chapter: "chapter-3", label: g.sdkErrorsTitle },
    ],
    [g]
  );

  const navigateToSection = React.useCallback((chapter: ChapterId, anchorId: string) => {
    setActiveChapter(chapter);
    setActiveAnchor(anchorId);
    window.requestAnimationFrame(() => {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }, []);

  React.useEffect(() => {
    const ids = tocItems.map((item) => item.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const topEntry = visible[0];
        if (topEntry?.target?.id) {
          setActiveAnchor(topEntry.target.id);
        }
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: 0.05 }
    );

    for (const el of elements) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [activeChapter, isSearching, tocItems]);

  const showChapter1 = isSearching
    ? ch1MatchesIntro || ch1MatchesPipeline || filteredPillars.length > 0
    : activeChapter === "chapter-1";

  const showChapter2 = isSearching
    ? filteredModules.length > 0 || ch2WebhookMatches
    : activeChapter === "chapter-2";

  const showChapter3 = isSearching
    ? ch3InstallMatches ||
      ch3DualMatches ||
      ch3ServerMatches ||
      filteredSignals.length > 0 ||
      filteredErrors.length > 0
    : activeChapter === "chapter-3";

  return (
    <div className="space-y-6">
      {/* Page Header & Search */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/60 p-5 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              {g.badge}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {APP_VERSION_TAG}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{g.title}</h1>
          <p className="max-w-3xl text-xs text-muted-foreground sm:text-sm">{g.subtitle}</p>
        </div>

        <div className="w-full space-y-1.5 lg:w-96">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={g.searchPlaceholder}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={g.clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {isSearching && (
            <p className="text-[11px] text-muted-foreground">
              {g.matchingCount.replace("{count}", String(totalMatchCount))}
            </p>
          )}
        </div>
      </div>

      {/* Main Content + Sticky Table of Contents */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Sticky Sidebar TOC */}
        <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-64">
          <Card className="border-border/70 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.tocTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {tocItems.map((item) => {
                const isSelected = activeAnchor === item.id || (item.isChapter && activeChapter === item.chapter);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateToSection(item.chapter, item.id)}
                    className={cn(
                      "flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                      item.isChapter ? "mt-1.5 font-semibold" : "pl-5 text-[11px]",
                      isSelected
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </aside>

        {/* Documentation Body */}
        <div className="min-w-0 flex-1 space-y-8">
          {isSearching && totalMatchCount === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <p className="text-sm text-muted-foreground">{g.noResults}</p>
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  {g.clearSearch}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* CHAPTER 1: FOUNDATIONS & ARCHITECTURE */}
          {showChapter1 && (
            <section id="chapter-1" className="space-y-6">
              <div className="space-y-1 border-b border-border/60 pb-4">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{g.ch1Title}</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">{g.ch1Subtitle}</p>
              </div>

              {ch1MatchesIntro && (
                <Card className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base">{g.ch1IntroTitle}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed sm:text-sm">
                      {g.ch1IntroDesc}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <p className="font-semibold text-foreground">{g.ch1CompareTitle}</p>
                    <div className="grid gap-2.5 md:grid-cols-3">
                      <div className="rounded-lg border border-border/60 bg-muted/25 p-3 text-muted-foreground">
                        {g.ch1CompareCookie}
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/25 p-3 text-muted-foreground">
                        {g.ch1CompareSaas}
                      </div>
                      <div className="rounded-lg border border-primary/40 bg-primary/8 p-3 font-medium text-foreground">
                        {g.ch1CompareBloume}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {ch1MatchesPipeline && (
                <Card id="ch1-pipeline" className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base">{g.pipelineTitle}</CardTitle>
                    <CardDescription className="text-xs">{g.pipelineSubtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {pipelinePhases.map((phase) => {
                      const Icon = phase.Icon;
                      return (
                        <div
                          key={phase.num}
                          className="relative flex flex-col justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-primary">{phase.num}</span>
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {phase.badge}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 shrink-0 text-primary" />
                              <h3 className="text-xs font-semibold">{phase.title}</h3>
                            </div>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">{phase.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {filteredPillars.length > 0 && (
                <div id="ch1-pillars" className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.ch1ConceptsTitle}
                  </h3>
                  <div className="space-y-3">
                    {filteredPillars.map((pillar) => {
                      const Icon = pillar.Icon;
                      return (
                        <Card key={pillar.id} id={pillar.id} className="border-border/70">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Icon className="h-4 w-4 text-primary" />
                              {pillar.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid gap-3 text-xs md:grid-cols-3">
                            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                              <p className="mb-1 font-semibold text-primary">{g.whatLabel}</p>
                              <p className="text-muted-foreground">{pillar.what}</p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                              <p className="mb-1 font-semibold text-emerald-500">{g.whyLabel}</p>
                              <p className="text-muted-foreground">{pillar.why}</p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                              <p className="mb-1 font-semibold text-sky-400">{g.howLabel}</p>
                              <p className="text-muted-foreground">{pillar.how}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <GuideCallout variant="security" title={g.calloutSecurityTitle} body={g.ch1SecurityCallout} />
                <GuideCallout variant="perf" title={g.calloutPerfTitle} body={g.ch1PerfCallout} />
              </div>

              {!isSearching && (
                <div className="flex justify-end border-t border-border/60 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigateToSection("chapter-2", "chapter-2")}
                    className="gap-2"
                  >
                    <span>
                      {g.nextChapter}: {g.tocChapter2}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* CHAPTER 2: ADMIN PANEL MODULES */}
          {showChapter2 && (
            <section id="chapter-2" className="space-y-6">
              <div className="space-y-1 border-b border-border/60 pb-4">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{g.ch2Title}</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">{g.ch2Subtitle}</p>
              </div>

              <div className="space-y-4">
                {filteredModules.map((mod) => {
                  const Icon = mod.Icon;
                  return (
                    <Card key={mod.id} id={mod.id} className="border-border/70">
                      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{mod.title}</CardTitle>
                            <p className="font-mono text-[11px] text-muted-foreground">{mod.route}</p>
                          </div>
                        </div>
                        <Link
                          href={mod.route}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <span>{g.openModule}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </CardHeader>
                      <CardContent className="grid gap-3 text-xs md:grid-cols-2">
                        <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
                          <p className="mb-1 font-semibold text-primary">{g.goalLabel}</p>
                          <p className="text-muted-foreground">{mod.goal}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
                          <p className="mb-1 font-semibold text-emerald-500">{g.useCasesLabel}</p>
                          <p className="text-muted-foreground">{mod.useCases}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
                          <p className="mb-1 font-semibold text-sky-400">{g.stepsLabel}</p>
                          <p className="text-muted-foreground">{mod.steps}</p>
                        </div>
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
                          <p className="mb-1 font-semibold text-amber-400">{g.pitfallsLabel}</p>
                          <p className="text-muted-foreground">{mod.pitfalls}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {ch2WebhookMatches && (
                <div className="space-y-3">
                  <GuideCallout variant="security" title={g.calloutSecurityTitle} body={g.ch2WebhookCallout} />
                  <CodeTabsBlock
                    title={g.ch2WebhookSnippetTitle}
                    tabs={buildTabs(WEBHOOK_HMAC_SNIPPETS)}
                    copyLabel={g.copyCode}
                    copiedLabel={g.copiedCode}
                  />
                </div>
              )}

              {!isSearching && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigateToSection("chapter-1", "chapter-1")}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>
                      {g.prevChapter}: {g.tocChapter1}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigateToSection("chapter-3", "chapter-3")}
                    className="gap-2"
                  >
                    <span>
                      {g.nextChapter}: {g.tocChapter3}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* CHAPTER 3: SDK & SERVER API */}
          {showChapter3 && (
            <section id="chapter-3" className="space-y-6">
              <div className="space-y-1 border-b border-border/60 pb-4">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{g.ch3Title}</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">{g.ch3Subtitle}</p>
              </div>

              {ch3InstallMatches && (
                <div id="sdk-install" className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      <Code2 className="h-4 w-4 text-primary" />
                      {g.sdkInstallTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground">{g.sdkInstallDesc}</p>
                  </div>
                  <CodeTabsBlock
                    tabs={buildTabs(INSTALL_SNIPPETS)}
                    copyLabel={g.copyCode}
                    copiedLabel={g.copiedCode}
                  />
                </div>
              )}

              {ch3DualMatches && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">{g.sdkDualTitle}</h3>
                    <p className="text-xs text-muted-foreground">{g.sdkDualDesc}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">{g.sdkThumbmarkTitle}</p>
                    <p className="text-xs text-muted-foreground">{g.sdkThumbmarkDesc}</p>
                    <CodeTabsBlock
                      tabs={buildTabs(THUMBMARK_SNIPPETS)}
                      copyLabel={g.copyCode}
                      copiedLabel={g.copiedCode}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">{g.sdkFpTitle}</p>
                    <p className="text-xs text-muted-foreground">{g.sdkFpDesc}</p>
                    <CodeTabsBlock
                      tabs={buildTabs(FP_PRO_SNIPPETS)}
                      copyLabel={g.copyCode}
                      copiedLabel={g.copiedCode}
                    />
                  </div>

                  <GuideCallout variant="migration" title={g.calloutMigrationTitle} body={g.ch3MigrationCallout} />
                </div>
              )}

              {ch3ServerMatches && (
                <div id="sdk-server" className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      {g.sdkServerTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground">{g.sdkServerDesc}</p>
                  </div>
                  <GuideCallout variant="security" title={g.calloutSecurityTitle} body={g.ch3ServerSecurityCallout} />
                  <CodeTabsBlock
                    tabs={buildTabs(SERVER_VERIFY_SNIPPETS)}
                    copyLabel={g.copyCode}
                    copiedLabel={g.copiedCode}
                  />
                </div>
              )}

              {filteredSignals.length > 0 && (
                <Card id="sdk-signals" className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-base">{g.signalsTableTitle}</CardTitle>
                    <CardDescription className="text-xs">{g.signalsTableDesc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{g.sigColCategory}</TableHead>
                            <TableHead>{g.sigColSignals}</TableHead>
                            <TableHead>{g.sigColStability}</TableHead>
                            <TableHead>{g.sigColPurpose}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {filteredSignals.map((row) => (
                            <TableRow key={row.cat}>
                              <TableCell className="font-semibold text-foreground">{row.cat}</TableCell>
                              <TableCell className="text-muted-foreground">{row.sig}</TableCell>
                              <TableCell className="font-mono text-[11px] text-primary">{row.stab}</TableCell>
                              <TableCell className="text-muted-foreground">{row.purp}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredErrors.length > 0 && (
                <div id="sdk-errors" className="space-y-4">
                  <Card className="border-border/70">
                    <CardHeader>
                      <CardTitle className="text-base">{g.sdkErrorsTitle}</CardTitle>
                      <CardDescription className="text-xs">{g.sdkErrorsDesc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{g.errColCode}</TableHead>
                              <TableHead>{g.errColMeaning}</TableHead>
                              <TableHead>{g.errColCause}</TableHead>
                              <TableHead>{g.errColFix}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="text-xs">
                            {filteredErrors.map((err) => (
                              <TableRow key={err.code}>
                                <TableCell className="font-mono font-semibold text-rose-400">{err.code}</TableCell>
                                <TableCell className="font-medium text-foreground">{err.meaning}</TableCell>
                                <TableCell className="text-muted-foreground">{err.cause}</TableCell>
                                <TableCell className="text-muted-foreground">{err.fix}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">{g.sdkFailsafeTitle}</h4>
                      <p className="text-xs text-muted-foreground">{g.sdkFailsafeDesc}</p>
                    </div>
                    <GuideCallout variant="perf" title={g.calloutPerfTitle} body={g.ch3FailsafePerfCallout} />
                    <CodeTabsBlock
                      tabs={buildTabs(FAILSAFE_SNIPPETS)}
                      copyLabel={g.copyCode}
                      copiedLabel={g.copiedCode}
                    />
                  </div>
                </div>
              )}

              {!isSearching && (
                <div className="flex justify-start border-t border-border/60 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigateToSection("chapter-2", "chapter-2")}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>
                      {g.prevChapter}: {g.tocChapter2}
                    </span>
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
