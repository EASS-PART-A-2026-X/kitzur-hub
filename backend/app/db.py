"""Database engine and per-request session."""

import os
from collections.abc import Iterator
from pathlib import Path

from fastapi import Request
from sqlalchemy import Engine, event
from sqlmodel import Session, create_engine

DEFAULT_DATABASE_URL = "sqlite:///./data/app.db"


def database_url() -> str:
    """Read the database URL from the environment.

    Returns:
        ``DATABASE_URL`` if set, otherwise a SQLite file under ./data.
    """
    return os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)


def make_engine(url: str) -> Engine:
    """Create an engine, preparing SQLite-specific settings.

    Developer note: SQLite ignores foreign keys unless every connection runs
    ``PRAGMA foreign_keys=ON``. Without it, a task could point at a deleted course.
    ``check_same_thread=False`` is needed because FastAPI serves sync endpoints
    from a thread pool; each request still gets its own session.

    Args:
        url: SQLAlchemy database URL.

    Returns:
        A configured engine.
    """
    if not url.startswith("sqlite"):
        return create_engine(url)

    path = url.removeprefix("sqlite:///")
    if path and path != url and not path.startswith(":memory:"):
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection, _record) -> None:
        """Turn on foreign key enforcement for every new SQLite connection."""
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    return engine


def get_session(request: Request) -> Iterator[Session]:
    """FastAPI dependency: one session per request, closed afterwards.

    The engine lives on ``app.state`` so each app instance (and each test) owns
    its own database.

    Args:
        request: The current request.

    Yields:
        An open session bound to the app's engine.
    """
    with Session(request.app.state.engine) as session:
        yield session
