/**
 * Course data hooks. Components never call the API directly.
 */
import { useQuery } from "@tanstack/react-query";
import { api, request } from "../api/client";
import { queryKeys } from "../api/keys";
import type { Course } from "../api/types";
import { LIST_PAGE_SIZE } from "../config/constants";

/**
 * List all courses.
 *
 * @returns The TanStack query for the course list.
 */
export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: (): Promise<Course[]> =>
      request("GET", () => api.GET("/courses", { params: { query: { limit: LIST_PAGE_SIZE } } })),
  });
}
