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

  // Exact ThumbmarkJS Pro flat navigation structure & icons from user screenshot
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
              "group relative flex items-center gap-3.5 overflow-hidden rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-150",
              active
                ? "bg-gradient-to-r from-[#231942] via-[#1b1435] to-[#141026] font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.18)] ring-1 ring-white/8"
                : "text-[#7c859e] hover:bg-white/[0.03] hover:text-[#cbd5e1]",
              collapsed && !isMobile ? "mx-auto h-11 w-11 justify-center px-0" : ""
            )}
            title={collapsed && !isMobile ? item.label : undefined}
          >
            {/* Exact ThumbmarkJS Glowing Pink/Magenta Vertical Left Bar on Active Item */}
            {active ? (
              <span className="absolute inset-y-1.5 left-0 w-[3.5px] rounded-r-full bg-gradient-to-b from-[#f472b6] via-[#d946ef] to-[#8b5cf6] shadow-[0_0_12px_#e879f9]" />
            ) : null}

            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors",
                active
                  ? "text-white"
                  : "text-[#646e87] group-hover:text-[#cbd5e1]"
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
        "flex min-h-screen flex-col bg-[#08070e] text-foreground lg:flex-row",
        viewDensity === "compact" ? "text-[13px]" : ""
      )}
    >
      {/* Exact ThumbmarkJS Pro Dark Sidebar (#0b0a12) */}
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col border-r border-white/[0.07] bg-[#0b0a12] transition-all duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-[252px]"
        )}
      >
        {/* Subtle floating collapse toggle on right border */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={dict.common.collapseSidebar}
          className="absolute -right-3 top-7 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#12101e] text-[#7c859e] shadow-md transition-colors hover:border-[#635bff] hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Top Brand Header — Exact ThumbmarkJS Pro style */}
        <div
          className={cn(
            "flex h-20 items-center border-b border-white/[0.06] px-6",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          <Link href="/" className="flex items-center gap-3.5 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#635bff] to-[#4f46e5] text-white shadow-[0_0_20px_rgba(99,91,255,0.45)]">
              <Fingerprint className="h-6 w-6 stroke-[2.2]" />
            </div>
            {!collapsed ? (
              <span className="truncate text-[21px] font-extrabold lowercase tracking-tight text-[#635bff]">
                {dict.common.brandName}
              </span>
            ) : null}
          </Link>
        </div>

        {renderNavLinks(false)}

        {/* Clean Minimal Bottom Controls */}
        <div className="space-y-3 border-t border-white/[0.06] p-4">
          {!collapsed ? (
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-[#7c859e]">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="truncate font-medium text-slate-300">
                  {dict.common.engineOnline}
                </span>
              </span>
              <span className="font-mono text-[10px] text-[#635bff]">v1.0.0</span>
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
              className={cn(
                "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]",
                collapsed ? "h-8 w-10 px-0" : "flex-1"
              )}
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
              className={cn(
                "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]",
                collapsed ? "h-8 w-10 px-0" : ""
              )}
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
                "text-[#7c859e] hover:bg-rose-500/15 hover:text-rose-400",
                collapsed ? "h-8 w-10 px-0" : ""
              )}
              title={dict.common.logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Sleek Dark Topbar */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#08070e]">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0b0a12]/90 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/10 lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={dict.common.openMenu}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#635bff] text-white">
                <Fingerprint className="h-4 w-4" />
              </div>
              <span className="font-extrabold lowercase text-[#635bff]">
                {dict.common.brandName}
              </span>
            </Link>

            {/* Global Site Selector */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#12101d] px-3 py-1">
              <Shield className="h-3.5 w-3.5 text-[#635bff]" />
              <select
                aria-label={dict.common.allSites}
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none"
              >
                <option value="all" className="bg-[#12101d]">
                  {dict.common.allSites}
                </option>
                {sites.map((s) => (
                  <option key={s.publicId} value={s.publicId} className="bg-[#12101d]">
                    {s.name} ({s.publicId.slice(0, 12)})
                  </option>
                ))}
              </select>
            </div>

            {/* PRO View Density Switcher */}
            <div className="hidden items-center rounded-xl border border-white/10 bg-[#12101d] p-0.5 sm:inline-flex">
              <button
                type="button"
                onClick={() => setViewDensity("comfort")}
                title={dict.common.densityComfort}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                  viewDensity === "comfort"
                    ? "bg-[#231942] text-white shadow-2xs"
                    : "text-[#7c859e] hover:text-white"
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
                    ? "bg-[#231942] text-white shadow-2xs"
                    : "text-[#7c859e] hover:text-white"
                )}
              >
                <Rows3 className="h-3 w-3" />
                <span className="hidden xl:inline">{dict.common.densityCompact}</span>
              </button>
            </div>
          </div>

          {/* Right Toolbar: Auto-Refresh + Time Range + Command Palette */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-[#12101d] px-2.5 py-1 md:flex">
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 text-[#635bff]",
                  autoRefreshSec > 0 ? "animate-spin" : ""
                )}
              />
              <select
                aria-label={dict.common.refresh}
                value={autoRefreshSec}
                onChange={(e) =>
                  setAutoRefreshSec(Number(e.target.value) as AutoRefreshInterval)
                }
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none"
              >
                <option value={0} className="bg-[#12101d]">
                  {dict.common.autoRefreshOff}
                </option>
                <option value={5} className="bg-[#12101d]">
                  {dict.common.autoRefresh5s}
                </option>
                <option value={15} className="bg-[#12101d]">
                  {dict.common.autoRefresh15s}
                </option>
                <option value={60} className="bg-[#12101d]">
                  {dict.common.autoRefresh60s}
                </option>
              </select>
              <button
                type="button"
                onClick={triggerManualRefresh}
                title={dict.common.refresh}
                className="ml-1 rounded p-0.5 text-[#7c859e] hover:text-white"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            <div className="inline-flex rounded-xl border border-white/10 bg-[#12101d] p-0.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                    timeRange === r
                      ? "bg-[#635bff] text-white shadow-[0_0_12px_rgba(99,91,255,0.4)]"
                      : "text-[#7c859e] hover:text-white"
                  )}
                >
                  {getTimeLabel(r)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="hidden h-8 items-center gap-2 rounded-xl border border-white/10 bg-[#12101d] px-3 text-xs font-medium text-[#7c859e] transition-colors hover:border-[#635bff]/50 hover:text-white sm:inline-flex"
            >
              <Command className="h-3.5 w-3.5 text-[#635bff]" />
              <span>{dict.common.commandShortcut}</span>
            </button>
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
        <div className="flex h-full flex-col justify-between bg-[#0b0a12]">
          {renderNavLinks(true)}
          <div className="mt-6 border-t border-white/10 pt-4">
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
