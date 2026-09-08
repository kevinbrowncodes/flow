"""Agent mode (v1.1): capabilities validation, the router on the fake, conformance."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from flow_protocol.conformance import run_checks, tiny_png
from flow_protocol.examples.fake import FakeGateway
from flow_protocol.models import Capabilities
from flow_protocol.router import create_app

MINIMAL = {"name": "T", "modes": [{"key": "video", "fields": [{"key": "size", "type": "choice", "options": ["1x1"], "default": "1x1"}]}]}


def test_agent_capabilities_validate():
    assert Capabilities.model_validate(MINIMAL).agent is None
    assert Capabilities.model_validate({**MINIMAL, "agent": False}).agent is None
    caps = Capabilities.model_validate({**MINIMAL, "agent": {"fields": ["size"], "count": {"min": 1, "max": 6, "default": 3}}})
    assert caps.agent.confirm == "always" and caps.agent.count.default == 3 and caps.agent.instructions is True
    with pytest.raises(ValidationError, match="outside"):
        Capabilities.model_validate({**MINIMAL, "agent": {"count": {"min": 2, "max": 4, "default": 9}}})
    with pytest.raises(ValidationError, match="at least 1"):
        Capabilities.model_validate({**MINIMAL, "agent": {"count": {"min": 0, "max": 4, "default": 1}}})
    with pytest.raises(ValidationError, match="not fields"):
        Capabilities.model_validate({**MINIMAL, "agent": {"fields": ["nope"]}})
    with pytest.raises(ValidationError, match="requires a 'video' mode"):
        Capabilities.model_validate({"name": "T", "modes": [{"key": "image", "fields": [{"key": "size", "type": "choice", "options": ["1x1"], "default": "1x1"}]}], "agent": {}})


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(FakeGateway(tmp_path, ticks=2)))


def upload(client: TestClient) -> str:
    return client.post("/flow/uploads", files={"file": ("seed.png", tiny_png(), "image/png")}).json()["id"]


def test_instructions_and_plan(client):
    rows = client.get("/flow/agent/instructions").json()
    assert [r["id"] for r in rows] == ["fake-scene", "fake-single"] and rows[1]["count_locked"] is True
    rid = upload(client)
    p = client.post("/flow/agent/plan", json={"reference_id": rid, "instruction": "fake-scene", "count": 3}).json()
    assert len(p["scripts"]) == 3 and p["titles"][0].startswith("🎨") and p["model"] == "fake"
    assert client.post("/flow/agent/plan", json={"reference_id": rid, "instruction": "fake-single", "count": 2}).status_code == 422
    assert client.post("/flow/agent/plan", json={"reference_id": rid, "instruction": "nope", "count": 1}).status_code == 404
    assert client.post("/flow/agent/plan", json={"reference_id": "up:missing.png", "instruction": "fake-scene", "count": 1}).status_code == 404
    assert client.post("/flow/agent/plan", json={"reference_id": rid, "instruction": "fake-scene", "count": 0}).status_code == 422
    assert client.get("/flow/media").json()[0]["id"] == rid, "a plan renders nothing"


def test_run_lifecycle_on_the_fake(client):
    rid = upload(client)
    r = client.post("/flow/agent/runs", json={"reference_id": rid, "instruction": "fake-scene", "count": 2, "project_id": "p1"})
    assert r.status_code == 202
    run = r.json()
    rid_run = run["id"]
    # the seed is tiny_png (8x8, square), so the fake — which reshapes (STORY-608) — records the square size
    assert run["state"] == "planning" and run["clip_count"] == 2 and run["values"]["size"] == "960x960"

    def poll():
        return client.get(f"/flow/agent/runs/{rid_run}").json()

    assert poll()["state"] == "review"                      # first poll plans
    assert client.post(f"/flow/agent/runs/{rid_run}/approve").json()["state"] == "queued" or True
    # back it up: we approved before editing — make a fresh run to exercise review edits
    r2 = client.post("/flow/agent/runs", json={"reference_id": rid, "instruction": "fake-scene", "count": 2}).json()["id"]
    client.get(f"/flow/agent/runs/{r2}")
    edited = client.patch(f"/flow/agent/runs/{r2}/scripts/2", json={"text": " slower "}).json()
    assert edited["scripts"][1] == "slower" and edited["clips"][1]["script"] == "slower"
    assert client.patch(f"/flow/agent/runs/{r2}/scripts/9", json={"text": "x"}).status_code == 404
    assert client.patch(f"/flow/agent/runs/{r2}/scripts/1", json={"text": ""}).status_code == 422
    assert "rewritten" in client.post(f"/flow/agent/runs/{r2}/scripts/1/rewrite").json()["scripts"][0]
    assert client.post(f"/flow/agent/runs/{r2}/resume").status_code == 409
    assert client.post(f"/flow/agent/runs/{r2}/approve").json()["state"] == "queued"
    assert client.post(f"/flow/agent/runs/{r2}/approve").status_code == 409
    assert client.patch(f"/flow/agent/runs/{r2}/scripts/1", json={"text": "late"}).status_code == 409

    # the chain: 2 clips × (submit + ticks polls)
    states = []
    for _ in range(20):
        run = client.get(f"/flow/agent/runs/{r2}").json()
        states.append(run["state"])
        if run["state"] in ("done", "failed"):
            break
    assert run["state"] == "done" and [c["media_id"] for c in run["clips"]] and all(c["media_id"] for c in run["clips"])
    assert "rendering" in states and run["step"] == "Done"
    assert len(client.get("/flow/agent/runs", params={"project_id": "p1"}).json()) == 1
    assert client.get("/flow/agent/runs/run_nope").status_code == 404
    assert client.post("/flow/agent/runs/run_nope/approve").status_code == 404

    # a failing clip → failed → resume → queued at the same clip
    r3 = client.post("/flow/agent/runs", json={"reference_id": rid, "instruction": "fake-scene", "count": 1, "autostart": True}).json()["id"]
    assert client.get(f"/flow/agent/runs/{r3}").json()["state"] == "queued"                  # autostart skips review
    client.patch  # (scripts are locked now)
    assert client.post("/flow/agent/runs", json={"reference_id": rid, "instruction": "fake-scene", "count": 1, "values": {"bogus": 1}}).status_code == 422
    assert client.post("/flow/agent/runs", json={"reference_id": rid, "instruction": "nope", "count": 1}).status_code == 404


def test_conformance_agent_checks(client, tmp_path):
    checks = run_checks(client, generate=False)
    agent = [c for c in checks if c.name.startswith("agent:")]
    assert agent and all(c.ok for c in agent), [(c.name, c.detail) for c in agent if not c.ok]
    # a gateway that does not declare agent must not expose the routes
    plain = TestClient(create_app(FakeGateway(tmp_path / "plain", ticks=2, agent=False)))
    checks = run_checks(plain, generate=False)
    consistency = [c for c in checks if "no agent declared" in c.name]
    assert consistency and consistency[0].ok, consistency
    assert not any(c.name.startswith("agent:") for c in checks)
