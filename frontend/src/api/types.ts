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
