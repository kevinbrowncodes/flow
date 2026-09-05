"""A gateway that renders solid-colour frames. Used by the protocol tests and
for driving the UI locally without a GPU:

    flow-fake-gateway --ui ../../dist --port 8765
    open http://localhost:8765/ui/
"""

from __future__ import annotations

import argparse
import struct
import zlib
from pathlib import Path
from typing import Any
from uuid import uuid4

from ..gateway import FlowGateway
from ..media import MediaStore
from ..models import Capabilities, GenerateRequest, Job, MediaAsset


def solid_png(w: int, h: int, rgb: tuple[int, int, int]) -> bytes:
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


class FakeGateway(FlowGateway):
    def __init__(self, media_dir: Path, ticks: int = 4, reference: str = "optional") -> None:
        media_dir = Path(media_dir)
        self.store = MediaStore({"up": media_dir / "uploads", "out": media_dir / "outputs"}, upload_root="up")
        self.ticks = ticks
        self.reference = reference
        self.jobs: dict[str, dict[str, Any]] = {}

    def capabilities(self) -> Capabilities:
        size = {"key": "size", "label": "Size", "type": "choice", "role": "size", "options": ["1280x720", "720x1280", "960x960"], "default": "1280x720"}
        count = {"key": "count", "label": "Outputs", "type": "choice", "role": "count", "options": [1, 2, 3, 4], "default": 2}
        return Capabilities.model_validate(
            {
                "name": "Fake Nano",
                "default_mode": "video",
                "modes": [
                    {
                        "key": "video",
                        "fields": [
                            size,
                            {"key": "frames", "label": "Frames", "type": "choice", "options": [121, 189, 237], "default": 189},
                            {"key": "sound", "label": "Sound", "type": "boolean", "default": True},
                            {"key": "seed", "label": "Seed", "type": "number", "role": "seed", "min": 0, "default": 42},
                            count,
                        ],
                    },
                    {"key": "image", "fields": [size, count]},
                ],
                "reference": self.reference,
                "reference_kinds": ["image"],
                "progress": "percent",
                "strings": {"footer": "Fake Nano renders solid colours, so double check it"},
            }
        )

    def generate(self, req: GenerateRequest) -> Job:
        job_id = f"fake-{uuid4().hex[:12]}"
        self.jobs[job_id] = {"polls": 0, "req": req}
        return Job(id=job_id, status="queued", progress=0)

    def job(self, job_id: str) -> Job | None:
        state = self.jobs.get(job_id)
        if state is None:
            return None
        state["polls"] += 1
        req: GenerateRequest = state["req"]
        w, h = (int(x) for x in req.values["size"].split("x"))
        if "FAIL" in req.prompt:
            return Job(id=job_id, status="failed", error="prompt asked to fail")
        if state["polls"] >= self.ticks:
            name = f"{job_id}.png"
            if self.store.path(f"out:{name}") is None:
                hue = (sum(ord(c) for c in req.prompt) * 37) % 256
                self.store.save_output("out", name, solid_png(min(w, 64), min(h, 64), (hue, 120, 255 - hue)))
            return Job(id=job_id, status="done", progress=100, media_id=f"out:{name}", width=w, height=h, duration_s=req.values.get("frames", 189) / 24)
        return Job(id=job_id, status="running", progress=round(100 * state["polls"] / self.ticks))

    def list_media(self) -> list[MediaAsset]:
        return self.store.list()

    def media_path(self, media_id: str) -> Path | None:
        return self.store.path(media_id)

    def upload(self, filename: str, data: bytes, content_type: str | None) -> MediaAsset:
        return self.store.save_upload(filename, data)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Run the fake Flow gateway")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--media", type=Path, default=Path("./fake-media"))
    ap.add_argument("--ui", type=Path, help="flow release bundle (dist/) to serve at /ui")
    ap.add_argument("--ticks", type=int, default=6, help="polls until a job completes")
    ap.add_argument("--reference", choices=["none", "optional", "required"], default="optional")
    args = ap.parse_args(argv)

    import uvicorn

    from ..router import create_app

    app = create_app(FakeGateway(args.media, ticks=args.ticks, reference=args.reference), ui_dir=args.ui, cors=True)
    uvicorn.run(app, host="0.0.0.0", port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
