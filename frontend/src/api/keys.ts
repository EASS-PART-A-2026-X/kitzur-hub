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
  tasks: {
    all: ["tasks"] as const,
    byCourse: (courseId: number) => [...queryKeys.tasks.all, courseId] as const,
    list: (courseId: number, status: string | null) =>
      [...queryKeys.tasks.byCourse(courseId), status ?? "all"] as const,
  },
} as const;
