/**
 * Practice hooks: session questions, graded answers and course totals.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, request } from "../api/client";
import { queryKeys } from "../api/keys";
import type {
  AttemptCreate,
  AttemptResult,
  PracticeQuestion,
  PracticeSummary,
  QuestionType,
} from "../api/types";

/** What the user chose for a practice session. */
export interface PracticeOptions {
  count: number;
  lectureId: number | null;
  type: QuestionType | null;
}

/**
 * Practice totals for a course.
 *
 * @param courseId Course id.
 * @returns The query for the summary.
 */
export function usePracticeSummary(courseId: number) {
  return useQuery({
    queryKey: queryKeys.practice.summary(courseId),
    queryFn: (): Promise<PracticeSummary> =>
      request("GET", () =>
        api.GET("/courses/{course_id}/practice/summary", {
          params: { path: { course_id: courseId } },
        }),
      ),
  });
}

/**
 * Questions for one practice session, fetched once when the session starts.
 *
 * Developer note: the backend picks least-practiced questions with random
 * tie-breaks, so a refetch would swap questions mid-session. The query is
 * therefore never refetched on its own; `round` changes to start a new one.
 *
 * @param courseId Course id.
 * @param options Session options.
 * @param round Session number; null until the user starts.
 * @returns The query for the session's questions.
 */
export function usePracticeSession(
  courseId: number,
  options: PracticeOptions,
  round: number | null,
) {
  return useQuery({
    queryKey: queryKeys.practice.session(courseId, options, round ?? 0),
    enabled: round !== null,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: (): Promise<PracticeQuestion[]> =>
      request("GET", () =>
        api.GET("/courses/{course_id}/practice", {
          params: {
            path: { course_id: courseId },
            query: {
              count: options.count,
              ...(options.lectureId ? { lecture_id: options.lectureId } : {}),
              ...(options.type ? { type: options.type } : {}),
            },
          },
        }),
      ),
  });
}

/** Variables for useAnswerQuestion. */
export interface AnswerVars {
  questionId: number;
  answer: AttemptCreate;
}

/**
 * Send one answer and get it graded.
 *
 * @param courseId Course whose totals change.
 * @returns The mutation; call `mutate({ questionId, answer })`.
 */
export function useAnswerQuestion(courseId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, answer }: AnswerVars): Promise<AttemptResult> =>
      request("POST", () =>
        api.POST("/questions/{question_id}/attempts", {
          params: { path: { question_id: questionId } },
          body: answer,
        }),
      ),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.practice.summary(courseId) }),
  });
}
