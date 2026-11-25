import { describe, expect, it } from "vitest";
import en from "../src/i18n/dictionaries/en.json";
import fr from "../src/i18n/dictionaries/fr.json";

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

describe("i18n dictionary parity (en.json vs fr.json)", () => {
  it("has strictly identical nested key structures in en.json and fr.json", () => {
    const enKeys = flattenKeys(en as Record<string, unknown>);
    const frKeys = flattenKeys(fr as Record<string, unknown>);
    expect(enKeys).toEqual(frKeys);
    expect(enKeys.length).toBeGreaterThan(80);
  });

  it("contains no empty translation strings", () => {
    const checkNonEmpty = (obj: Record<string, unknown>, lang: string) => {
      for (const [k, v] of Object.entries(obj)) {
        if (v !== null && typeof v === "object") {
          checkNonEmpty(v as Record<string, unknown>, `${lang}.${k}`);
        } else {
          expect(typeof v, `Key ${lang}.${k} must be a string`).toBe("string");
          expect((v as string).trim().length, `Key ${lang}.${k} cannot be empty`).toBeGreaterThan(0);
        }
      }
    };
    checkNonEmpty(en as Record<string, unknown>, "en");
    checkNonEmpty(fr as Record<string, unknown>, "fr");
  });
});
