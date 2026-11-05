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
  lectures: {
    all: ["lectures"] as const,
    byCourse: (courseId: number) => [...queryKeys.lectures.all, "course", courseId] as const,
    detail: (lectureId: number) => [...queryKeys.lectures.all, "detail", lectureId] as const,
  },
  materials: {
    all: ["materials"] as const,
    byCourse: (courseId: number) => [...queryKeys.materials.all, "course", courseId] as const,
    detail: (materialId: number) => [...queryKeys.materials.all, "detail", materialId] as const,
  },
  practice: {
    all: ["practice"] as const,
    summary: (courseId: number) => [...queryKeys.practice.all, "summary", courseId] as const,
    session: (courseId: number, options: object, round: number) =>
      [...queryKeys.practice.all, "session", courseId, options, round] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    byCourse: (courseId: number) => [...queryKeys.tasks.all, courseId] as const,
    list: (courseId: number, status: string | null) =>
      [...queryKeys.tasks.byCourse(courseId), status ?? "all"] as const,
  },
} as const;
