# flow-protocol

Python side of the [Flow Gateway Protocol](../PROTOCOL.md): pydantic models, a
FastAPI router, reference gateways, and a conformance CLI.

```bash
pip install "flow-protocol[server] @ git+https://github.com/kevinbrowncodes/flow@v0.1.0#subdirectory=protocol/python"
```

Pin the **same tag** you pin for the UI bundle — they are released together.

## Implement a gateway

```python
from pathlib import Path
from flow_protocol import FlowGateway, MediaStore, Capabilities, GenerateRequest, Job, MediaAsset
from flow_protocol.router import build_router, mount_ui

class MyGateway(FlowGateway):
    def __init__(self):
        self.store = MediaStore({"in": Path("/media/in"), "out": Path("/media/out")}, upload_root="in")

    def capabilities(self) -> Capabilities:
        return Capabilities.model_validate({
            "name": "My Model",
            "modes": [{"key": "video", "fields": [
                {"key": "size", "label": "Size", "type": "choice", "role": "size",
                 "options": ["1280x720", "720x1280"], "default": "1280x720"},
                {"key": "count", "label": "Outputs", "type": "choice", "role": "count",
                 "options": [1, 2], "default": 1},
            ]}],
            "reference": "required", "reference_kinds": ["image"], "progress": "percent",
        })

    def generate(self, req: GenerateRequest) -> Job: ...      # submit ONE output, return its job
    def job(self, job_id: str) -> Job | None: ...             # poll
    def list_media(self): return self.store.list()
    def media_path(self, media_id): return self.store.path(media_id)
    def upload(self, filename, data, content_type): return self.store.save_upload(filename, data)

app.include_router(build_router(MyGateway()))
mount_ui(app, "/app/flow-ui")   # serves the pinned release bundle at /ui
```

Reference implementations: [`examples/cosmos3.py`](flow_protocol/examples/cosmos3.py),
[`examples/ltx2.py`](flow_protocol/examples/ltx2.py), and
[`examples/fake.py`](flow_protocol/examples/fake.py) (no GPU; used by the tests).

## Check yourself before bumping the UI

```bash
flow-conformance http://localhost:8002                     # contract checks, no GPU time
flow-conformance http://localhost:8002 --generate --reference still.png   # plus one real render
```

Exit code 1 on any failure, with the failing line named. Run it in CI against
the fake, and by hand against the real box.

## Try the UI without a GPU

```bash
flow-fake-gateway --ui /path/to/flow/dist --port 8765
open http://localhost:8765/ui/
```

## Tests

```bash
pip install -e ".[dev]" && pytest
```
