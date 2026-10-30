/**
 * Query keys for TanStack Query, built in one place so reads and the
 * invalidations after writes always agree.
 */
export const queryKeys = {
  courses: {
    all: ["courses"] as const,
    list: () => [...queryKeys.courses.all, "list"] as const,
    detail: (courseId: number) => [...queryKeys.courses.all, "detail", courseId] as const,
  },
} as const;
