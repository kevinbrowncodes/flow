"""A directory-backed media store: ids are `<root>:<filename>`."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from .models import MediaAsset

KIND_BY_EXT = {
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".webp": "image",
    ".gif": "image",
    ".mp4": "video",
    ".mov": "video",
    ".webm": "video",
    ".mkv": "video",
}

_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def kind_of(path: Path | str) -> str | None:
    return KIND_BY_EXT.get(Path(path).suffix.lower())


def safe_name(filename: str) -> str:
    name = _SAFE.sub("_", Path(filename).name).strip("._") or "file"
    return name


class MediaStore:
    """Files in a few named directories. `upload_root` receives uploads;
    every other root is treated as generated output."""

    def __init__(self, roots: dict[str, Path], upload_root: str) -> None:
        if upload_root not in roots:
            raise ValueError(f"upload_root {upload_root!r} is not one of {list(roots)}")
        self.roots = {k: Path(v) for k, v in roots.items()}
        self.upload_root = upload_root
        for d in self.roots.values():
            d.mkdir(parents=True, exist_ok=True)

    def make_id(self, root: str, filename: str) -> str:
        return f"{root}:{filename}"

    def asset(self, root: str, filename: str) -> MediaAsset:
        path = self.roots[root] / filename
        kind = kind_of(path) or "image"
        created = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat() if path.exists() else None
        return MediaAsset(
            id=self.make_id(root, filename),
            name=filename,
            kind=kind,  # type: ignore[arg-type]
            source="upload" if root == self.upload_root else "output",
            created_at=created,
        )

    def list(self) -> list[MediaAsset]:
        found: list[tuple[float, MediaAsset]] = []
        for root, d in self.roots.items():
            for p in d.iterdir():
                if p.is_file() and kind_of(p):
                    found.append((p.stat().st_mtime, self.asset(root, p.name)))
        found.sort(key=lambda t: t[0], reverse=True)
        return [a for _, a in found]

    def split(self, media_id: str) -> tuple[str, str] | None:
        root, sep, name = media_id.partition(":")
        if not sep or root not in self.roots:
            return None
        if not name or name in (".", "..") or "/" in name or "\\" in name:
            return None
        return root, name

    def path(self, media_id: str) -> Path | None:
        parts = self.split(media_id)
        if parts is None:
            return None
        root, name = parts
        p = (self.roots[root] / name).resolve()
        if p.parent != self.roots[root].resolve() or not p.is_file():
            return None
        return p

    def save_upload(self, filename: str, data: bytes) -> MediaAsset:
        name = f"{uuid4().hex[:8]}-{safe_name(filename)}"
        (self.roots[self.upload_root] / name).write_bytes(data)
        return self.asset(self.upload_root, name)

    def save_output(self, root: str, filename: str, data: bytes) -> MediaAsset:
        name = safe_name(filename)
        (self.roots[root] / name).write_bytes(data)
        return self.asset(root, name)
