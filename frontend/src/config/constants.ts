/**
 * App-wide constants. One place for every magic value.
 * Values marked "mirrors backend" must change together with the backend.
 */

/** Same-origin prefix that the dev proxy and nginx forward to the backend. */
export const API_BASE_URL = "/api";

/** Default page size for list requests. Mirrors backend: limit is 1..100. */
export const LIST_PAGE_SIZE = 50;

/** Largest accepted upload. Mirrors backend MAX_UPLOAD_BYTES. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Transcript file types the import endpoint accepts. Mirrors backend PARSERS. */
export const TRANSCRIPT_EXTENSIONS = [".md", ".json", ".vtt", ".txt"] as const;

/** Time zone all course deadlines are expressed in. */
export const TIME_ZONE = "Asia/Jerusalem";

/** Deadlines closer than this many days are highlighted. */
export const DEADLINE_SOON_DAYS = 3;

/** How many times a failed read is retried. Writes are never retried automatically. */
export const QUERY_RETRY_COUNT = 1;

/** How long fetched data counts as fresh before a background refetch. */
export const QUERY_STALE_MS = 30_000;

/** Languages the UI ships with. Add "en" here after adding its locale file. */
export const SUPPORTED_LANGUAGES = ["he"] as const;

/** A language code the UI supports. */
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Language used on first load. */
export const DEFAULT_LANGUAGE: Language = "he";

/** Route paths, built in one place so links and the router cannot drift apart. */
export const ROUTES = {
  courses: "/",
  course: (courseId: number) => `/courses/${courseId}`,
} as const;
