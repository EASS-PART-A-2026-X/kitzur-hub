/**
 * Lecture data hooks: list, detail, import, rename and delete.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, request, toFormData } from "../api/client";
import { queryKeys } from "../api/keys";
import type { Lecture, LectureDetail, LectureUpdate } from "../api/types";
import { LIST_PAGE_SIZE } from "../config/constants";

/**
 * List a course's lectures by date.
 *
 * @param courseId Course id.
 * @returns The query for the lecture list.
 */
export function useLectures(courseId: number) {
  return useQuery({
    queryKey: queryKeys.lectures.byCourse(courseId),
    queryFn: (): Promise<Lecture[]> =>
      request("GET", () =>
        api.GET("/courses/{course_id}/lectures", {
          params: { path: { course_id: courseId }, query: { limit: LIST_PAGE_SIZE } },
        }),
      ),
  });
}

/**
 * Load one lecture with its transcript.
 *
 * @param lectureId Lecture id.
 * @returns The query for that lecture.
 */
export function useLecture(lectureId: number) {
  return useQuery({
    queryKey: queryKeys.lectures.detail(lectureId),
    queryFn: (): Promise<LectureDetail> =>
      request("GET", () =>
        api.GET("/lectures/{lecture_id}", { params: { path: { lecture_id: lectureId } } }),
      ),
  });
}

/**
 * Refetch lecture lists and course cards (lecture counts) after a write.
 *
 * @returns The invalidation function.
 */
function useInvalidateLectures() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.lectures.all }),
      client.invalidateQueries({ queryKey: queryKeys.courses.all }),
    ]);
}

/**
 * Import one transcript file into a course.
 *
 * @param courseId Target course.
 * @returns The mutation; call `mutateAsync(file)`.
 */
export function useImportLecture(courseId: number) {
  const invalidate = useInvalidateLectures();
  return useMutation({
    mutationFn: (file: File): Promise<Lecture> =>
      request("POST", () =>
        api.POST("/courses/{course_id}/lectures/import", {
          params: { path: { course_id: courseId } },
          body: { file } as unknown as { file: string },
          bodySerializer: toFormData,
        }),
      ),
    onSettled: invalidate,
  });
}

/**
 * Rename or re-date a lecture.
 *
 * @param lectureId Lecture to update.
 * @returns The mutation; call `mutate(changes)`.
 */
export function useUpdateLecture(lectureId: number) {
  const invalidate = useInvalidateLectures();
  return useMutation({
    mutationFn: (body: LectureUpdate): Promise<Lecture> =>
      request("PATCH", () =>
        api.PATCH("/lectures/{lecture_id}", { params: { path: { lecture_id: lectureId } }, body }),
      ),
    onSettled: invalidate,
  });
}

/**
 * Delete a lecture.
 *
 * @param lectureId Lecture to delete.
 * @returns The mutation; call `mutate()`.
 */
export function useDeleteLecture(lectureId: number) {
  const client = useQueryClient();
  const invalidate = useInvalidateLectures();
  return useMutation({
    mutationFn: (): Promise<void> =>
      request("DELETE", () =>
        api.DELETE("/lectures/{lecture_id}", { params: { path: { lecture_id: lectureId } } }),
      ),
    onSuccess: () => client.removeQueries({ queryKey: queryKeys.lectures.detail(lectureId) }),
    onSettled: invalidate,
  });
}
