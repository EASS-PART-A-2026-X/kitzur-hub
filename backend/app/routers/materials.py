"""Course materials: upload (with text extraction), list, read, rename, delete."""

import hashlib
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Form, HTTPException, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlmodel import col, select

from app.deps import Limit, Offset, SessionDep, get_or_404
from app.materials import MaterialError, UnsupportedMaterialError, extract_material
from app.models import (
    Course,
    Material,
    MaterialDetail,
    MaterialKind,
    MaterialPublic,
    MaterialUpdate,
)
from app.routers.lectures import MAX_UPLOAD_BYTES

router = APIRouter(tags=["materials"])


def to_public(material: Material) -> MaterialPublic:
    """Build the list view of a material.

    Args:
        material: Table row.

    Returns:
        Metadata plus the length of the extracted text.
    """
    return MaterialPublic.model_validate(material, update={"char_count": len(material.text)})


@router.post(
    "/courses/{course_id}/materials",
    response_model=MaterialPublic,
    status_code=201,
    responses={409: {}, 413: {}, 415: {}, 422: {}},
)
async def upload_material(
    course_id: int,
    file: UploadFile,
    kind: Annotated[MaterialKind, Form()],
    session: SessionDep,
) -> MaterialPublic:
    """Upload a syllabus or past exam and store its extracted text.

    Developer note: PDF parsing is CPU-bound and synchronous, so it runs in the
    thread pool; calling it directly would block every other request while a
    large PDF is parsed.

    Raises:
        HTTPException: 404 unknown course, 409 same text already in this course,
            413 file too large, 415 unsupported format, 422 no usable text.
    """
    get_or_404(session, Course, course_id)
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"file is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB")
    filename = (file.filename or "material")[:200]
    try:
        extracted = await run_in_threadpool(extract_material, filename, data)
    except UnsupportedMaterialError as exc:
        raise HTTPException(415, str(exc)) from None
    except MaterialError as exc:
        raise HTTPException(422, str(exc)) from None

    sha256 = hashlib.sha256(extracted.text.encode("utf-8")).hexdigest()
    duplicate = session.exec(
        select(Material.id).where(Material.course_id == course_id, Material.sha256 == sha256)
    ).first()
    if duplicate is not None:
        raise HTTPException(
            409, {"message": "this document is already uploaded", "material_id": duplicate}
        )

    material = Material(
        course_id=course_id,
        kind=kind,
        filename=filename,
        text=extracted.text,
        page_count=extracted.page_count,
        sha256=sha256,
        created_at=datetime.now(UTC),
    )
    session.add(material)
    session.commit()
    session.refresh(material)
    return to_public(material)


@router.get("/courses/{course_id}/materials", response_model=list[MaterialPublic])
def list_materials(
    course_id: int,
    session: SessionDep,
    kind: MaterialKind | None = None,
    limit: Limit = 50,
    offset: Offset = 0,
) -> list[MaterialPublic]:
    """List a course's materials, newest first, optionally filtered by kind."""
    get_or_404(session, Course, course_id)
    query = select(Material).where(Material.course_id == course_id)
    if kind is not None:
        query = query.where(Material.kind == kind)
    query = query.order_by(col(Material.created_at).desc(), col(Material.id).desc())
    return [to_public(m) for m in session.exec(query.offset(offset).limit(limit))]


@router.get("/materials/{material_id}", response_model=MaterialDetail)
def read_material(material_id: int, session: SessionDep) -> MaterialDetail:
    """Return one material with its extracted text."""
    material = get_or_404(session, Material, material_id)
    return MaterialDetail.model_validate(material, update={"char_count": len(material.text)})


@router.patch("/materials/{material_id}", response_model=MaterialPublic)
def update_material(material_id: int, body: MaterialUpdate, session: SessionDep) -> MaterialPublic:
    """Change the kind or display name. The extracted text cannot be edited."""
    material = get_or_404(session, Material, material_id)
    material.sqlmodel_update(body.model_dump(exclude_unset=True))
    session.commit()
    session.refresh(material)
    return to_public(material)


@router.delete("/materials/{material_id}", status_code=204)
def delete_material(material_id: int, session: SessionDep) -> Response:
    """Delete a material."""
    session.delete(get_or_404(session, Material, material_id))
    session.commit()
    return Response(status_code=204)
