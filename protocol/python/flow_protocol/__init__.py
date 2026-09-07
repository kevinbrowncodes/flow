"""Flow Gateway Protocol — the contract between the Flow UI and a model backend.

Import the models here; the FastAPI router lives in `flow_protocol.router`
(needs the `server` extra) and the conformance CLI in `flow_protocol.conformance`.
"""

from .gateway import FlowAgent, FlowGateway, UpstreamError, normalise_request
from .media import MediaStore, kind_of
from .models import (
    PROTOCOL_VERSION,
    AgentCapabilities,
    Capabilities,
    Clip,
    Instruction,
    Plan,
    PlanRequest,
    Run,
    RunRequest,
    RunState,
    ScriptEdit,
    FieldOption,
    FieldSpec,
    GenerateRequest,
    Job,
    JobStatus,
    MediaAsset,
    ModeSpec,
    Strings,
    Surfaces,
)

__version__ = "0.2.0"

__all__ = [
    "PROTOCOL_VERSION",
    "AgentCapabilities",
    "Capabilities",
    "Clip",
    "FlowAgent",
    "Instruction",
    "Plan",
    "PlanRequest",
    "Run",
    "RunRequest",
    "RunState",
    "ScriptEdit",
    "FieldOption",
    "FieldSpec",
    "FlowGateway",
    "GenerateRequest",
    "Job",
    "JobStatus",
    "MediaAsset",
    "MediaStore",
    "ModeSpec",
    "Strings",
    "Surfaces",
    "UpstreamError",
    "kind_of",
    "normalise_request",
]
