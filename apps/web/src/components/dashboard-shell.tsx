"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Command,
  Database,
  FileText,
  Fingerprint,
  Globe,
  KeyRound,
  LayoutList,
  ListFilter,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Rocket,
  Rows3,
  Search,
  Shield,
  ShieldCheck,
  Sun,
  TerminalSquare,
  Users,
  Webhook,
} from "lucide-react";
import {
  useI18n,
  type AutoRefreshInterval,
  type GlobalTimeRange,
} from "@/i18n/provider";
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

  // ThumbmarkJS Pro flat navigation structure & icons, fully localized via dict.nav.*
  const navItems = [
    { href: "/get-started", label: dict.nav.getStarted, icon: Rocket, exact: false },
    { href: "/sites", label: dict.nav.sites, icon: KeyRound, exact: false },
    { href: "/webhooks", label: dict.nav.webhooks, icon: Webhook, exact: false },
    { href: "/playground", label: dict.nav.playground, icon: TerminalSquare, exact: false },
    { href: "/dashboard", label: dict.nav.dashboard, icon: BarChart3, exact: false },
    { href: "/events", label: dict.nav.events, icon: ListFilter, exact: false },
    { href: "/rules", label: dict.nav.rules, icon: ShieldCheck, exact: false },
    { href: "/visitors", label: dict.nav.visitors, icon: Users, exact: false },
    { href: "/settings", label: dict.nav.settings, icon: Database, exact: false },
    { href: "/releases", label: dict.nav.releases, icon: FileText, exact: false },
  ];

  const filteredCommands = React.useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    const base = navItems.map((item) => ({
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

    const combined = [...base, ...siteCommands];
    if (!q) return combined;
    return combined.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    );
  }, [navItems, commandQuery, sites, router, setSelectedSiteId]);

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
    <nav className="flex-1 space-y-1.5 overflow-y-auto px-3.5 py-5">
      {navItems.map((item) => {
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
              "group relative flex items-center gap-3.5 overflow-hidden rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all duration-150",
              active
                ? "bg-primary/15 font-semibold text-foreground shadow-xs ring-1 ring-primary/30 dark:bg-gradient-to-r dark:from-primary/25 dark:via-primary/15 dark:to-primary/5 dark:text-white"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              collapsed && !isMobile ? "mx-auto h-11 w-11 justify-center px-0" : ""
            )}
            title={collapsed && !isMobile ? item.label : undefined}
          >
            {/* ThumbmarkJS-style Glowing Vertical Left Bar on Active Item */}
            {active ? (
              <span className="absolute inset-y-1.5 left-0 w-[3.5px] rounded-r-full bg-gradient-to-b from-fuchsia-400 via-fuchsia-500 to-primary shadow-[0_0_12px_rgba(217,70,239,0.85)]" />
            ) : null}

            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors",
                active
                  ? "text-primary dark:text-white"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {!collapsed || isMobile ? (
              <span className="truncate tracking-[-0.01em]">{item.label}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-background text-foreground lg:flex-row",
        viewDensity === "compact" ? "text-[13px]" : ""
      )}
    >
      {/* ThumbmarkJS-style Sidebar using Clean Slate theme tokens (Light & Dark compatible) */}
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-[252px]"
        )}
      >
        {/* Floating collapse toggle on right border */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={dict.common.collapseSidebar}
          className="absolute -right-3 top-7 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Top Brand Header — ThumbmarkJS style with Clean Slate Primary Accent */}
        <div
          className={cn(
            "flex h-20 items-center border-b border-border px-6",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          <Link href="/" className="flex items-center gap-3.5 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40">
              <Fingerprint className="h-6 w-6 stroke-[2.2]" />
            </div>
            {!collapsed ? (
              <span className="truncate text-[21px] font-extrabold lowercase tracking-tight text-primary">
                {dict.common.brandName}
              </span>
            ) : null}
          </Link>
        </div>

        {renderNavLinks(false)}

        {/* Bottom Status & Theme / Language / Logout Controls */}
        <div className="space-y-3 border-t border-border p-4">
          {!collapsed ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="truncate font-medium text-foreground">
                  {dict.common.engineOnline}
                </span>
              </span>
              <span className="font-mono text-[10px] font-semibold text-primary">v1.0.0</span>
            </div>
          ) : null}

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
              className={cn(
                "text-muted-foreground hover:bg-destructive/15 hover:text-destructive",
                collapsed ? "h-8 w-10 px-0" : ""
              )}
              title={dict.common.logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Responsive Clean Slate Topbar */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/85 px-4 py-3 backdrop-blur-xl lg:px-8">
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
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Fingerprint className="h-4 w-4" />
              </div>
              <span className="font-extrabold lowercase text-primary">
                {dict.common.brandName}
              </span>
            </Link>

            {/* Global Site Selector */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <select
                aria-label={dict.common.allSites}
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="max-w-[160px] truncate bg-transparent text-xs font-medium text-foreground focus:outline-none sm:max-w-none"
              >
                <option value="all" className="bg-card text-foreground">
                  {dict.common.allSites}
                </option>
                {sites.map((s) => (
                  <option
                    key={s.publicId}
                    value={s.publicId}
                    className="bg-card text-foreground"
                  >
                    {s.name} ({s.publicId.slice(0, 12)})
                  </option>
                ))}
              </select>
            </div>

            {/* PRO View Density Switcher */}
            <div className="hidden items-center rounded-xl border border-border bg-background p-0.5 sm:inline-flex">
              <button
                type="button"
                onClick={() => setViewDensity("comfort")}
                title={dict.common.densityComfort}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
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
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
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

          {/* Right Toolbar: Auto-Refresh + Time Range + Command Palette + Mobile Locale/Theme */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1 md:flex">
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
                <option value={0} className="bg-card text-foreground">
                  {dict.common.autoRefreshOff}
                </option>
                <option value={5} className="bg-card text-foreground">
                  {dict.common.autoRefresh5s}
                </option>
                <option value={15} className="bg-card text-foreground">
                  {dict.common.autoRefresh15s}
                </option>
                <option value={60} className="bg-card text-foreground">
                  {dict.common.autoRefresh60s}
                </option>
              </select>
              <button
                type="button"
                onClick={triggerManualRefresh}
                title={dict.common.refresh}
                className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            <div className="inline-flex rounded-xl border border-border bg-background p-0.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs font-medium transition-all sm:px-2.5",
                    timeRange === r
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {getTimeLabel(r)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="hidden h-8 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:inline-flex"
            >
              <Command className="h-3.5 w-3.5 text-primary" />
              <span>{dict.common.commandShortcut}</span>
            </button>

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
        <div className="flex h-full flex-col justify-between bg-sidebar text-sidebar-foreground">
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
