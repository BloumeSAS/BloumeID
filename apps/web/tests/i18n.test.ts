import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../src/i18n/dictionaries/en.json";
import fr from "../src/i18n/dictionaries/fr.json";
import es from "../src/i18n/dictionaries/es.json";
import de from "../src/i18n/dictionaries/de.json";
import pt from "../src/i18n/dictionaries/pt.json";
import itDict from "../src/i18n/dictionaries/it.json";
import nl from "../src/i18n/dictionaries/nl.json";
import ja from "../src/i18n/dictionaries/ja.json";

const DICTIONARIES: Record<string, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  fr: fr as Record<string, unknown>,
  es: es as Record<string, unknown>,
  de: de as Record<string, unknown>,
  pt: pt as Record<string, unknown>,
  it: itDict as Record<string, unknown>,
  nl: nl as Record<string, unknown>,
  ja: ja as Record<string, unknown>,
};

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

function collectTsxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectTsxFiles(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("i18n 8-language parity & anti-hardcoded UI string audit", () => {
  it("has strictly identical nested key structures across all 8 languages (en, fr, es, de, pt, it, nl, ja)", () => {
    const enKeys = flattenKeys(DICTIONARIES.en!);
    expect(enKeys.length).toBeGreaterThan(250);

    for (const [lang, dict] of Object.entries(DICTIONARIES)) {
      const keys = flattenKeys(dict);
      expect(keys, `Key tree mismatch in ${lang}.json`).toEqual(enKeys);
    }
  });

  it("contains no empty translation strings in any of the 8 dictionaries", () => {
    const checkNonEmpty = (obj: Record<string, unknown>, langPath: string) => {
      for (const [k, v] of Object.entries(obj)) {
        if (v !== null && typeof v === "object") {
          checkNonEmpty(v as Record<string, unknown>, `${langPath}.${k}`);
        } else {
          expect(typeof v, `Key ${langPath}.${k} must be a string`).toBe("string");
          expect((v as string).trim().length, `Key ${langPath}.${k} cannot be empty`).toBeGreaterThan(0);
        }
      }
    };

    for (const [lang, dict] of Object.entries(DICTIONARIES)) {
      checkNonEmpty(dict, lang);
    }
  });

  it("enforces zero hardcoded French/English prose in landing page & error shell JSX", () => {
    const criticalUiFiles = [
      path.resolve(__dirname, "../src/app/page.tsx"),
      path.resolve(__dirname, "../src/components/error-page-shell.tsx"),
      ...collectTsxFiles(path.resolve(__dirname, "../src/app/(dashboard)")),
    ];

    const forbiddenFrenchPhrase = />\s*(?:Tester mon navigateur|Explorer la Console|Banc d'Essai|Architecture Souveraine|Comparatif Technique|Déploiement & Intégration|Auto-détection dans le repo)\s*</;

    for (const file of criticalUiFiles) {
      const content = fs.readFileSync(file, "utf8");
      expect(forbiddenFrenchPhrase.test(content), `Hardcoded UI prose found in ${file}`).toBe(false);
    }
  });
});
