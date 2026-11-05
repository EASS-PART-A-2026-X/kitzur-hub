"""Database tables and API schemas.

Each resource follows the same pattern:
    <Name>Base    shared fields and their limits
    <Name>        the table (table=True)
    <Name>Create  request body for POST (extra fields rejected)
    <Name>Update  request body for PATCH (every field optional)
    <Name>Public  response body (always includes id)
"""

from datetime import date, datetime
from enum import StrEnum
from typing import Any, ClassVar, Self

from pydantic import ConfigDict, NaiveDatetime, model_validator
from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

STRICT = ConfigDict(extra="forbid", str_strip_whitespace=True)


class TaskKind(StrEnum):
    """What kind of work a task represents."""

    HOMEWORK = "hw"
    EXAM = "exam"
    PROJECT = "project"
    QUIZ = "quiz"
    OTHER = "other"


class TaskStatus(StrEnum):
    """Where a task is in its lifecycle."""

    TODO = "todo"
    DOING = "doing"
    DONE = "done"


class TaskOrigin(StrEnum):
    """Who created a task: the user, or a suggestion accepted from AI output (EX3)."""

    MANUAL = "manual"
    SYLLABUS = "syllabus"
    LECTURE = "lecture"


class SourceFormat(StrEnum):
    """File format a lecture transcript was imported from."""

    KITZUR_MD = "md"
    ZOOM_JSON = "json"
    VTT = "vtt"
    TEXT = "txt"


class MaterialKind(StrEnum):
    """What a course material document is."""

    SYLLABUS = "syllabus"
    PAST_EXAM = "past_exam"


class Speaker(StrEnum):
    """Anonymized speaker roles. Real names are never stored."""

    LECTURER = "מרצה"
    STUDENT = "סטודנט/ית"
    UNKNOWN = "לא ידוע"


class UpdateSchema(SQLModel):
    """Base for PATCH bodies.

    Developer note: PATCH distinguishes three cases per field: absent (leave as is),
    a value (set it) and an explicit null. Explicit null is only legal for columns
    that are nullable in the table; for the rest it must be a 422, not a database
    error. Subclasses list those columns in ``NOT_NULL``.
    """

    model_config = STRICT
    NOT_NULL: ClassVar[frozenset[str]] = frozenset()

    @model_validator(mode="after")
    def reject_null_for_required(self) -> Self:
        """Reject an explicit null for a field the table requires.

        Returns:
            The validated model.

        Raises:
            ValueError: If a NOT_NULL field was sent as null.
        """
        for name in self.model_fields_set & self.NOT_NULL:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


# Course


class CourseBase(SQLModel):
    """Fields shared by every course schema."""

    name: str = Field(min_length=1, max_length=80)
    code: str = Field(min_length=1, max_length=20)
    semester: str = Field(min_length=1, max_length=20)
    exam_date: date | None = None


class Course(CourseBase, table=True):
    """A university course. Deleting it deletes its lectures and tasks."""

    id: int | None = Field(default=None, primary_key=True)
    lectures: list["Lecture"] = Relationship(cascade_delete=True)
    tasks: list["Task"] = Relationship(cascade_delete=True)
    materials: list["Material"] = Relationship(cascade_delete=True)


class CourseCreate(CourseBase):
    """POST /courses body."""

    model_config = STRICT


class CourseUpdate(UpdateSchema):
    """PATCH /courses/{id} body."""

    NOT_NULL: ClassVar[frozenset[str]] = frozenset({"name", "code", "semester"})

    name: str | None = Field(default=None, min_length=1, max_length=80)
    code: str | None = Field(default=None, min_length=1, max_length=20)
    semester: str | None = Field(default=None, min_length=1, max_length=20)
    exam_date: date | None = None


class CoursePublic(CourseBase):
    """Course as returned by the API."""

    id: int


# Lecture


class Segment(SQLModel):
    """One transcript block after import: anonymized speaker plus text.

    Times are seconds from the start of the recording, which keeps them sortable
    and lets the frontend build a clickable topic map later.
    """

    model_config = STRICT

    start_sec: float = Field(ge=0)
    end_sec: float = Field(ge=0)
    speaker: Speaker
    text: str = Field(min_length=1, max_length=5000)


class LectureBase(SQLModel):
    """Fields the user can see and edit on a lecture."""

    title: str = Field(min_length=1, max_length=200)
    held_on: date | None = None


class Lecture(LectureBase, table=True):
    """An imported lecture transcript.

    ``created_at`` is a timezone-aware UTC timestamp set by the server.
    ``sha256`` is the hash of the normalized transcript text. It is unique per
    course so re-uploading the same recording is detected instead of duplicated.
    """

    __table_args__ = (UniqueConstraint("course_id", "sha256"),)

    id: int | None = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id", index=True, ondelete="CASCADE")
    source_format: SourceFormat
    segments: list[dict[str, Any]] = Field(sa_column=Column(JSON, nullable=False))
    duration_sec: float = Field(ge=0)
    sha256: str = Field(min_length=64, max_length=64)
    created_at: datetime


class LectureUpdate(UpdateSchema):
    """PATCH /lectures/{id} body. The transcript itself is immutable."""

    NOT_NULL: ClassVar[frozenset[str]] = frozenset({"title"})

    title: str | None = Field(default=None, min_length=1, max_length=200)
    held_on: date | None = None


class LecturePublic(LectureBase):
    """Lecture in list responses: metadata only, no transcript."""

    id: int
    course_id: int
    source_format: SourceFormat
    duration_sec: float
    segment_count: int
    created_at: datetime


class LectureDetail(LecturePublic):
    """Lecture in single-item responses: metadata plus the transcript."""

    segments: list[Segment]


# Task


class TaskBase(SQLModel):
    """Fields shared by every task schema.

    ``due_at`` is a wall-clock Israel time without a timezone (``NaiveDatetime``):
    the app is single-user and course deadlines are published as local times
    ("23:59 Israel time"). Input with a UTC offset is rejected rather than guessed.
    """

    title: str = Field(min_length=1, max_length=200)
    kind: TaskKind = TaskKind.OTHER
    due_at: NaiveDatetime | None = None
    weight_pct: int | None = Field(default=None, ge=0, le=100)
    status: TaskStatus = TaskStatus.TODO


class Task(TaskBase, table=True):
    """Something the student has to do for a course."""

    id: int | None = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id", index=True, ondelete="CASCADE")
    origin: TaskOrigin = TaskOrigin.MANUAL


class TaskCreate(TaskBase):
    """POST /courses/{id}/tasks body. Origin is set by the server, not the client."""

    model_config = STRICT


class TaskUpdate(UpdateSchema):
    """PATCH /tasks/{id} body."""

    NOT_NULL: ClassVar[frozenset[str]] = frozenset({"title", "kind", "status"})

    title: str | None = Field(default=None, min_length=1, max_length=200)
    kind: TaskKind | None = None
    due_at: NaiveDatetime | None = None
    weight_pct: int | None = Field(default=None, ge=0, le=100)
    status: TaskStatus | None = None


class TaskPublic(TaskBase):
    """Task as returned by the API."""

    id: int
    course_id: int
    origin: TaskOrigin


# Material


class MaterialBase(SQLModel):
    """Fields the user can see and edit on a material."""

    kind: MaterialKind
    filename: str = Field(min_length=1, max_length=200)


class Material(MaterialBase, table=True):
    """A syllabus or past exam, stored as extracted text (the file itself is not kept).

    ``sha256`` hashes the extracted text and is unique per course, so the same
    document uploaded twice is detected even under another file name.
    """

    __table_args__ = (UniqueConstraint("course_id", "sha256"),)

    id: int | None = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id", index=True, ondelete="CASCADE")
    text: str
    page_count: int | None = Field(default=None, ge=1)
    sha256: str = Field(min_length=64, max_length=64)
    created_at: datetime


class MaterialUpdate(UpdateSchema):
    """PATCH /materials/{id} body: fix the kind or the display name."""

    NOT_NULL: ClassVar[frozenset[str]] = frozenset({"kind", "filename"})

    kind: MaterialKind | None = None
    filename: str | None = Field(default=None, min_length=1, max_length=200)


class MaterialPublic(MaterialBase):
    """Material in list responses: metadata only."""

    id: int
    course_id: int
    page_count: int | None
    char_count: int
    created_at: datetime


class MaterialDetail(MaterialPublic):
    """Material in single-item responses, including the extracted text."""

    text: str
