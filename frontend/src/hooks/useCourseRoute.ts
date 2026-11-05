/**
 * Route helpers shared by the course page and its tabs.
 */
import { useOutletContext, useParams } from "react-router";
import type { Course } from "../api/types";

/** What CourseLayout passes down to its tab routes. */
export interface CourseOutletContext {
  course: Course;
}

/**
 * Read the course id from the URL.
 *
 * @returns A positive integer id, or null when the URL holds anything else.
 */
export function useCourseId(): number | null {
  const { courseId } = useParams();
  const id = Number(courseId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * The course loaded by CourseLayout, for use inside its tabs.
 *
 * @returns The current course.
 */
export function useCurrentCourse(): Course {
  return useOutletContext<CourseOutletContext>().course;
}
