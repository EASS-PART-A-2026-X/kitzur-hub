/**
 * i18next setup. To add a language: create locales/<code>.ts typed as `Locale`,
 * register it in `resources`, and add the code to SUPPORTED_LANGUAGES.
 * Text direction follows the language automatically.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "../config/constants";
import he from "./locales/he";

export const resources = { he: { translation: he } } as const;

/**
 * Mirror the active language on <html> so the browser, screen readers and
 * CSS logical properties all use the right direction.
 *
 * @param language Active language code.
 */
function applyDocumentLanguage(language: string): void {
  document.documentElement.lang = language;
  document.documentElement.dir = i18n.dir(language);
}

i18n.on("languageChanged", applyDocumentLanguage);

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  // React already escapes rendered text, so i18next must not escape again.
  interpolation: { escapeValue: false },
});

export default i18n;
