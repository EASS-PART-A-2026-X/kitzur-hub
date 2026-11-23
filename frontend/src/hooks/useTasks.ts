/**
 * Task data hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, request } from "../api/client";
import { queryKeys } from "../api/keys";
import type { Task, TaskCreate, TaskStatus, TaskUpdate } from "../api/types";
import { LIST_PAGE_SIZE } from "../config/constants";

/**
 * List a course's tasks, earliest deadline first.
 *
 * @param courseId Course id.
 * @param status Only tasks in this status, or null for all.
 * @returns The query for the task list.
 */
export function useTasks(courseId: number, status: TaskStatus | null) {
  return useQuery({
    queryKey: queryKeys.tasks.list(courseId, status),
    queryFn: (): Promise<Task[]> =>
      request("GET", () =>
        api.GET("/courses/{course_id}/tasks", {
          params: {
            path: { course_id: courseId },
            query: { limit: LIST_PAGE_SIZE, ...(status ? { status } : {}) },
          },
        }),
      ),
  });
}

/**
 * Refetch this course's tasks and the course cards (open task counts) after a write.
 *
 * @param courseId Course whose tasks changed.
 * @returns The invalidation function.
 */
function useInvalidateTasks(courseId: number) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.tasks.byCourse(courseId) }),
      client.invalidateQueries({ queryKey: queryKeys.courses.all }),
    ]);
}

/**
 * Create a task in a course.
 *
 * @param courseId Parent course.
 * @returns The mutation; call `mutate(body)`.
 */
export function useCreateTask(courseId: number) {
  const invalidate = useInvalidateTasks(courseId);
  return useMutation({
    mutationFn: (body: TaskCreate): Promise<Task> =>
      request("POST", () =>
        api.POST("/courses/{course_id}/tasks", { params: { path: { course_id: courseId } }, body }),
      ),
    onSettled: invalidate,
  });
}

/** Variables for useUpdateTask. */
export interface TaskUpdateVars {
  taskId: number;
  changes: TaskUpdate;
}

/**
 * Update any task of a course.
 *
 * @param courseId Parent course (for refetching).
 * @returns The mutation; call `mutate({ taskId, changes })`.
 */
export function useUpdateTask(courseId: number) {
  const invalidate = useInvalidateTasks(courseId);
  return useMutation({
    mutationFn: ({ taskId, changes }: TaskUpdateVars): Promise<Task> =>
      request("PATCH", () =>
        api.PATCH("/tasks/{task_id}", { params: { path: { task_id: taskId } }, body: changes }),
      ),
    onSettled: invalidate,
  });
}

/**
 * Delete any task of a course.
 *
 * @param courseId Parent course (for refetching).
 * @returns The mutation; call `mutate(taskId)`.
 */
export function useDeleteTask(courseId: number) {
  const invalidate = useInvalidateTasks(courseId);
  return useMutation({
    mutationFn: (taskId: number): Promise<void> =>
      request("DELETE", () =>
        api.DELETE("/tasks/{task_id}", { params: { path: { task_id: taskId } } }),
      ),
    onSettled: invalidate,
  });
}
