/**
 * Turns any thrown error into user-facing text in the active language.
 */
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, type FieldError } from "../api/errors";

/** Translated messages for one failed request. */
export interface ErrorMessages {
  /** One sentence for an alert or toast. */
  summary: string;
  /** Per-field messages for forms, keyed by field name. */
  fields: Record<string, string>;
}

/**
 * Hook returning a function that describes errors in the current language.
 *
 * @returns `describeError(error)`, safe to call with anything a promise rejected with.
 */
export function useErrorMessage(): (error: unknown) => ErrorMessages {
  const { t } = useTranslation();

  return useCallback(
    (error: unknown): ErrorMessages => {
      if (!(error instanceof ApiError)) {
        return { summary: t("errors.server"), fields: {} };
      }
      const fields: Record<string, string> = {};
      for (const fieldError of error.fieldErrors) {
        fields[fieldError.field] ??= describeField(fieldError, t);
      }
      return { summary: t(`errors.${error.kind}`), fields };
    },
    [t],
  );
}

/**
 * Translate one Pydantic error, falling back to a generic message for unknown types.
 *
 * @param fieldError Parsed 422 entry.
 * @param t Translation function.
 * @returns The field message.
 */
function describeField(fieldError: FieldError, t: ReturnType<typeof useTranslation>["t"]): string {
  const key = `validation.${fieldError.type}`;
  // i18next keys are typed, so an unknown Pydantic type is checked at runtime.
  return t(key as "validation.fallback", {
    ...fieldError.ctx,
    defaultValue: t("validation.fallback"),
  });
}
