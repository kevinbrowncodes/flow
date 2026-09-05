from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from flow_protocol.conformance import run_checks, tiny_png
from flow_protocol.examples.fake import FakeGateway
from flow_protocol.models import PROTOCOL_VERSION, Capabilities
from flow_protocol.router import create_app


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(FakeGateway(tmp_path, ticks=2)))


def test_conformance_end_to_end(client: TestClient) -> None:
    checks = run_checks(client, generate=True, reference=tiny_png(), timeout=30, poll=0.001)
    failed = [f"{c.name}: {c.detail}" for c in checks if not c.ok]
    assert not failed, failed
    assert len(checks) >= 18


def test_unknown_mode_is_422(client: TestClient) -> None:
    r = client.post("/flow/generate", json={"mode": "audio", "prompt": "x"})
    assert r.status_code == 422
    assert "unknown mode" in r.json()["detail"]


def test_unknown_field_is_422(client: TestClient) -> None:
    r = client.post("/flow/generate", json={"mode": "video", "prompt": "x", "values": {"bogus": 1}})
    assert r.status_code == 422
    assert "bogus" in r.json()["detail"]


def test_values_are_coerced_and_defaulted(client: TestClient) -> None:
    r = client.post("/flow/generate", json={"mode": "video", "prompt": "x", "values": {"frames": "121", "sound": "false"}})
    assert r.status_code == 202
    job = r.json()
    assert job["status"] == "queued"
    # drive it to completion and check the defaults flowed through
    for _ in range(3):
        j = client.get(f"/flow/jobs/{job['id']}").json()
    assert j["status"] == "done"
    assert (j["width"], j["height"]) == (1280, 720)
    assert j["duration_s"] == pytest.approx(121 / 24)


def test_required_reference(tmp_path: Path) -> None:
    c = TestClient(create_app(FakeGateway(tmp_path, reference="required")))
    r = c.post("/flow/generate", json={"mode": "video", "prompt": "x"})
    assert r.status_code == 422
    assert "reference" in r.json()["detail"]
    r = c.post("/flow/generate", json={"mode": "video", "prompt": "x", "reference_id": "up:missing.png"})
    assert r.status_code == 404


def test_reference_refused_when_backend_has_none(tmp_path: Path) -> None:
    c = TestClient(create_app(FakeGateway(tmp_path, reference="none")))
    up = c.post("/flow/uploads", files={"file": ("a.png", tiny_png(), "image/png")})
    assert up.status_code == 201
    r = c.post("/flow/generate", json={"mode": "video", "prompt": "x", "reference_id": up.json()["id"]})
    assert r.status_code == 422


def test_failed_job_is_reported(client: TestClient) -> None:
    job = client.post("/flow/generate", json={"mode": "video", "prompt": "please FAIL"}).json()
    j = client.get(f"/flow/jobs/{job['id']}").json()
    assert j["status"] == "failed"
    assert j["error"]


def test_media_ids_cannot_traverse(client: TestClient) -> None:
    for bad in ["up:../pyproject.toml", "up:..", "nope:x.png", "up:", "up:sub/dir.png"]:
        assert client.get(f"/flow/media/{bad}").status_code == 404, bad


def test_empty_upload_is_422(client: TestClient) -> None:
    r = client.post("/flow/uploads", files={"file": ("a.png", b"", "image/png")})
    assert r.status_code == 422


def test_capabilities_reject_wrong_protocol() -> None:
    with pytest.raises(ValueError, match="protocol 2"):
        Capabilities.model_validate({"protocol": 2, "name": "x", "modes": [{"key": "video"}]})
    caps = Capabilities.model_validate({"name": "x", "modes": [{"key": "video"}]})
    assert caps.protocol == PROTOCOL_VERSION
    assert caps.default_mode == "video"
    assert caps.reference_kinds == []
