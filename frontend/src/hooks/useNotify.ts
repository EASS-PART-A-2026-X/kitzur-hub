/**
 * Toast notifications with translated text.
 */
import { notifications } from "@mantine/notifications";
import { useCallback, useMemo } from "react";
import { TOAST_MS } from "../config/constants";
import { useErrorMessage } from "./useErrorMessage";

/** Functions for showing success and error toasts. */
export interface Notify {
  /** Show an already translated success message. */
  success: (message: string) => void;
  /** Show the translated summary of any error. */
  error: (error: unknown) => void;
}

/**
 * Hook returning toast helpers bound to the current language.
 *
 * @returns success and error toast functions.
 */
export function useNotify(): Notify {
  const describeError = useErrorMessage();
  const success = useCallback((message: string) => {
    notifications.show({ message, color: "teal", autoClose: TOAST_MS });
  }, []);
  const error = useCallback(
    (err: unknown) => {
      notifications.show({ message: describeError(err).summary, color: "red", autoClose: false });
    },
    [describeError],
  );
  return useMemo(() => ({ success, error }), [success, error]);
}
