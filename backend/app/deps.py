"""Shared path and query dependencies."""

from typing import Annotated

from fastapi import Depends, HTTPException, Query
from sqlmodel import Session

from app.db import get_session

SessionDep = Annotated[Session, Depends(get_session)]
Limit = Annotated[int, Query(ge=1, le=100)]
Offset = Annotated[int, Query(ge=0)]


def get_or_404[T](session: Session, model: type[T], item_id: int) -> T:
    """Load a row by primary key or raise 404.

    Args:
        session: Open session.
        model: Table class.
        item_id: Primary key.

    Returns:
        The row.

    Raises:
        HTTPException: 404 naming the resource when it does not exist.
    """
    item = session.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} {item_id} not found")
    return item
