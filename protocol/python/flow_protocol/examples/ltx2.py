"""Reference gateway for spark-ltx2 (LTX-2.3 I2V behind app/api_server.py on :8090).

Wire it into app/api_server.py:

    from flow_protocol.router import build_router, mount_ui
    from flow_protocol.examples.ltx2 import Ltx2Gateway     # or copy this file

    flow = Ltx2Gateway(base_url="http://localhost:8090", input_dir=INPUT_DIR, output_dir=OUTPUT_DIR)
    app.include_router(build_router(flow))
    mount_ui(app, "/app/flow-ui")

Mapping (see spark-ltx2/app/api_server.py `Gen`):
  UI value          ltx2 JSON field
  size (WxH)        width / height
  num_frames        num_frames
  frame_rate        frame_rate
  seed              seed
  negative_prompt   negative_prompt
  reference         image (a filename in the shared input dir — uploads land there)
  job.status        running → running · completed → done · failed → failed
  job.progress      none — the API reports state only, so `progress: "none"`
  output            `output` filename in the shared ComfyUI output dir
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from ..gateway import FlowGateway, UpstreamError
from ..media import MediaStore
from ..models import Capabilities, GenerateRequest, Job, MediaAsset

STATUS = {"running": "running", "queued": "queued", "completed": "done", "failed": "failed"}


class Ltx2Gateway(FlowGateway):
    def __init__(self, base_url: str, input_dir: Path, output_dir: Path, name: str = "LTX-2.3") -> None:
        self.store = MediaStore({"in": Path(input_dir), "out": Path(output_dir)}, upload_root="in")
        self.client = httpx.Client(base_url=base_url, timeout=60.0)
        self.name = name
        self._req_by_job: dict[str, dict[str, Any]] = {}

    def capabilities(self) -> Capabilities:
        return Capabilities.model_validate(
            {
                "name": self.name,
                "modes": [
                    {
                        "key": "video",
                        "fields": [
                            {"key": "size", "label": "Size", "type": "choice", "role": "size", "options": ["704x1280", "1280x704"], "default": "704x1280"},
                            {"key": "num_frames", "label": "Frames", "type": "choice", "options": [97, 121, 161], "default": 121},
                            {"key": "frame_rate", "label": "Frame rate", "type": "choice", "options": [24, 30], "default": 30},
                            {"key": "seed", "label": "Seed", "type": "number", "role": "seed", "min": 0, "default": 42},
                            {
                                "key": "negative_prompt",
                                "label": "Negative prompt",
                                "type": "text",
                                "default": "worst quality, blurry, distorted, jittery, low resolution",
                            },
                            {"key": "count", "label": "Outputs", "type": "choice", "role": "count", "options": [1], "default": 1},
                        ],
                    }
                ],
                "reference": "required",  # single-image I2V only (README §1)
                "reference_kinds": ["image"],
                "progress": "none",  # STORY_001: status only, no percentage
                "strings": {"footer": f"{self.name} can make mistakes, so double check it"},
            }
        )

    def generate(self, req: GenerateRequest) -> Job:
        image = self.store.path(req.reference_id or "")
        if image is None:
            raise UpstreamError(f"reference {req.reference_id!r} not found", 404)
        v = req.values
        w, h = (int(x) for x in v["size"].split("x"))
        body = {
            "prompt": req.prompt,
            "image": image.name,
            "negative_prompt": v["negative_prompt"],
            "width": w,
            "height": h,
            "num_frames": int(v["num_frames"]),
            "frame_rate": int(v["frame_rate"]),
            "seed": int(v["seed"]),
        }
        try:
            resp = self.client.post("/generate", json=body)
        except httpx.HTTPError as e:
            raise UpstreamError(f"ltx2 api unreachable: {e}") from e
        if resp.status_code >= 400:
            raise UpstreamError(f"ltx2 api: {resp.text[:400]}", 502 if resp.status_code >= 500 else 422)
        j = resp.json()
        self._req_by_job[j["job_id"]] = body
        return Job(id=j["job_id"], status=STATUS.get(j.get("status", "running"), "running"))  # type: ignore[arg-type]

    def job(self, job_id: str) -> Job | None:
        try:
            resp = self.client.get(f"/jobs/{job_id}")
        except httpx.HTTPError as e:
            raise UpstreamError(f"ltx2 api unreachable: {e}") from e
        if resp.status_code == 404:
            return None
        if resp.status_code >= 400:
            raise UpstreamError(f"ltx2 api: {resp.text[:400]}")
        j = resp.json()
        status = STATUS.get(str(j.get("status")), "failed")
        body = self._req_by_job.get(job_id, {})
        return Job(
            id=job_id,
            status=status,  # type: ignore[arg-type]
            progress=None,
            media_id=f"out:{j['output']}" if status == "done" and j.get("output") else None,
            width=body.get("width"),
            height=body.get("height"),
            duration_s=(body["num_frames"] / body["frame_rate"]) if body else None,
            error=j.get("error"),
        )

    def list_media(self) -> list[MediaAsset]:
        return self.store.list()

    def media_path(self, media_id: str) -> Path | None:
        return self.store.path(media_id)

    def upload(self, filename: str, data: bytes, content_type: str | None) -> MediaAsset:
        return self.store.save_upload(filename, data)
