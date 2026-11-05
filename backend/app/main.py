"""FastAPI application factory and entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import SQLModel

from app.db import database_url, make_engine
from app.routers import courses, lectures, materials, questions, tasks
from app.seed import seed


def create_app(url: str | None = None, *, seed_demo: bool = True) -> FastAPI:
    """Build an app bound to its own database.

    Developer note: a factory (instead of one global engine) lets every test get
    a fresh database and lets the restart test open the same file twice, the way
    a container restart would.

    Args:
        url: Database URL. Defaults to ``DATABASE_URL`` from the environment.
        seed_demo: Insert demo data into an empty database on startup.

    Returns:
        A configured FastAPI app.
    """

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        """Create tables and seed on startup, release connections on shutdown."""
        engine = make_engine(url or database_url())
        SQLModel.metadata.create_all(engine)
        if seed_demo:
            seed(engine)
        app.state.engine = engine
        yield
        engine.dispose()

    app = FastAPI(title="Kitzur Hub API", version="0.1.0", lifespan=lifespan)

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        """Report that the process is up and serving requests.

        Returns:
            A fixed status payload used by Docker and Compose health checks.
        """
        return {"status": "ok"}

    app.include_router(courses.router)
    app.include_router(lectures.router)
    app.include_router(tasks.router)
    app.include_router(materials.router)
    app.include_router(questions.router)
    return app


app = create_app()
