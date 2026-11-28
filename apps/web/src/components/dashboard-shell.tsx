"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Command,
  HeartPulse,
  KeyRound,
  ListFilter,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Wand2,
  Webhook,
} from "lucide-react";
import { useI18n, type GlobalTimeRange } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/ui/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteFormModal } from "@/components/sites/site-form-modal";
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
    theme,
    toggleTheme,
    selectedSiteId,
    setSelectedSiteId,
    timeRange,
    setTimeRange,
    viewDensity,
    refreshTick,
  } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [commandQuery, setCommandQuery] = React.useState("");
  const [createSiteOpen, setCreateSiteOpen] = React.useState(false);
  const [sites, setSites] = React.useState<PublicSiteDTO[]>([]);
  const [adminUsername, setAdminUsername] = React.useState("admin");

  const loadSites = React.useCallback(() => {
    fetch("/api/admin/sites?all=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { sites?: PublicSiteDTO[] } | null) => {
        if (data?.sites) setSites(data.sites);
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { username?: string } | null) => {
        if (data?.username) setAdminUsername(data.username);
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    loadSites();
  }, [loadSites, refreshTick]);

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
        { href: "/dashboard", label: dict.nav.dashboard, icon: Activity, badge: null },
        { href: "/events", label: dict.nav.events, icon: ListFilter, badge: null },
      ],
    },
    {
      category: dict.nav.catSecurity,
      items: [
        { href: "/smart-signals", label: dict.nav.smartSignals, icon: Sparkles, badge: null },
        { href: "/rules", label: dict.nav.rules, icon: ShieldCheck, badge: null },
      ],
    },
    {
      category: dict.nav.catDeveloper,
      items: [
        { href: "/sites", label: dict.nav.sites, icon: KeyRound, badge: null },
        { href: "/webhooks", label: dict.nav.webhooks, icon: Webhook, badge: dict.webhooksPage.optionalBadge },
        { href: "/migrate", label: dict.nav.migrate, icon: Wand2, badge: null },
        { href: "/guides", label: dict.nav.guides, icon: BookOpen, badge: null },
      ],
    },
    {
      category: dict.nav.catInfra,
      items: [
        { href: "/health", label: dict.nav.health, icon: HeartPulse, badge: null },
        { href: "/security", label: dict.nav.security, icon: ShieldAlert, badge: null },
        { href: "/usage", label: dict.nav.usage, icon: BarChart3, badge: null },
        { href: "/settings", label: dict.nav.settings, icon: Settings, badge: null },
      ],
    },
  ];

  const allNavItems = navCategories.flatMap((c) => c.items);
  const activeNav = allNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

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

    const combined = [...base, ...siteCommands];
    if (!q) return combined;
    return combined.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    );
  }, [allNavItems, commandQuery, sites, router, setSelectedSiteId]);

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
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {navCategories.map((group, gIdx) => (
        <div key={group.category} className="space-y-1">
          {!collapsed || isMobile ? (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
              {group.category}
            </p>
          ) : gIdx > 0 ? (
            <div className="mx-auto my-2 h-px w-8 bg-border" />
          ) : null}

          {group.items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                className={cn(
                  "group relative flex items-center justify-between gap-2.5 overflow-hidden rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-all duration-150",
                  active
                    ? "bg-primary/15 font-semibold text-foreground shadow-xs ring-1 ring-primary/30 dark:bg-gradient-to-r dark:from-primary/25 dark:via-primary/15 dark:to-primary/5 dark:text-white"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  collapsed && !isMobile ? "mx-auto h-10 w-10 justify-center px-0" : ""
                )}
                title={collapsed && !isMobile ? item.label : undefined}
              >
                {active ? (
                  <span className="absolute inset-y-1.5 left-0 w-[3.5px] rounded-r-full bg-gradient-to-b from-fuchsia-400 via-fuchsia-500 to-primary shadow-[0_0_12px_rgba(217,70,239,0.85)]" />
                ) : null}

                <span className="flex min-w-0 items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-primary dark:text-white"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed || isMobile ? (
                    <span className="truncate">{item.label}</span>
                  ) : null}
                </span>

                {(!collapsed || isMobile) && item.badge ? (
                  <Badge variant="outline" className="px-1.5 py-0 text-[9px] text-primary">
                    {item.badge.split(" ")[0]}
                  </Badge>
                ) : null}
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
      {/* Desktop Sidebar (Fingerprint x ThumbmarkJS Pro) */}
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-[260px]"
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={dict.common.collapseSidebar}
          className="absolute -right-3 top-6 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Brand Header + Subtle Back to Home */}
        <div
          className={cn(
            "flex flex-col gap-2 border-b border-border px-4 py-4",
            collapsed ? "items-center px-0" : ""
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <Link href="/dashboard" className="flex items-center overflow-hidden">
              <BrandLogo variant={collapsed ? "icon" : "full"} size="md" showVersion={!collapsed} />
            </Link>
          </div>

          {!collapsed ? (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>{dict.nav.backHome}</span>
            </Link>
          ) : null}
        </div>

        {/* Workspace / Site Selector + Quick "+ Create Site" */}
        {!collapsed ? (
          <div className="space-y-2 border-b border-border p-3.5">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <select
                aria-label={dict.common.allSites}
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="min-w-0 flex-1 truncate bg-transparent text-xs font-semibold text-foreground focus:outline-none"
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
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-full justify-center gap-1.5 text-[11px]"
              onClick={() => setCreateSiteOpen(true)}
            >
              <Plus className="h-3 w-3 text-primary" />
              <span>{dict.nav.createSite}</span>
            </Button>
          </div>
        ) : null}

        {renderNavLinks(false)}

        <div className="border-t border-border p-3">
          {!collapsed ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-1.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-foreground">{dict.common.engineOnline}</span>
              </span>
              <span className="font-mono text-primary">@bloume/id</span>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {/* Top Navbar — Strict Top-Right Order: Theme + Lang | Username Pill | Logout */}
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/85 px-4 py-2.5 backdrop-blur-xl lg:px-8">
          {/* Left: Mobile Menu + Breadcrumb + Time Range + Ctrl+K */}
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

            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span className="font-semibold text-foreground">{dict.common.brandName}</span>
              <span>/</span>
              <span className="font-medium text-primary">
                {activeNav?.label ?? dict.nav.dashboard}
              </span>
            </div>

            <div className="inline-flex rounded-xl border border-border bg-background p-0.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs font-medium transition-all",
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
              className="hidden h-8 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground md:inline-flex"
            >
              <Command className="h-3.5 w-3.5 text-primary" />
              <span>{dict.common.commandShortcut}</span>
            </button>
          </div>

          {/* Strict Top-Right Order: 1. Theme + Lang | 2. Username Pill | 3. Logout */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="theme-switcher"
              onClick={toggleTheme}
              title={theme === "dark" ? dict.common.themeLight : dict.common.themeDark}
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </Button>

            <LocaleSwitcher />

            {/* Admin Username Pill */}
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 py-1 pl-1.5 pr-3 text-xs font-semibold text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {adminUsername.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{adminUsername}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>

            {/* Logout Button right next to Username */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="logout-button"
              onClick={handleLogout}
              className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              title={dict.common.logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
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

      {/* Unified Create Site Modal */}
      <SiteFormModal
        open={createSiteOpen}
        onOpenChange={setCreateSiteOpen}
        onCreated={(site) =>
          setSites((prev) => [site, ...prev.filter((s) => s.publicId !== site.publicId)])
        }
      />

      {/* PRO Command Palette Dialog (Ctrl+K) */}
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

      {/* Mobile Slide-Over Sheet Menu */}
      <Sheet
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        title={dict.common.brandName}
        description={dict.common.versionBadge}
        closeLabel={dict.common.close}
      >
        <div className="flex h-full flex-col justify-between bg-sidebar text-sidebar-foreground">
          {renderNavLinks(true)}
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{dict.nav.backHome}</span>
            </Link>
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
