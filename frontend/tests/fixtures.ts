/**
 * Shared API payloads for component tests.
 */
import type { Course, Task } from "../src/api/types";

export const COURSE: Course = {
  id: 1,
  name: "Engineering of Advanced Software Solutions",
  code: "EASS",
  semester: "2027A",
  exam_date: null,
  lecture_count: 2,
  open_task_count: 1,
  next_due_at: null,
};

export const TASK: Task = {
  id: 10,
  course_id: 1,
  title: "EX1: Backend",
  kind: "hw",
  due_at: "2099-11-09T23:59:00",
  weight_pct: 20,
  status: "todo",
  origin: "manual",
};
