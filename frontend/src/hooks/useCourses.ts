/**
 * Course data hooks. Components never call the API directly.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, request } from "../api/client";
import { queryKeys } from "../api/keys";
import type { Course, CourseCreate, CourseUpdate } from "../api/types";
import { LIST_PAGE_SIZE } from "../config/constants";

/**
 * List all courses.
 *
 * @returns The query for the course list.
 */
export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: (): Promise<Course[]> =>
      request("GET", () => api.GET("/courses", { params: { query: { limit: LIST_PAGE_SIZE } } })),
  });
}

/**
 * Load one course.
 *
 * @param courseId Course id.
 * @returns The query for that course.
 */
export function useCourse(courseId: number) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: (): Promise<Course> =>
      request("GET", () =>
        api.GET("/courses/{course_id}", { params: { path: { course_id: courseId } } }),
      ),
  });
}

/**
 * Refetch every course query once a write settles.
 *
 * Developer note: "settled" includes failures on purpose. After a lost reply
 * the write may have been applied, so the screen must show the server's state.
 *
 * @returns A function that invalidates course queries.
 */
function useInvalidateCourses() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: queryKeys.courses.all });
}

/**
 * Create a course.
 *
 * @returns The mutation; call `mutate(body)`.
 */
export function useCreateCourse() {
  const invalidate = useInvalidateCourses();
  return useMutation({
    mutationFn: (body: CourseCreate): Promise<Course> =>
      request("POST", () => api.POST("/courses", { body })),
    onSettled: invalidate,
  });
}

/**
 * Update a course.
 *
 * @param courseId Course to update.
 * @returns The mutation; call `mutate(changes)`.
 */
export function useUpdateCourse(courseId: number) {
  const invalidate = useInvalidateCourses();
  return useMutation({
    mutationFn: (body: CourseUpdate): Promise<Course> =>
      request("PATCH", () =>
        api.PATCH("/courses/{course_id}", { params: { path: { course_id: courseId } }, body }),
      ),
    onSettled: invalidate,
  });
}

/**
 * Delete a course with everything in it.
 *
 * @param courseId Course to delete.
 * @returns The mutation; call `mutate()`.
 */
export function useDeleteCourse(courseId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<void> =>
      request("DELETE", () =>
        api.DELETE("/courses/{course_id}", { params: { path: { course_id: courseId } } }),
      ),
    onSuccess: () => client.removeQueries({ queryKey: queryKeys.courses.detail(courseId) }),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.courses.list() }),
  });
}
