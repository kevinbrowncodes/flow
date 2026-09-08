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

import time

from ..gateway import FlowAgent, FlowGateway, UpstreamError, normalise_request
from ..media import MediaStore
from ..sizing import image_dimensions, size_for_seed
from ..models import Capabilities, Clip, GenerateRequest, Instruction, Job, MediaAsset, Plan, PlanRequest, Run, RunRequest


def solid_png(w: int, h: int, rgb: tuple[int, int, int]) -> bytes:
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


FAKE_INSTRUCTIONS = [
    Instruction(id="fake-scene", name="fake-scene", description="Writes N solid-colour clips that continue the seed.", count_locked=False),
    Instruction(id="fake-single", name="fake-single", description="One clip, one paragraph.", count_locked=True),
]


class FakeGateway(FlowGateway, FlowAgent):
    """Renders solid colours and, as a FlowAgent, plans canned scripts and
    advances a run one step per poll — the whole agent flow without a model."""

    def __init__(self, media_dir: Path, ticks: int = 4, reference: str = "optional", agent: bool = True) -> None:
        media_dir = Path(media_dir)
        self.store = MediaStore({"up": media_dir / "uploads", "out": media_dir / "outputs"}, upload_root="up")
        self.ticks = ticks
        self.reference = reference
        self.agent_enabled = agent
        self.jobs: dict[str, dict[str, Any]] = {}
        self.runs: dict[str, Run] = {}

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
                "agent": {"instructions": True, "count": {"min": 1, "max": 6, "default": 3}, "confirm": "always", "fields": ["size", "frames", "sound"],
                          "shape_from_seed": True} if self.agent_enabled else False,
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

    # --- FlowAgent ----------------------------------------------------------------

    def _instruction(self, instruction_id: str, count: int) -> Instruction:
        instr = next((i for i in FAKE_INSTRUCTIONS if i.id == instruction_id), None)
        if instr is None:
            raise UpstreamError(f"unknown instruction {instruction_id!r}", 404)
        if instr.count_locked and count != 1:
            raise UpstreamError(f"{instr.id!r} writes a single clip; count must be 1", 422)
        return instr

    def instructions(self) -> list[Instruction]:
        return list(FAKE_INSTRUCTIONS)

    async def plan(self, req: PlanRequest) -> Plan:
        self._instruction(req.instruction, req.count)
        if self.store.path(req.reference_id) is None:
            raise UpstreamError(f"unknown reference {req.reference_id!r}", 404)
        scripts = [f"[0:00-0:04] Clip {n} of {req.count} begins.\n[0:04-0:08] The colour deepens.\n[0:08-0:10] It settles." for n in range(1, req.count + 1)]
        return Plan(instruction=req.instruction, count=req.count, scripts=scripts, titles=["🎨 Solid Colours", "🟦 Blue Period"], summary=f"Solid Colours ({req.count} × 10 s)", attempts=1, model="fake")

    def create_run(self, req: RunRequest) -> Run:
        self._instruction(req.instruction, req.count)
        seed_path = self.store.path(req.reference_id)
        if seed_path is None:
            raise UpstreamError(f"unknown reference {req.reference_id!r}", 404)
        # Shape from the seed, resolution from the request (STORY-608) — the same rule the UI
        # previews, so `shape_from_seed: True` above is a promise this keeps. A size the
        # gateway does not offer is left alone so it still fails validation below.
        values = {**req.values}
        options = ["1280x720", "720x1280", "960x960"]
        if values.get("size") is None or values["size"] in options:
            chosen = size_for_seed(options, values.get("size") or "1280x720", image_dimensions(Path(seed_path).read_bytes()))
            if chosen:
                values["size"] = chosen
        try:
            norm = normalise_request(self.capabilities(), GenerateRequest(mode="video", prompt="plan", values={**values, "count": 1}, reference_id=req.reference_id))
        except ValueError as e:
            raise UpstreamError(str(e), 422) from e
        run = Run(
            id=f"run_{uuid4().hex[:12]}", project_id=req.project_id, state="planning", step="Writing scripts…",
            clip_count=req.count, instruction=req.instruction, count=req.count, values=norm.values, reference_id=req.reference_id,
            clips=[Clip(n=n) for n in range(1, req.count + 1)], autostart=req.autostart, created_at=time.time(),
        )
        self.runs[run.id] = run
        return run

    def list_runs(self, project_id: str | None = None) -> list[Run]:
        runs = [r for r in self.runs.values() if project_id is None or r.project_id == project_id]
        return sorted(runs, key=lambda r: r.created_at, reverse=True)

    def run(self, run_id: str) -> Run | None:
        """Every poll advances the run one step: plan → review/queued → render clip by clip."""
        run = self.runs.get(run_id)
        if run is None:
            return None
        if run.state == "planning":
            plan = _sync(self.plan(PlanRequest(reference_id=run.reference_id, instruction=run.instruction, count=run.count)))
            run.scripts, run.titles, run.summary, run.title = plan.scripts, plan.titles, plan.summary, plan.titles[0]
            for clip, script in zip(run.clips, plan.scripts):
                clip.script = script
            run.state = "queued" if run.autostart else "review"
        elif run.state in ("queued", "rendering"):
            clip = run.clips[run.clip_index]
            if clip.job_id is None:
                job = self.generate(GenerateRequest(mode="video", prompt=clip.script or "", values=run.values, reference_id=run.reference_id))
                clip.job_id, clip.status, run.state = job.id, "running", "rendering"
            else:
                job = self.job(clip.job_id)
                assert job is not None
                clip.status, clip.progress = job.status, job.progress
                if job.status == "failed":
                    clip.error = job.error
                    run.state, run.error = "failed", job.error
                elif job.status == "done":
                    clip.media_id = job.media_id
                    run.clip_index += 1
                    run.state = "done" if run.clip_index >= run.count else "queued"
        run.step = _step(run)
        run.updated_at = time.time()
        return run

    def _review_only(self, run_id: str) -> Run:
        run = self.runs.get(run_id)
        if run is None:
            raise UpstreamError(f"unknown run {run_id!r}", 404)
        if run.state != "review":
            raise UpstreamError(f"scripts can only change while the run is in review (it is {run.state})", 409)
        return run

    def edit_script(self, run_id: str, n: int, text: str) -> Run:
        run = self._review_only(run_id)
        if not 1 <= n <= run.count:
            raise UpstreamError(f"run has {run.count} scripts; no script {n}", 404)
        run.scripts[n - 1] = text.strip()
        run.clips[n - 1].script = run.scripts[n - 1]
        return run

    async def rewrite_script(self, run_id: str, n: int) -> Run:
        run = self._review_only(run_id)
        if not 1 <= n <= run.count:
            raise UpstreamError(f"run has {run.count} scripts; no script {n}", 404)
        run.scripts[n - 1] = f"[0:00-0:04] Clip {n} of {run.count}, rewritten.\n[0:04-0:08] A different colour.\n[0:08-0:10] It settles."
        run.clips[n - 1].script = run.scripts[n - 1]
        return run

    def approve(self, run_id: str) -> Run:
        run = self._review_only(run_id)
        run.state, run.step = "queued", "Queued"
        return run

    def resume(self, run_id: str) -> Run:
        run = self.runs.get(run_id)
        if run is None:
            raise UpstreamError(f"unknown run {run_id!r}", 404)
        if run.state not in ("failed", "paused"):
            raise UpstreamError(f"only a failed or paused run can be resumed (it is {run.state})", 409)
        clip = run.clips[run.clip_index]
        clip.job_id, clip.status, clip.progress, clip.error = None, "pending", None, None
        run.state, run.error, run.step = "queued", None, "Queued"
        return run


def _step(run: Run) -> str:
    n, total = run.clip_index, run.count
    return {
        "planning": f"Writing {total} script{'s' if total != 1 else ''}…", "review": "Waiting for review",
        "queued": "Queued" if n == 0 else f"Caching clip {n}", "rendering": f"Rendering clip {n + 1} of {total}",
        "paused": f"Paused: {run.error or 'gate'}", "failed": f"Failed at clip {n + 1}: {run.error or 'unknown'}", "done": "Done",
    }[run.state]


def _sync(coro):  # the fake's planner is instant; run it inline
    import asyncio

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(1) as ex:
        return ex.submit(asyncio.run, coro).result()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Run the fake Flow gateway")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--media", type=Path, default=Path("./fake-media"))
    ap.add_argument("--ui", type=Path, help="flow release bundle (dist/) to serve at /ui")
    ap.add_argument("--ticks", type=int, default=6, help="polls until a job completes")
    ap.add_argument("--reference", choices=["none", "optional", "required"], default="optional")
    ap.add_argument("--no-agent", action="store_true", help="do not declare agent mode")
    args = ap.parse_args(argv)

    import uvicorn

    from ..router import create_app

    app = create_app(FakeGateway(args.media, ticks=args.ticks, reference=args.reference, agent=not args.no_agent), ui_dir=args.ui, cors=True)
    uvicorn.run(app, host="0.0.0.0", port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
