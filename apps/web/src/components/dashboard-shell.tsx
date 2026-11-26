"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Cpu,
  Fingerprint,
  Globe,
  Home,
  KeyRound,
  LogOut,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { dict, locale, setLocale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/", label: dict.nav.home, icon: Home, exact: true },
    { href: "/dashboard", label: dict.nav.dashboard, icon: Activity, exact: false },
    { href: "/sites", label: dict.nav.sites, icon: KeyRound, exact: false },
    { href: "/visitors", label: dict.nav.visitors, icon: Users, exact: false },
    { href: "/playground", label: dict.nav.playground, icon: Cpu, exact: false },
    { href: "/settings", label: dict.nav.settings, icon: Settings, exact: false },
  ];

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card/70">
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary ring-1 ring-primary/40">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold tracking-tight text-foreground">{dict.common.brandName}</p>
              <p className="text-xs text-muted-foreground">{dict.common.companyName}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="locale-switcher"
              onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
              className="flex-1"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{locale.toUpperCase()}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="logout-button"
              onClick={handleLogout}
              title={dict.common.logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
            <Shield className="h-3 w-3 text-primary" />
            <span className="truncate">{dict.common.tagline}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
