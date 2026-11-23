/**
 * Puts server-side validation errors on the matching form fields.
 */
import type { UseFormReturnType } from "@mantine/form";
import { useCallback } from "react";
import { useErrorMessage } from "./useErrorMessage";
import { useNotify } from "./useNotify";

/**
 * Hook returning a handler for failed form submissions.
 *
 * Field-level 422 errors go under their inputs. Anything else (or a 422 on a
 * field the form does not show) becomes a toast, so no error is ever silent.
 *
 * @returns `(form, error) => void`.
 */
export function useServerErrors() {
  const describeError = useErrorMessage();
  const notify = useNotify();
  return useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: works with any form's value type
    (form: UseFormReturnType<any>, error: unknown) => {
      const { fields } = describeError(error);
      const shown = Object.keys(fields).filter((field) => field in form.getValues());
      form.setErrors(Object.fromEntries(shown.map((field) => [field, fields[field]])));
      if (shown.length === 0) notify.error(error);
    },
    [describeError, notify],
  );
}
