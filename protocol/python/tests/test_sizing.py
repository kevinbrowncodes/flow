"""STORY-608: the size-from-seed rule, driven by the vectors the JS side also reads."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from flow_protocol import parse_size, size_for_seed

VECTORS = json.loads((Path(__file__).resolve().parents[2] / "size-vectors.json").read_text())
CASES = [pytest.param(c, id=f"{c['set']}:{c['requested']}:{c['seed']}") for c in VECTORS["cases"]]


@pytest.mark.parametrize("case", CASES)
def test_shared_vectors(case):
    """Every case here must give the same answer in src/adapter/contract.js — see the file."""
    options = VECTORS["sets"][case["set"]]
    seed = tuple(case["seed"]) if case["seed"] else None
    got = size_for_seed(options, case["requested"], seed, VECTORS["tolerance"])
    assert got == case["expected"], case["why"]


def test_the_vectors_cover_both_incidents():
    """These two cases are the reason the rule exists; losing them would be a silent regression."""
    pairs = {(c["requested"], tuple(c["seed"]) if c["seed"] else None): c["expected"] for c in VECTORS["cases"]}
    assert pairs[("720x1280", (1376, 768))] == "1280x720"
    assert pairs[("832x480", (768, 1376))] == "480x832"


@pytest.mark.parametrize("bad", ["", "x", "1280", "1280x", "0x720", "-4x8", "axb", None, 720])
def test_parse_size_rejects_nonsense(bad):
    assert parse_size(bad) is None


def test_parse_size_accepts_the_forms_a_gateway_uses():
    assert parse_size("1280x720") == (1280, 720)
    assert parse_size("1280X720") == (1280, 720)


def test_a_seed_with_no_height_is_ignored():
    assert size_for_seed(["1280x720", "720x1280"], "720x1280", (100, 0)) == "720x1280"


# --- measuring a seed from its header --------------------------------------------------------

import struct
import zlib

from flow_protocol import image_dimensions
from flow_protocol.conformance import tiny_png


def png(width: int, height: int) -> bytes:
    """A minimal valid PNG of the given size (one grey pixel row repeated), no image library."""
    def chunk(tag: bytes, body: bytes) -> bytes:
        return struct.pack(">I", len(body)) + tag + body + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + b"\x80" * width for _ in range(height))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def jpeg_header(width: int, height: int) -> bytes:
    """SOI, an APP0 to skip over, then a baseline SOF0 carrying the size — enough for the scanner."""
    app0 = b"\xff\xe0" + struct.pack(">H", 16) + b"JFIF\x00" + b"\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    sof0 = b"\xff\xc0" + struct.pack(">HBHHB", 17, 8, height, width, 3) + b"\x01\x22\x00\x02\x11\x01\x03\x11\x01"
    return b"\xff\xd8" + app0 + sof0 + b"\xff\xd9"


def test_image_dimensions_png():
    assert image_dimensions(tiny_png()) == (8, 8)
    assert image_dimensions(png(1376, 768)) == (1376, 768)


def test_image_dimensions_jpeg():
    assert image_dimensions(jpeg_header(1376, 768)) == (1376, 768)
    assert image_dimensions(jpeg_header(768, 1376)) == (768, 1376)


@pytest.mark.parametrize("junk", [b"", b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff\xd9", b"GIF89a....", b"\x89PNG\r\n\x1a\n" + b"\x00" * 30])
def test_image_dimensions_rejects_what_it_cannot_read(junk):
    assert image_dimensions(junk) is None


def test_the_fake_gateway_reshapes_and_says_so(tmp_path):
    """The reference gateway keeps the promise `shape_from_seed: true` makes: a landscape seed
    asked for at the portrait size comes back landscape, at the same tier."""
    from flow_protocol.examples.fake import FakeGateway
    from flow_protocol.models import RunRequest
    gw = FakeGateway(tmp_path, ticks=1)
    assert gw.capabilities().agent.shape_from_seed is True
    ref = gw.upload("wide.png", png(1376, 768), "image/png").id
    run = gw.create_run(RunRequest(reference_id=ref, instruction=gw.instructions()[0].id, count=1, values={"size": "720x1280"}))
    assert run.values["size"] == "1280x720"
    ref2 = gw.upload("tall.png", png(768, 1376), "image/png").id
    run2 = gw.create_run(RunRequest(reference_id=ref2, instruction=gw.instructions()[0].id, count=1, values={"size": "1280x720"}))
    assert run2.values["size"] == "720x1280"
