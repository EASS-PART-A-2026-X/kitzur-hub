/**
 * Shared API payloads for component tests.
 */
import type {
  Course,
  Lecture,
  LectureDetail,
  Material,
  PracticeQuestion,
  Task,
} from "../src/api/types";

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

export const LECTURE: Lecture = {
  id: 5,
  course_id: 1,
  title: "EASS שיעור 2: HTTP",
  held_on: "2026-10-26",
  source_format: "md",
  duration_sec: 3725,
  segment_count: 3,
  created_at: "2026-10-30T10:00:00Z",
};

export const LECTURE_DETAIL: LectureDetail = {
  ...LECTURE,
  segments: [
    { start_sec: 0, end_sec: 60, speaker: "מרצה", text: "היום נדבר על HTTP ועל קודי סטטוס." },
    { start_sec: 61, end_sec: 70, speaker: "סטודנט/ית", text: "מה ההבדל בין PATCH ל-PUT?" },
    { start_sec: 71, end_sec: 120, speaker: "מרצה", text: "PATCH מעדכן רק את השדות שנשלחו." },
  ],
};

export const MATERIAL: Material = {
  id: 3,
  course_id: 1,
  kind: "syllabus",
  filename: "syllabus.pdf",
  page_count: 6,
  char_count: 10492,
  created_at: "2026-11-01T10:00:00Z",
};

export const MCQ: PracticeQuestion = {
  id: 21,
  course_id: 1,
  lecture_id: 5,
  type: "mcq",
  prompt: "איזה קוד מחזירה מחיקה מוצלחת?",
  options: ["200", "201", "204", "404"],
  answer: null,
  attempt_count: 0,
};

export const FLASHCARD: PracticeQuestion = {
  id: 22,
  course_id: 1,
  lecture_id: 5,
  type: "flashcard",
  prompt: "מהי תבנית PARD?",
  options: [],
  answer: "Problem, Actions, Result, Desired",
  attempt_count: 0,
};
