/** Type-checks every t("...") key against the Hebrew locale at compile time. */
import "i18next";
import type he from "./locales/he";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof he };
  }
}
