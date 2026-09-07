"""FastAPI plumbing for the protocol. Requires the `server` extra."""

from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .gateway import FlowAgent, FlowGateway, UpstreamError, normalise_request
from .models import Capabilities, GenerateRequest, Instruction, Job, MediaAsset, Plan, PlanRequest, Run, RunRequest, ScriptEdit


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

    # Agent routes exist iff the gateway both implements FlowAgent AND declares
    # capabilities.agent — the UI and conformance rely on the two agreeing.
    if isinstance(gateway, FlowAgent) and gateway.capabilities().agent is not None:
        _agent_routes(router, gateway)
    return router


def _agent_routes(router: APIRouter, agent: FlowAgent) -> None:
    """Agent mode (v1.1). Mounted only for gateways that implement FlowAgent."""

    def guard(fn, *args):
        try:
            return fn(*args)
        except UpstreamError as e:
            raise HTTPException(e.status, str(e)) from e

    def found(run: Run | None, run_id: str) -> Run:
        if run is None:
            raise HTTPException(404, f"Unknown run {run_id!r}")
        return run

    @router.get("/agent/instructions", response_model=list[Instruction])
    def instructions() -> list[Instruction]:
        return agent.instructions()

    @router.post("/agent/plan", response_model=Plan)
    async def plan(req: PlanRequest) -> Plan:
        try:
            return await agent.plan(req)
        except UpstreamError as e:
            raise HTTPException(e.status, str(e)) from e

    @router.post("/agent/runs", response_model=Run, status_code=202)
    def create_run(req: RunRequest) -> Run:
        return guard(agent.create_run, req)

    @router.get("/agent/runs", response_model=list[Run])
    def list_runs(project_id: str | None = None) -> list[Run]:
        return agent.list_runs(project_id)

    @router.get("/agent/runs/{run_id}", response_model=Run)
    def get_run(run_id: str) -> Run:
        return found(agent.run(run_id), run_id)

    @router.patch("/agent/runs/{run_id}/scripts/{n}", response_model=Run)
    def edit_script(run_id: str, n: int, edit: ScriptEdit) -> Run:
        found(agent.run(run_id), run_id)
        return guard(agent.edit_script, run_id, n, edit.text)

    @router.post("/agent/runs/{run_id}/scripts/{n}/rewrite", response_model=Run)
    async def rewrite_script(run_id: str, n: int) -> Run:
        found(agent.run(run_id), run_id)
        try:
            return await agent.rewrite_script(run_id, n)
        except UpstreamError as e:
            raise HTTPException(e.status, str(e)) from e

    @router.post("/agent/runs/{run_id}/approve", response_model=Run)
    def approve(run_id: str) -> Run:
        found(agent.run(run_id), run_id)
        return guard(agent.approve, run_id)

    @router.post("/agent/runs/{run_id}/resume", response_model=Run)
    def resume(run_id: str) -> Run:
        found(agent.run(run_id), run_id)
        return guard(agent.resume, run_id)


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
