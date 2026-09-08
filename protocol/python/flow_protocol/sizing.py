"""Choosing an output size for a gateway that conditions on a reference frame (STORY-608).

A gateway which uses the reference as the video's first frame cannot honour a size of a
different shape: it rescales the frame, and the whole clip comes out squashed. So the *shape*
has to come from the reference and only the *resolution* from the request.

Two implementations of this rule exist — this one and `sizeForSeed` in
`src/adapter/contract.js` — because the browser has to be able to show the answer before a
render starts while the gateway is the one that enforces it. They are kept in step by
`protocol/size-vectors.json`, which both test suites read. Change the rule in one place and
both suites fail, which is the intent: a preview that disagrees with the gateway is worse than
no preview.
"""

from __future__ import annotations

import math
import struct
from collections.abc import Sequence

# Sizes within this log-aspect distance of the best match count as the same shape, so the two
# orientations of one shape compete on pixel count instead. ln(16/9) - ln(4/3) is 0.29, so 0.15
# separates 16:9 from 4:3 without splitting an orientation pair.
ASPECT_TOLERANCE = 0.15


def parse_size(size: str | None) -> tuple[int, int] | None:
    """`"1280x720"` → `(1280, 720)`; anything else → None."""
    try:
        w, h = (int(n) for n in str(size).lower().split("x"))
    except (ValueError, AttributeError):
        return None
    return (w, h) if w > 0 and h > 0 else None


def size_for_seed(
    options: Sequence[str],
    requested: str | None,
    seed: tuple[int, int] | None,
    tolerance: float = ASPECT_TOLERANCE,
) -> str | None:
    """The offered size shaped like `seed`, at the pixel budget `requested` asked for.

    `options` are the sizes the gateway offers, `requested` what the caller asked for (which
    may be a UI default rather than a considered choice), and `seed` the reference's pixel
    dimensions. With no options or no measurable seed the request stands unchanged.
    """
    sized = [(o, d) for o in options if (d := parse_size(o))]
    if not sized or not seed or seed[1] <= 0:
        return requested
    target = math.log(seed[0] / seed[1])
    budget = (lambda d: d[0] * d[1])(parse_size(requested) or (0, 0))
    best = min(abs(math.log(w / h) - target) for _, (w, h) in sized)
    close = [(o, w * h) for o, (w, h) in sized if abs(math.log(w / h) - target) <= best + tolerance]
    return min(close, key=lambda t: (abs(t[1] - budget), t[0]))[0]


def image_dimensions(data: bytes) -> tuple[int, int] | None:
    """Width and height of a PNG or JPEG from its header bytes, or None.

    Enough for a gateway to size a seed without an image library: PNG keeps them in IHDR at a
    fixed offset; JPEG keeps them in the first SOF marker. A gateway that also takes video
    seeds needs a real probe (spark-cosmos3 shells out to ffprobe).
    """
    if data[:8] == b"\x89PNG\r\n\x1a\n" and len(data) >= 24 and data[12:16] == b"IHDR":
        w, h = struct.unpack(">II", data[16:24])
        return (w, h) if w > 0 and h > 0 else None
    if data[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                i += 2
                continue
            length = struct.unpack(">H", data[i + 2:i + 4])[0]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return (w, h) if w > 0 and h > 0 else None
            i += 2 + length
    return None
