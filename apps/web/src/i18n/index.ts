import en from "./dictionaries/en.json";
import fr from "./dictionaries/fr.json";

export type Locale = "en" | "fr";
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  fr,
};

export function getDictionary(locale: Locale = "fr"): Dictionary {
  return dictionaries[locale] ?? dictionaries.fr;
}

export { en, fr };

