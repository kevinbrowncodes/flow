"""Poster frames for video media, via ffmpeg, cached next to the file."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


def poster(video: Path, cache_dir: Path | None = None, width: int = 640) -> Path | None:
    """First frame of `video` as JPEG. Returns None when ffmpeg is unavailable."""
    cache = cache_dir or (video.parent / ".flow-thumbs")
    cache.mkdir(parents=True, exist_ok=True)
    out = cache / f"{video.stem}-{int(video.stat().st_mtime)}.jpg"
    if out.exists():
        return out
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return None
    subprocess.run(
        [ffmpeg, "-y", "-loglevel", "error", "-i", str(video), "-frames:v", "1", "-vf", f"scale={width}:-2", str(out)],
        check=False,
        timeout=60,
        capture_output=True,
    )
    return out if out.exists() else None
