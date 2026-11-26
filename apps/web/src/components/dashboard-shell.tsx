"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Fingerprint,
  Globe,
  Home,
  KeyRound,
  ListFilter,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { useI18n, type GlobalTimeRange } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);

  React.useEffect(() => {
    fetch("/api/admin/sites")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { sites?: PublicSiteDTO[] } | null) => {
        if (data?.sites) setSites(data.sites);
      })
      .catch(() => undefined);
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
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
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
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
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
                  <p className="font-bold tracking-tight text-foreground">{dict.common.brandName}</p>
                  <Badge variant="outline" className="px-1.5 py-0 font-mono text-[10px] text-primary">
                    v1.0.0
                  </Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{dict.common.companyName}</p>
              </div>
            ) : null}
          </Link>
        </div>

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

          <div className={cn("flex items-center gap-1.5", collapsed ? "flex-col" : "justify-between")}>
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
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
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

      {/* Main Content Area with Sticky Responsive Header (Mobile + Desktop Filter Bar) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/85 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
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
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">{dict.common.allSites}</option>
                {sites.map((s) => (
                  <option key={s.publicId} value={s.publicId}>
                    {s.name} ({s.publicId.slice(0, 12)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Global Time Range Selector + Mobile Theme/Locale controls */}
          <div className="flex flex-wrap items-center gap-2">
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
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

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
