"use client";

import * as React from "react";
import { getDictionary, type Dictionary, type Locale } from "./index";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (next: Locale) => void;
}

const I18nContext = React.createContext<I18nContextValue>({
  locale: "fr",
  dict: getDictionary("fr"),
  setLocale: () => undefined,
});

export function I18nProvider({
  children,
  initialLocale = "fr",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem("bloumeid_locale") as Locale | null;
      if (saved === "en" || saved === "fr") {
        setLocaleState(saved);
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

  const value = React.useMemo(
    () => ({
      locale,
      dict: getDictionary(locale),
      setLocale,
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return React.useContext(I18nContext);
}

