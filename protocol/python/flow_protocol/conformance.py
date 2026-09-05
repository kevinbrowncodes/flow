"""Conformance checks a gateway runs against itself before bumping its pinned
flow version.

    flow-conformance http://localhost:8002
    flow-conformance http://localhost:8002 --generate --reference still.png

The same checks run in-process in tests via `run_checks(TestClient(app))`.
"""

from __future__ import annotations

import argparse
import struct
import sys
import time
import zlib
from dataclasses import dataclass, field
from pathlib import Path

import httpx
from pydantic import ValidationError

from .models import PROTOCOL_VERSION, Capabilities, Job, MediaAsset


@dataclass
class Check:
    name: str
    ok: bool
    detail: str = ""


@dataclass
class Report:
    checks: list[Check] = field(default_factory=list)

    def add(self, name: str, ok: bool, detail: str = "") -> bool:
        self.checks.append(Check(name, ok, detail))
        return ok

    @property
    def ok(self) -> bool:
        return all(c.ok for c in self.checks)


def tiny_png(w: int = 8, h: int = 8, rgb: tuple[int, int, int] = (200, 80, 40)) -> bytes:
    """A solid PNG without PIL: enough to upload and thumbnail."""
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def run_checks(
    client: httpx.Client,
    *,
    prefix: str = "/flow",
    generate: bool = False,
    reference: bytes | None = None,
    timeout: float = 900.0,
    poll: float = 2.0,
) -> list[Check]:
    r = Report()

    # 1. capabilities
    resp = client.get(f"{prefix}/capabilities")
    if not r.add("GET /capabilities → 200", resp.status_code == 200, f"got {resp.status_code}"):
        return r.checks
    try:
        caps = Capabilities.model_validate(resp.json())
    except (ValidationError, ValueError) as e:
        r.add("capabilities validate", False, str(e))
        return r.checks
    r.add("capabilities validate", True, f"{caps.name}: modes={[m.key for m in caps.modes]} reference={caps.reference} progress={caps.progress}")
    r.add(f"protocol == {PROTOCOL_VERSION}", caps.protocol == PROTOCOL_VERSION, f"got {caps.protocol}")
    r.add("every mode declares at least one field", all(m.fields for m in caps.modes), "a mode with no fields renders an empty popover")

    # 2. media listing
    resp = client.get(f"{prefix}/media")
    if r.add("GET /media → 200", resp.status_code == 200, f"got {resp.status_code}"):
        try:
            assets = [MediaAsset.model_validate(a) for a in resp.json()]
            r.add("media assets validate", True, f"{len(assets)} asset(s)")
        except (ValidationError, ValueError, TypeError) as e:
            r.add("media assets validate", False, str(e))

    # 3. unknown job → 404
    resp = client.get(f"{prefix}/jobs/does-not-exist")
    r.add("GET /jobs/{unknown} → 404", resp.status_code == 404, f"got {resp.status_code}")

    # 4. upload + serve (only meaningful when references are accepted)
    uploaded: MediaAsset | None = None
    if caps.reference != "none":
        data = reference or tiny_png()
        resp = client.post(f"{prefix}/uploads", files={"file": ("conformance.png", data, "image/png")})
        if r.add("POST /uploads → 201", resp.status_code in (200, 201), f"got {resp.status_code}: {resp.text[:200]}"):
            try:
                uploaded = MediaAsset.model_validate(resp.json())
                r.add("upload asset validates", True, uploaded.id)
            except (ValidationError, ValueError) as e:
                r.add("upload asset validates", False, str(e))
        if uploaded:
            resp = client.get(f"{prefix}/media/{uploaded.id}", params={"type": "FULL"})
            r.add("GET /media/{upload}?type=FULL → 200", resp.status_code == 200, f"got {resp.status_code}")
            resp = client.get(f"{prefix}/media/{uploaded.id}", params={"type": "THUMBNAIL"})
            ctype = resp.headers.get("content-type", "")
            r.add("GET /media/{upload}?type=THUMBNAIL → image/*", resp.status_code == 200 and ctype.startswith("image/"), f"{resp.status_code} {ctype}")
            resp = client.get(f"{prefix}/media")
            r.add("upload appears in /media", any(a.get("id") == uploaded.id for a in resp.json()), "")

    # 5. validation: unknown mode / unknown field
    resp = client.post(f"{prefix}/generate", json={"mode": "not-a-mode", "prompt": "x"})
    r.add("POST /generate unknown mode → 422", resp.status_code == 422, f"got {resp.status_code}")
    mode = caps.mode(caps.default_mode or caps.modes[0].key)
    assert mode is not None
    resp = client.post(f"{prefix}/generate", json={"mode": mode.key, "prompt": "x", "values": {"__bogus__": 1}, "reference_id": uploaded.id if uploaded else None})
    r.add("POST /generate unknown field → 422", resp.status_code == 422, f"got {resp.status_code}")
    if caps.reference == "required":
        resp = client.post(f"{prefix}/generate", json={"mode": mode.key, "prompt": "x", "values": mode.defaults()})
        r.add("POST /generate without required reference → 422", resp.status_code == 422, f"got {resp.status_code}")

    # 6. optional real generation
    if generate:
        body = {"mode": mode.key, "prompt": "Conformance run: a calm lake at dawn, gentle drift.", "values": mode.defaults()}
        count = mode.by_role("count")
        if count:
            body["values"][count.key] = count.options[0].value if count.options else 1
        if caps.reference != "none" and uploaded:
            body["reference_id"] = uploaded.id
        resp = client.post(f"{prefix}/generate", json=body)
        if not r.add("POST /generate → 202 Job", resp.status_code in (200, 202), f"{resp.status_code}: {resp.text[:300]}"):
            return r.checks
        try:
            job = Job.model_validate(resp.json())
        except (ValidationError, ValueError) as e:
            r.add("job validates", False, str(e))
            return r.checks
        r.add("job validates", True, f"{job.id} {job.status}")
        deadline = time.monotonic() + timeout
        saw_progress = False
        while job.status not in ("done", "failed"):
            if time.monotonic() > deadline:
                r.add(f"job reaches a terminal state within {timeout:.0f}s", False, f"still {job.status}")
                return r.checks
            time.sleep(poll)
            resp = client.get(f"{prefix}/jobs/{job.id}")
            if resp.status_code != 200:
                r.add("GET /jobs/{id} while running → 200", False, f"got {resp.status_code}")
                return r.checks
            job = Job.model_validate(resp.json())
            if job.progress is not None and 0 < job.progress < 100:
                saw_progress = True
        r.add("job reaches a terminal state", True, f"{job.status}")
        if caps.progress == "percent":
            r.add("progress moved while running (progress: percent)", saw_progress, "never saw 0 < progress < 100; declare progress: none if the backend can't report it")
        if not r.add("job finished as done", job.status == "done", job.error or ""):
            return r.checks
        if r.add("done job carries media_id", bool(job.media_id), ""):
            resp = client.get(f"{prefix}/media/{job.media_id}", params={"type": "FULL"})
            r.add("GET /media/{output}?type=FULL → 200", resp.status_code == 200, f"got {resp.status_code}")
            resp = client.get(f"{prefix}/media/{job.media_id}", params={"type": "THUMBNAIL"})
            ctype = resp.headers.get("content-type", "")
            r.add("GET /media/{output}?type=THUMBNAIL → image/*", resp.status_code == 200 and ctype.startswith("image/"), f"{resp.status_code} {ctype}")
        r.add("done job reports width/height", bool(job.width and job.height), "the details column shows Resolution from these")
    return r.checks


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Flow Gateway Protocol conformance")
    ap.add_argument("base_url", help="e.g. http://localhost:8002")
    ap.add_argument("--prefix", default="/flow")
    ap.add_argument("--generate", action="store_true", help="also run one real generation and wait for it")
    ap.add_argument("--reference", type=Path, help="image to upload as the reference (default: a tiny PNG)")
    ap.add_argument("--timeout", type=float, default=900.0)
    ap.add_argument("--poll", type=float, default=2.0)
    args = ap.parse_args(argv)

    reference = args.reference.read_bytes() if args.reference else None
    with httpx.Client(base_url=args.base_url, timeout=60.0) as client:
        checks = run_checks(client, prefix=args.prefix, generate=args.generate, reference=reference, timeout=args.timeout, poll=args.poll)
    for c in checks:
        mark = "✓" if c.ok else "✗"
        print(f"{mark} {c.name}" + (f"  — {c.detail}" if c.detail else ""))
    failed = [c for c in checks if not c.ok]
    print(f"\n{len(checks) - len(failed)}/{len(checks)} passed" + ("" if not failed else f", {len(failed)} FAILED"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
