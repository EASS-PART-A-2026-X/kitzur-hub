/**
 * Friendly names for the generated schema types. Components import from here,
 * never from schema.d.ts directly.
 */
import type { components } from "./schema";

type Schemas = components["schemas"];

export type Course = Schemas["CoursePublic"];
export type CourseCreate = Schemas["CourseCreate"];
export type CourseUpdate = Schemas["CourseUpdate"];

export type Task = Schemas["TaskPublic"];
export type TaskCreate = Schemas["TaskCreate"];
export type TaskUpdate = Schemas["TaskUpdate"];
export type TaskKind = Schemas["TaskKind"];
export type TaskStatus = Schemas["TaskStatus"];

export type Lecture = Schemas["LecturePublic"];
export type LectureDetail = Schemas["LectureDetail"];
export type LectureUpdate = Schemas["LectureUpdate"];
export type Segment = Schemas["Segment"];

export type Material = Schemas["MaterialPublic"];
export type MaterialDetail = Schemas["MaterialDetail"];
export type MaterialKind = Schemas["MaterialKind"];
export type MaterialUpdate = Schemas["MaterialUpdate"];

export type PracticeQuestion = Schemas["QuestionPublic"];
export type QuestionType = Schemas["QuestionType"];
export type AttemptCreate = Schemas["AttemptCreate"];
export type AttemptResult = Schemas["AttemptResult"];
export type PracticeSummary = Schemas["PracticeSummary"];
