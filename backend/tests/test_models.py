"""Schema validation tests: limits, extra fields and PATCH null handling."""

import pytest
from pydantic import ValidationError

from app.models import CourseCreate, CourseUpdate, Segment, TaskCreate, TaskUpdate

VALID_COURSE = {"name": "אוטומטים ושפות פורמליות", "code": "62208", "semester": "2027A"}


def test_course_create_accepts_valid_body_and_strips_whitespace() -> None:
    """Valid input passes and surrounding whitespace is removed."""
    course = CourseCreate(**{**VALID_COURSE, "name": "  EASS  "})
    assert course.name == "EASS"


@pytest.mark.parametrize(
    "override",
    [
        {"name": ""},
        {"name": "x" * 81},
        {"code": "x" * 21},
        {"unknown": "field"},
        {"exam_date": "not-a-date"},
    ],
)
def test_course_create_rejects_invalid_body(override: dict) -> None:
    """Empty, too long, unknown or mistyped fields are rejected."""
    with pytest.raises(ValidationError):
        CourseCreate(**{**VALID_COURSE, **override})


def test_update_allows_null_only_for_nullable_fields() -> None:
    """Explicit null clears a nullable field but is rejected for a required one."""
    assert CourseUpdate(exam_date=None).model_fields_set == {"exam_date"}
    with pytest.raises(ValidationError, match="name cannot be null"):
        CourseUpdate(name=None)


def test_update_rejects_typo_instead_of_ignoring_it() -> None:
    """A misspelled field is a 422, not a silent no-op."""
    with pytest.raises(ValidationError):
        TaskUpdate(titel="typo")


def test_task_weight_is_bounded() -> None:
    """weight_pct must stay within 0..100."""
    with pytest.raises(ValidationError):
        TaskCreate(title="EX1", weight_pct=101)


def test_segment_rejects_negative_time_and_unknown_speaker() -> None:
    """Segments only accept non-negative times and the anonymized speaker roles."""
    with pytest.raises(ValidationError):
        Segment(start_sec=-1, end_sec=0, speaker="מרצה", text="שלום")
    with pytest.raises(ValidationError):
        Segment(start_sec=0, end_sec=1, speaker="Dana", text="שלום")
