/**
 * Date helpers. Deadlines are stored as Israel wall-clock time without a zone
 * ("2026-11-09T23:59:00"), so they are formatted as written, never converted.
 */
import { TIME_ZONE } from "../config/constants";

const DAY_MS = 86_400_000;

/**
 * Today's date in Israel, whatever the device's time zone.
 *
 * @param now Current instant (injectable for tests).
 * @returns The date as YYYY-MM-DD.
 */
export function todayInIsrael(now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/**
 * Whole calendar days from today (Israel) to a local date or datetime.
 *
 * @param local A "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm[:ss]" wall-clock value.
 * @param now Current instant (injectable for tests).
 * @returns 0 for today, 1 for tomorrow, negative when overdue.
 */
export function daysUntil(local: string, now: Date = new Date()): number {
  const target = Date.parse(`${local.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${todayInIsrael(now)}T00:00:00Z`);
  return Math.round((target - today) / DAY_MS);
}

/**
 * Format a wall-clock value for display without shifting it to the device's zone.
 *
 * @param local "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm[:ss]".
 * @param language UI language code.
 * @returns A localized date, plus the time when one is present.
 */
export function formatLocal(local: string, language: string): string {
  const hasTime = local.length > 10;
  // Reading the wall-clock value as UTC and formatting in UTC keeps it unchanged.
  const instant = new Date(hasTime ? `${local.slice(0, 19)}Z` : `${local}T00:00:00Z`);
  return new Intl.DateTimeFormat(language, {
    timeZone: "UTC",
    dateStyle: "medium",
    ...(hasTime ? { timeStyle: "short" } : {}),
  }).format(instant);
}

/**
 * Convert an API datetime to the value a datetime-local input expects.
 *
 * @param local API value or null.
 * @returns "YYYY-MM-DDTHH:mm", or "" for none.
 */
export function toDateTimeInput(local: string | null | undefined): string {
  return local ? local.slice(0, 16) : "";
}

/**
 * Convert a date or datetime-local input value to an API value.
 *
 * @param value Input value.
 * @returns The value, or null when the input is empty.
 */
export function fromInput(value: string): string | null {
  return value.trim() === "" ? null : value;
}

/**
 * Format a real instant (with a time zone, e.g. a server timestamp) as an Israeli date.
 *
 * @param iso ISO timestamp with an offset or "Z".
 * @param language UI language code.
 * @returns A localized date.
 */
export function formatInstantDate(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { timeZone: TIME_ZONE, dateStyle: "medium" }).format(
    new Date(iso),
  );
}
