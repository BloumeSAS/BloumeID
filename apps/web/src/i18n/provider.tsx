"use client";

import * as React from "react";
import {
  detectBrowserLocale,
  getDictionary,
  isSupportedLocale,
  type Dictionary,
  type Locale,
} from "./index";

export type ThemeMode = "dark" | "light";
export type GlobalTimeRange = "1h" | "24h" | "7d" | "30d" | "90d";
export type ViewDensityMode = "comfort" | "compact";
export type AutoRefreshInterval = 0 | 5 | 15 | 60;

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (next: Locale) => void;
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
  selectedSiteId: string;
  setSelectedSiteId: (siteId: string) => void;
  timeRange: GlobalTimeRange;
  setTimeRange: (range: GlobalTimeRange) => void;
  viewDensity: ViewDensityMode;
  setViewDensity: (density: ViewDensityMode) => void;
  autoRefreshSec: AutoRefreshInterval;
  setAutoRefreshSec: (sec: AutoRefreshInterval) => void;
  refreshTick: number;
  triggerManualRefresh: () => void;
}

const I18nContext = React.createContext<I18nContextValue>({
  locale: "fr",
  dict: getDictionary("fr"),
  setLocale: () => undefined,
  theme: "dark",
  setTheme: () => undefined,
  toggleTheme: () => undefined,
  selectedSiteId: "all",
  setSelectedSiteId: () => undefined,
  timeRange: "24h",
  setTimeRange: () => undefined,
  viewDensity: "comfort",
  setViewDensity: () => undefined,
  autoRefreshSec: 0,
  setAutoRefreshSec: () => undefined,
  refreshTick: 0,
  triggerManualRefresh: () => undefined,
});

export function I18nProvider({
  children,
  initialLocale = "fr",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);
  const [theme, setThemeState] = React.useState<ThemeMode>("dark");
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("all");
  const [timeRange, setTimeRangeState] = React.useState<GlobalTimeRange>("24h");
  const [viewDensity, setViewDensityState] = React.useState<ViewDensityMode>("comfort");
  const [autoRefreshSec, setAutoRefreshSec] = React.useState<AutoRefreshInterval>(0);
  const [refreshTick, setRefreshTick] = React.useState<number>(0);

  React.useEffect(() => {
    try {
      const savedLocale = window.localStorage.getItem("bloumeid_locale");
      if (isSupportedLocale(savedLocale)) {
        setLocaleState(savedLocale);
        document.documentElement.lang = savedLocale;
      } else if (typeof navigator !== "undefined" && navigator.language) {
        const detected = detectBrowserLocale(navigator.language);
        setLocaleState(detected);
        document.documentElement.lang = detected;
      } else {
        document.documentElement.lang = initialLocale;
      }
      const savedTheme = window.localStorage.getItem("bloumeid_theme") as ThemeMode | null;
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
        document.documentElement.classList.toggle("dark", savedTheme === "dark");
      } else {
        document.documentElement.classList.add("dark");
      }
      const savedDensity = window.localStorage.getItem("bloumeid_density") as ViewDensityMode | null;
      if (savedDensity === "comfort" || savedDensity === "compact") {
        setViewDensityState(savedDensity);
      }
      const savedRange = window.localStorage.getItem("bloumeid_time_range") as GlobalTimeRange | null;
      if (
        savedRange === "1h" ||
        savedRange === "24h" ||
        savedRange === "7d" ||
        savedRange === "30d" ||
        savedRange === "90d"
      ) {
        setTimeRangeState(savedRange);
      }
    } catch {
      // Ignore storage error
    }
  }, [initialLocale]);

  React.useEffect(() => {
    if (autoRefreshSec <= 0) return;
    const id = window.setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, autoRefreshSec * 1000);
    return () => window.clearInterval(id);
  }, [autoRefreshSec]);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
    try {
      window.localStorage.setItem("bloumeid_locale", next);
    } catch {
      // Ignore storage error
    }
  }, []);

  const setTheme = React.useCallback((next: ThemeMode) => {
    setThemeState(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
    try {
      window.localStorage.setItem("bloumeid_theme", next);
    } catch {
      // Ignore storage error
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const setViewDensity = React.useCallback((next: ViewDensityMode) => {
    setViewDensityState(next);
    try {
      window.localStorage.setItem("bloumeid_density", next);
    } catch {
      // Ignore storage error
    }
  }, []);

  const setTimeRange = React.useCallback((next: GlobalTimeRange) => {
    setTimeRangeState(next);
    try {
      window.localStorage.setItem("bloumeid_time_range", next);
    } catch {
      // Ignore storage error
    }
  }, []);

  const triggerManualRefresh = React.useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const value = React.useMemo(
    () => ({
      locale,
      dict: getDictionary(locale),
      setLocale,
      theme,
      setTheme,
      toggleTheme,
      selectedSiteId,
      setSelectedSiteId,
      timeRange,
      setTimeRange,
      viewDensity,
      setViewDensity,
      autoRefreshSec,
      setAutoRefreshSec,
      refreshTick,
      triggerManualRefresh,
    }),
    [
      locale,
      setLocale,
      theme,
      setTheme,
      toggleTheme,
      selectedSiteId,
      timeRange,
      viewDensity,
      setViewDensity,
      autoRefreshSec,
      refreshTick,
      triggerManualRefresh,
    ]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return React.useContext(I18nContext);
}
