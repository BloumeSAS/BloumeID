import en from "./dictionaries/en.json";
import fr from "./dictionaries/fr.json";
import es from "./dictionaries/es.json";
import de from "./dictionaries/de.json";
import pt from "./dictionaries/pt.json";
import it from "./dictionaries/it.json";
import nl from "./dictionaries/nl.json";
import ja from "./dictionaries/ja.json";

export type Locale = "en" | "fr" | "es" | "de" | "pt" | "it" | "nl" | "ja";
export type Dictionary = typeof en;

export interface LocaleMeta {
  code: Locale;
  iso: string;
  nativeName: string;
}

export const SUPPORTED_LOCALES: readonly LocaleMeta[] = [
  { code: "fr", iso: "FR", nativeName: "Français" },
  { code: "en", iso: "EN", nativeName: "English" },
  { code: "es", iso: "ES", nativeName: "Español" },
  { code: "de", iso: "DE", nativeName: "Deutsch" },
  { code: "pt", iso: "PT", nativeName: "Português" },
  { code: "it", iso: "IT", nativeName: "Italiano" },
  { code: "nl", iso: "NL", nativeName: "Nederlands" },
  { code: "ja", iso: "JA", nativeName: "日本語" },
] as const;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  fr,
  es,
  de,
  pt,
  it,
  nl,
  ja,
};

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && Object.hasOwn(dictionaries, value));
}

export function detectBrowserLocale(languageHeader: string | null | undefined): Locale {
  if (!languageHeader) return "fr";
  const normalized = languageHeader.toLowerCase().split(/[-_]/)[0] ?? "";
  return isSupportedLocale(normalized) ? normalized : "en";
}

export function getDictionary(locale: Locale = "fr"): Dictionary {
  return dictionaries[locale] ?? dictionaries.fr;
}

export { en, fr, es, de, pt, it, nl, ja };
