"""FastAPI plumbing for the protocol. Requires the `server` extra."""

from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .gateway import FlowGateway, UpstreamError, normalise_request
from .models import Capabilities, GenerateRequest, Job, MediaAsset


def build_router(gateway: FlowGateway, prefix: str = "/flow") -> APIRouter:
    router = APIRouter(prefix=prefix, tags=["flow"])

    @router.get("/capabilities", response_model=Capabilities)
    def capabilities() -> Capabilities:
        return gateway.capabilities()

    @router.post("/generate", response_model=Job, status_code=202)
    def generate(req: GenerateRequest) -> Job:
        try:
            req = normalise_request(gateway.capabilities(), req)
        except ValueError as e:
            raise HTTPException(422, str(e)) from e
        if req.reference_id and gateway.media_path(req.reference_id) is None:
            raise HTTPException(404, f"unknown reference {req.reference_id!r}")
        try:
            return gateway.generate(req)
        except UpstreamError as e:
            raise HTTPException(e.status, str(e)) from e

    @router.get("/jobs/{job_id}", response_model=Job)
    def job(job_id: str) -> Job:
        try:
            j = gateway.job(job_id)
        except UpstreamError as e:
            raise HTTPException(e.status, str(e)) from e
        if j is None:
            raise HTTPException(404, f"Unknown job {job_id!r}")
        return j

    @router.get("/media", response_model=list[MediaAsset])
    def media() -> list[MediaAsset]:
        return gateway.list_media()

    @router.post("/uploads", response_model=MediaAsset, status_code=201)
    async def uploads(file: UploadFile = File(...)) -> MediaAsset:
        data = await file.read()
        if not data:
            raise HTTPException(422, "empty file")
        return gateway.upload(file.filename or "upload", data, file.content_type)

    @router.get("/media/{media_id}")
    def media_file(media_id: str, type: Literal["FULL", "THUMBNAIL"] = "FULL") -> FileResponse:
        path = gateway.media_path(media_id) if type == "FULL" else gateway.thumbnail_path(media_id)
        if path is None:
            raise HTTPException(404, f"no {type.lower()} for media {media_id!r}")
        return FileResponse(path, media_type=mimetypes.guess_type(path.name)[0] or "application/octet-stream")

    return router


def mount_ui(app: FastAPI, dist_dir: Path | str, path: str = "/ui") -> None:
    """Serve the flow release bundle (hash router, relative assets) at `path`."""
    from fastapi.staticfiles import StaticFiles

    app.mount(path, StaticFiles(directory=str(dist_dir), html=True), name="flow-ui")


def add_dev_cors(app: FastAPI, origins: tuple[str, ...] = ("http://localhost:5173", "http://localhost:4173")) -> None:
    """Only needed when the UI is served from somewhere other than this app (Vite dev server)."""
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(CORSMiddleware, allow_origins=list(origins), allow_methods=["*"], allow_headers=["*"])


def create_app(gateway: FlowGateway, ui_dir: Path | str | None = None, cors: bool = False, prefix: str = "/flow") -> FastAPI:
    app = FastAPI(title=f"{gateway.capabilities().name} — Flow gateway")
    app.include_router(build_router(gateway, prefix=prefix))
    if cors:
        add_dev_cors(app)
    if ui_dir:
        mount_ui(app, ui_dir)
    return app
