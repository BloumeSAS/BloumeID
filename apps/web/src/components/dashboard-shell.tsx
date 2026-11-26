"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Command,
  Cpu,
  Fingerprint,
  Globe,
  Home,
  KeyRound,
  LayoutList,
  ListFilter,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Rows3,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import {
  useI18n,
  type AutoRefreshInterval,
  type GlobalTimeRange,
} from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PublicSiteDTO } from "@/types";

const TIME_RANGES: readonly GlobalTimeRange[] = ["1h", "24h", "7d", "30d", "90d"];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    dict,
    locale,
    setLocale,
    theme,
    toggleTheme,
    selectedSiteId,
    setSelectedSiteId,
    timeRange,
    setTimeRange,
    viewDensity,
    setViewDensity,
    autoRefreshSec,
    setAutoRefreshSec,
    triggerManualRefresh,
  } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [commandQuery, setCommandQuery] = React.useState("");
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);

  React.useEffect(() => {
    fetch("/api/admin/sites")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { sites?: PublicSiteDTO[] } | null) => {
        if (data?.sites) setSites(data.sites);
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navCategories = [
    {
      category: dict.nav.catOverview,
      items: [
        { href: "/dashboard", label: dict.nav.dashboard, icon: Activity, exact: false },
        { href: "/events", label: dict.nav.events, icon: ListFilter, exact: false },
      ],
    },
    {
      category: dict.nav.catSecurity,
      items: [
        { href: "/visitors", label: dict.nav.visitors, icon: Users, exact: false },
        { href: "/rules", label: dict.nav.rules, icon: ShieldCheck, exact: false },
      ],
    },
    {
      category: dict.nav.catDeveloper,
      items: [
        { href: "/sites", label: dict.nav.sites, icon: KeyRound, exact: false },
        { href: "/playground", label: dict.nav.playground, icon: Cpu, exact: false },
        { href: "/settings", label: dict.nav.settings, icon: Settings, exact: false },
        { href: "/", label: dict.nav.home, icon: Home, exact: true },
      ],
    },
  ];

  const allNavItems = navCategories.flatMap((c) => c.items);

  const filteredCommands = React.useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    const base = allNavItems.map((item) => ({
      id: `nav:${item.href}`,
      title: item.label,
      subtitle: item.href,
      icon: item.icon,
      run: () => {
        setCommandOpen(false);
        setCommandQuery("");
        router.push(item.href);
      },
    }));

    const siteCommands = sites.map((s) => ({
      id: `site:${s.publicId}`,
      title: `${s.name} (${s.publicId})`,
      subtitle: s.domains.join(", "),
      icon: Shield,
      run: () => {
        setSelectedSiteId(s.publicId);
        setCommandOpen(false);
        setCommandQuery("");
      },
    }));

    const actionCommands = [
      {
        id: "act:theme",
        title: theme === "dark" ? dict.common.themeLight : dict.common.themeDark,
        subtitle: "Theme",
        icon: theme === "dark" ? Sun : Moon,
        run: () => {
          toggleTheme();
          setCommandOpen(false);
        },
      },
      {
        id: "act:density",
        title:
          viewDensity === "comfort"
            ? dict.common.densityCompact
            : dict.common.densityComfort,
        subtitle: dict.common.viewConfig,
        icon: Rows3,
        run: () => {
          setViewDensity(viewDensity === "comfort" ? "compact" : "comfort");
          setCommandOpen(false);
        },
      },
      {
        id: "act:locale",
        title: `${dict.common.language}: ${locale === "fr" ? "English (EN)" : "Français (FR)"}`,
        subtitle: "i18n",
        icon: Globe,
        run: () => {
          setLocale(locale === "fr" ? "en" : "fr");
          setCommandOpen(false);
        },
      },
    ];

    const combined = [...base, ...siteCommands, ...actionCommands];
    if (!q) return combined;
    return combined.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    );
  }, [
    allNavItems,
    commandQuery,
    sites,
    theme,
    dict.common,
    viewDensity,
    locale,
    router,
    setSelectedSiteId,
    toggleTheme,
    setViewDensity,
    setLocale,
  ]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const getTimeLabel = (r: GlobalTimeRange): string => {
    if (r === "1h") return dict.dashboard.period1h;
    if (r === "24h") return dict.dashboard.period24h;
    if (r === "7d") return dict.dashboard.period7d;
    if (r === "30d") return dict.dashboard.period30d;
    return dict.dashboard.period90d;
  };

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {navCategories.map((group, gIdx) => (
        <div key={group.category} className="space-y-1">
          {!collapsed || isMobile ? (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/75">
              {group.category}
            </p>
          ) : gIdx > 0 ? (
            <div className="mx-auto my-2 h-px w-8 bg-border/80" />
          ) : null}

          {group.items.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                  collapsed && !isMobile ? "mx-auto h-10 w-10 justify-center p-0" : ""
                )}
                title={collapsed && !isMobile ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed || isMobile ? <span className="truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-background text-foreground lg:flex-row",
        viewDensity === "compact" ? "text-[13px]" : ""
      )}
    >
      {/* Desktop Collapsible Sidebar (lg:) */}
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col border-r border-border bg-card/90 transition-all duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Clean Floating Sidebar Toggle on Right Border (Never overlaps Logo) */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={dict.common.collapseSidebar}
          className="absolute -right-3 top-5 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        <div
          className={cn(
            "flex h-16 items-center border-b border-border px-4",
            collapsed ? "justify-center px-0" : "justify-between"
          )}
        >
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Fingerprint className="h-5 w-5" />
            </div>
            {!collapsed ? (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold tracking-tight text-foreground">
                    {dict.common.brandName}
                  </p>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 font-mono text-[10px] text-primary"
                  >
                    v1.0.0
                  </Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {dict.common.companyName}
                </p>
              </div>
            ) : null}
          </Link>
        </div>

        {/* Quick Command Palette Trigger inside Sidebar */}
        {!collapsed ? (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/35 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-primary" />
                <span>{dict.common.search}</span>
              </span>
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">
                {dict.common.commandShortcut}
              </kbd>
            </button>
          </div>
        ) : null}

        {renderNavLinks(false)}

        <div className="space-y-2.5 border-t border-border p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-500 dark:text-emerald-300">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate font-medium">{dict.common.engineOnline}</span>
            </div>
          ) : (
            <div
              className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10"
              title={dict.common.engineOnline}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          )}

          <div
            className={cn(
              "flex items-center gap-1.5",
              collapsed ? "flex-col" : "justify-between"
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="locale-switcher"
              onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
              className={cn(collapsed ? "h-8 w-10 px-0" : "flex-1")}
            >
              <Globe className="h-3.5 w-3.5" />
              {!collapsed ? <span>{locale.toUpperCase()}</span> : null}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="theme-switcher"
              onClick={toggleTheme}
              className={cn(collapsed ? "h-8 w-10 px-0" : "")}
              title={theme === "dark" ? dict.common.themeLight : dict.common.themeDark}
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="logout-button"
              onClick={handleLogout}
              className={cn(collapsed ? "h-8 w-10 px-0" : "")}
              title={dict.common.logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Sticky Enterprise Header */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/85 px-4 py-2.5 backdrop-blur-md lg:px-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={dict.common.openMenu}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <Fingerprint className="h-5 w-5 text-primary" />
              <span className="font-bold">{dict.common.brandName}</span>
            </Link>

            {/* Global Site Selector */}
            <div className="flex items-center gap-2">
              <Shield className="hidden h-4 w-4 text-primary sm:inline" />
              <select
                aria-label={dict.common.allSites}
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">{dict.common.allSites}</option>
                {sites.map((s) => (
                  <option key={s.publicId} value={s.publicId}>
                    {s.name} ({s.publicId.slice(0, 12)})
                  </option>
                ))}
              </select>
            </div>

            {/* PRO View Density Switcher (Comfort vs Compact PRO) */}
            <div className="hidden items-center rounded-lg border border-border bg-background p-0.5 sm:inline-flex">
              <button
                type="button"
                onClick={() => setViewDensity("comfort")}
                title={dict.common.densityComfort}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  viewDensity === "comfort"
                    ? "bg-secondary text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="h-3 w-3" />
                <span className="hidden xl:inline">{dict.common.densityComfort}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewDensity("compact")}
                title={dict.common.densityCompact}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  viewDensity === "compact"
                    ? "bg-secondary text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Rows3 className="h-3 w-3" />
                <span className="hidden xl:inline">{dict.common.densityCompact}</span>
              </button>
            </div>
          </div>

          {/* Right Toolbar: Auto-Refresh Interval + Time Range + Command Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Global Live Auto-Refresh Selector */}
            <div className="hidden items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 md:flex">
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 text-primary",
                  autoRefreshSec > 0 ? "animate-spin" : ""
                )}
              />
              <select
                aria-label={dict.common.refresh}
                value={autoRefreshSec}
                onChange={(e) =>
                  setAutoRefreshSec(Number(e.target.value) as AutoRefreshInterval)
                }
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none"
              >
                <option value={0}>{dict.common.autoRefreshOff}</option>
                <option value={5}>{dict.common.autoRefresh5s}</option>
                <option value={15}>{dict.common.autoRefresh15s}</option>
                <option value={60}>{dict.common.autoRefresh60s}</option>
              </select>
              <button
                type="button"
                onClick={triggerManualRefresh}
                title={dict.common.refresh}
                className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            {/* Global Time Range Selector */}
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    timeRange === r
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {getTimeLabel(r)}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="hidden h-8 gap-1.5 text-xs sm:inline-flex"
            >
              <Command className="h-3.5 w-3.5 text-primary" />
              <span>{dict.common.commandShortcut}</span>
            </Button>

            <div className="flex items-center gap-1 lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
              >
                {locale.toUpperCase()}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </header>

        <main
          className={cn(
            "flex-1 overflow-x-hidden",
            viewDensity === "compact" ? "p-3 sm:p-4 lg:p-5" : "p-4 sm:p-6 lg:p-8"
          )}
        >
          {children}
        </main>
      </div>

      {/* PRO Command Palette Dialog (Ctrl+K / Cmd+K) */}
      <Dialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title={dict.common.commandPalette}
        description={dict.common.commandPlaceholder}
        closeLabel={dict.common.close}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              placeholder={dict.common.commandPlaceholder}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={cmd.run}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{cmd.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {cmd.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Dialog>

      {/* Mobile & Tablet Slide-Over Sheet Menu */}
      <Sheet
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        title={dict.common.brandName}
        description={dict.common.versionBadge}
        closeLabel={dict.common.close}
      >
        <div className="flex h-full flex-col justify-between">
          {renderNavLinks(true)}
          <div className="mt-6 border-t border-border pt-4">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>{dict.common.logout}</span>
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
