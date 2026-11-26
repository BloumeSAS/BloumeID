"use client";

import * as React from "react";
import { getDictionary, type Dictionary, type Locale } from "./index";

export type ThemeMode = "dark" | "light";
export type GlobalTimeRange = "1h" | "24h" | "7d" | "30d" | "90d";

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
  const [timeRange, setTimeRange] = React.useState<GlobalTimeRange>("24h");

  React.useEffect(() => {
    try {
      const savedLocale = window.localStorage.getItem("bloumeid_locale") as Locale | null;
      if (savedLocale === "en" || savedLocale === "fr") {
        setLocaleState(savedLocale);
      }
      const savedTheme = window.localStorage.getItem("bloumeid_theme") as ThemeMode | null;
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
        document.documentElement.classList.toggle("dark", savedTheme === "dark");
      } else {
        document.documentElement.classList.add("dark");
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem("bloumeid_locale", next);
    } catch {
      // Ignore storage error
    }
  }, []);

  const setTheme = React.useCallback((next: ThemeMode) => {
    setThemeState(next);
    try {
      window.localStorage.setItem("bloumeid_theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
    } catch {
      // Ignore storage error
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

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
    }),
    [locale, setLocale, theme, setTheme, toggleTheme, selectedSiteId, timeRange]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return React.useContext(I18nContext);
}
