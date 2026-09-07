"""Pydantic models for the Flow Gateway Protocol v1.

Mirror of `src/adapter/contract.js` in the flow repo. Keep the two in step:
a field added here must be optional (the UI ignores unknown keys; a gateway
must tolerate their absence) until the protocol major is bumped.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

PROTOCOL_VERSION = 1

FieldType = Literal["choice", "boolean", "number", "text"]
FieldRole = Literal["model", "aspect", "size", "duration", "count", "seed"]
ModeKey = Literal["image", "video"]
JobStatus = Literal["queued", "running", "done", "failed"]
Scalar = str | int | float | bool
# Agent mode (v1.1, additive) — see PROTOCOL.md §Agent.
RunState = Literal["planning", "review", "queued", "rendering", "done", "failed", "paused"]
ConfirmMode = Literal["always", "never"]


class _Model(BaseModel):
    # Additive fields from a newer peer must never break an older one.
    model_config = ConfigDict(extra="allow")


class FieldOption(_Model):
    value: Scalar
    label: str | None = None

    @model_validator(mode="after")
    def _label(self) -> FieldOption:
        if self.label is None:
            self.label = str(self.value)
        return self


class FieldSpec(_Model):
    key: str = Field(min_length=1)
    label: str | None = None
    type: FieldType
    options: list[FieldOption] | None = None
    min: float | None = None
    max: float | None = None
    step: float | None = None
    default: Any
    role: FieldRole | None = None

    @model_validator(mode="before")
    @classmethod
    def _scalar_options(cls, data: Any) -> Any:
        if isinstance(data, dict) and isinstance(data.get("options"), list):
            data = dict(data)
            data["options"] = [o if isinstance(o, dict) else {"value": o} for o in data["options"]]
        return data

    @model_validator(mode="after")
    def _choice_rules(self) -> FieldSpec:
        if self.type == "choice":
            if not self.options:
                raise ValueError(f"field {self.key!r}: choice needs options")
            if not any(o.value == self.default for o in self.options):
                raise ValueError(f"field {self.key!r}: default {self.default!r} is not one of the options")
        return self


class ModeSpec(_Model):
    key: ModeKey
    label: str | None = None
    icon: str | None = None
    fields: list[FieldSpec] = []

    @model_validator(mode="after")
    def _unique(self) -> ModeSpec:
        if self.label is None:
            self.label = self.key.capitalize()
        seen: set[str] = set()
        for f in self.fields:
            if f.key in seen:
                raise ValueError(f"mode {self.key!r}: duplicate field key {f.key!r}")
            seen.add(f.key)
        return self

    def field(self, key: str) -> FieldSpec | None:
        return next((f for f in self.fields if f.key == key), None)

    def by_role(self, role: FieldRole) -> FieldSpec | None:
        return next((f for f in self.fields if f.role == role), None)

    def defaults(self) -> dict[str, Any]:
        return {f.key: f.default for f in self.fields}


class Strings(_Model):
    footer: str | None = None
    placeholder: str | None = None
    empty: str | None = None


class Surfaces(_Model):
    agent: bool = False
    characters: bool = False
    scenes: bool = False
    tools: bool = False
    trash: bool = False


class AgentCount(_Model):
    min: int = 1
    max: int = 12
    default: int = 3

    @model_validator(mode="after")
    def _range(self) -> AgentCount:
        if self.min < 1:
            raise ValueError("agent.count.min must be at least 1")
        if not self.min <= self.default <= self.max:
            raise ValueError(f"agent.count.default {self.default} is outside [{self.min}, {self.max}]")
        return self


class AgentCapabilities(_Model):
    """Declared by a backend that can plan and render scenes (v1.1). Absent or
    `false` → the UI never renders the Agent pill."""

    instructions: bool = True
    count: AgentCount = AgentCount()
    confirm: ConfirmMode = "always"
    fields: list[str] = []


class Capabilities(_Model):
    protocol: int = PROTOCOL_VERSION
    name: str = Field(min_length=1)
    modes: list[ModeSpec] = Field(min_length=1)
    default_mode: str | None = None
    reference: Literal["none", "optional", "required"] = "none"
    reference_kinds: list[ModeKey] | None = None
    progress: Literal["percent", "none"] = "none"
    credits: bool = False
    strings: Strings = Strings()
    surfaces: Surfaces = Surfaces()
    agent: AgentCapabilities | None = None

    @model_validator(mode="before")
    @classmethod
    def _agent_false(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("agent") is False:
            data = {**data, "agent": None}
        return data

    @model_validator(mode="after")
    def _rules(self) -> Capabilities:
        if self.protocol != PROTOCOL_VERSION:
            raise ValueError(f"protocol {self.protocol} is not {PROTOCOL_VERSION}")
        keys = [m.key for m in self.modes]
        if len(set(keys)) != len(keys):
            raise ValueError("duplicate mode keys")
        if self.default_mode is None:
            self.default_mode = keys[0]
        elif self.default_mode not in keys:
            raise ValueError(f"default_mode {self.default_mode!r} is not a mode")
        if self.reference_kinds is None:
            self.reference_kinds = [] if self.reference == "none" else ["image"]
        if self.reference != "none" and not self.reference_kinds:
            raise ValueError("reference_kinds must not be empty when a reference is accepted")
        if self.agent is not None:
            # A run always renders the backend's video mode (EPIC-003): its fields are the vocabulary.
            mode = self.mode("video")
            if mode is None:
                raise ValueError("agent mode requires a 'video' mode")
            unknown = [f for f in self.agent.fields if f not in {f.key for f in mode.fields}]
            if unknown:
                raise ValueError(f"agent.fields {unknown} are not fields of the video mode")
        return self

    def mode(self, key: str) -> ModeSpec | None:
        return next((m for m in self.modes if m.key == key), None)


class GenerateRequest(_Model):
    mode: str
    prompt: str = Field(min_length=1)
    values: dict[str, Any] = {}
    reference_id: str | None = None


class Job(_Model):
    id: str
    status: JobStatus
    progress: float | None = None
    media_id: str | None = None
    width: int | None = None
    height: int | None = None
    duration_s: float | None = None
    error: str | None = None


class MediaAsset(_Model):
    id: str
    name: str
    kind: ModeKey
    source: Literal["upload", "output"]
    created_at: str | None = None


# --- Agent mode (v1.1, additive) ------------------------------------------------------


class Instruction(_Model):
    id: str
    name: str
    description: str = ""
    count_locked: bool = False


class Plan(_Model):
    instruction: str
    count: int
    scripts: list[str]
    titles: list[str] = []
    summary: str | None = None
    attempts: int = 1
    model: str = ""


class Clip(_Model):
    n: int
    script: str | None = None
    job_id: str | None = None
    media_id: str | None = None
    status: str = "pending"
    progress: float | None = None
    error: str | None = None


class Run(_Model):
    id: str
    project_id: str | None = None
    title: str = "Untitled run"
    state: RunState
    step: str = ""
    clip_index: int = 0
    clip_count: int
    instruction: str
    count: int
    values: dict[str, Any] = {}
    reference_id: str
    scripts: list[str] = []
    titles: list[str] = []
    summary: str | None = None
    clips: list[Clip] = []
    autostart: bool = False
    error: str | None = None
    created_at: float
    updated_at: float | None = None


class PlanRequest(_Model):
    reference_id: str
    instruction: str
    count: int = Field(1, ge=1)


class RunRequest(PlanRequest):
    project_id: str | None = None
    values: dict[str, Any] = {}
    autostart: bool = False


class ScriptEdit(_Model):
    text: str = Field(min_length=1)
