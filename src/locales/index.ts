import type { Locale, Translations } from "./types";
import { en } from "./en";
import { ru } from "./ru";

export * from "./types";
export { en, ru };

export const translations: Record<Locale, Translations> = {
  en,
  ru,
};

export function getTranslations(locale: Locale): Translations {
  return translations[locale] || en;
}
