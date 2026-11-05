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

/** Field length limits. Mirrors backend models.py (client-side checks only; the server decides). */
export const FIELD_LIMITS = {
  courseName: 80,
  courseCode: 20,
  courseSemester: 20,
  taskTitle: 200,
  lectureTitle: 200,
} as const;

/** Course page tabs, in display order. The first one is the default. */
export const COURSE_TABS = ["lectures", "tasks"] as const;

/** One tab of the course page. */
export type CourseTab = (typeof COURSE_TABS)[number];

/** Task kinds and statuses, in display order. Mirrors backend TaskKind / TaskStatus. */
export const TASK_KINDS = ["hw", "project", "exam", "quiz", "other"] as const;
export const TASK_STATUSES = ["todo", "doing", "done"] as const;

/** Delay before a typed search filters the transcript. */
export const SEARCH_DEBOUNCE_MS = 200;

/** Transcript blocks rendered at once; "show more" adds another page. */
export const TRANSCRIPT_PAGE_SIZE = 200;

/** How long a success toast stays on screen. */
export const TOAST_MS = 3000;

/** Route patterns for the router. */
export const ROUTE_PATTERNS = {
  courses: "/",
  course: "/courses/:courseId",
  lecture: "/lectures/:lectureId",
} as const;

/** Route builders for links, so links and the router cannot drift apart. */
export const ROUTES = {
  courses: "/",
  course: (courseId: number) => `/courses/${courseId}`,
  courseTab: (courseId: number, tab: CourseTab) => `/courses/${courseId}/${tab}`,
  lecture: (lectureId: number) => `/lectures/${lectureId}`,
} as const;
