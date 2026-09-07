"""What a model repo implements: subclass `FlowGateway`, hand it to
`flow_protocol.router.build_router`, done."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from .media import kind_of
from .models import Capabilities, FieldSpec, GenerateRequest, Instruction, Job, MediaAsset, Plan, PlanRequest, Run, RunRequest
from .thumbs import poster


class UpstreamError(Exception):
    """The model server behind the gateway rejected or failed a call."""

    def __init__(self, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.status = status


class FlowGateway(ABC):
    @abstractmethod
    def capabilities(self) -> Capabilities: ...

    @abstractmethod
    def generate(self, req: GenerateRequest) -> Job:
        """Submit ONE output. The UI calls this once per requested output."""

    @abstractmethod
    def job(self, job_id: str) -> Job | None: ...

    @abstractmethod
    def list_media(self) -> list[MediaAsset]: ...

    @abstractmethod
    def media_path(self, media_id: str) -> Path | None: ...

    @abstractmethod
    def upload(self, filename: str, data: bytes, content_type: str | None) -> MediaAsset: ...

    def thumbnail_path(self, media_id: str) -> Path | None:
        """Images are their own thumbnail; videos get a poster frame via ffmpeg."""
        p = self.media_path(media_id)
        if p is None:
            return None
        return p if kind_of(p) == "image" else poster(p)


class FlowAgent(ABC):
    """Agent mode (v1.1). A gateway that also implements this gets the
    `/flow/agent/*` routes from `build_router`, and must declare
    `capabilities.agent`. Raise `UpstreamError(msg, status)` for 404/409/422/502."""

    @abstractmethod
    def instructions(self) -> list[Instruction]: ...

    @abstractmethod
    async def plan(self, req: PlanRequest) -> Plan:
        """Pure: write the scripts, render nothing."""

    @abstractmethod
    def create_run(self, req: RunRequest) -> Run: ...

    @abstractmethod
    def list_runs(self, project_id: str | None = None) -> list[Run]: ...

    @abstractmethod
    def run(self, run_id: str) -> Run | None: ...

    @abstractmethod
    def edit_script(self, run_id: str, n: int, text: str) -> Run: ...

    @abstractmethod
    async def rewrite_script(self, run_id: str, n: int) -> Run: ...

    @abstractmethod
    def approve(self, run_id: str) -> Run: ...

    @abstractmethod
    def resume(self, run_id: str) -> Run: ...


def _coerce(field: FieldSpec, value: Any) -> Any:
    if field.type == "choice":
        assert field.options
        for o in field.options:
            if o.value == value or str(o.value) == str(value):
                return o.value
        raise ValueError(f"{field.key}: {value!r} is not one of {[o.value for o in field.options]}")
    if field.type == "boolean":
        if isinstance(value, str):
            return value.lower() in ("1", "true", "yes", "on")
        return bool(value)
    if field.type == "number":
        try:
            n = float(value)
        except (TypeError, ValueError) as e:
            raise ValueError(f"{field.key}: not a number") from e
        if field.min is not None and n < field.min:
            raise ValueError(f"{field.key}: below minimum {field.min}")
        if field.max is not None and n > field.max:
            raise ValueError(f"{field.key}: above maximum {field.max}")
        return int(n) if n.is_integer() else n
    return "" if value is None else str(value)


def normalise_request(caps: Capabilities, req: GenerateRequest) -> GenerateRequest:
    """Fill defaults, coerce types, reject unknown keys, enforce reference rules.
    Raises ValueError with a client-readable message."""
    mode = caps.mode(req.mode)
    if mode is None:
        raise ValueError(f"unknown mode {req.mode!r}; this backend offers {[m.key for m in caps.modes]}")
    known = {f.key for f in mode.fields}
    unknown = set(req.values) - known
    if unknown:
        raise ValueError(f"unknown fields for mode {mode.key!r}: {sorted(unknown)}")
    values = {}
    for f in mode.fields:
        values[f.key] = _coerce(f, req.values.get(f.key, f.default))
    if caps.reference == "none" and req.reference_id:
        raise ValueError(f"{caps.name} does not accept a reference asset")
    if caps.reference == "required" and not req.reference_id:
        raise ValueError(f"{caps.name} needs a reference asset (reference_id)")
    return GenerateRequest(mode=mode.key, prompt=req.prompt, values=values, reference_id=req.reference_id)
