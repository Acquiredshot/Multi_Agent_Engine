# Multi-Agent Engine

## What this application does

Multi-Agent Engine is an intelligent multi-agent workflow engine for document
processing and review. It accepts a source document, extracts data from it, and
then evaluates the document through independent agent tasks for:

- OCR: turn a document into machine-readable text
- Compliance: flag policy, policy-language, and invoice-style checks
- Anomaly detection: score the document for suspicious or unusual patterns

The application is structured like the architecture board shown in the design:
FastAPI receives requests, Celery orchestrates the workflow, RabbitMQ acts as the
asynchronous task backbone, and Redis stores task state and result payloads. A
client submits a document once, the work is queued and processed asynchronously,
and the caller polls a single task id to get the final merged result.

This maps directly to a workflow-engine model for invoice review, document triage,
and compliance operations where a single document is analysed by multiple
specialised agents without blocking the API.

The compliance and anomaly agents are implemented as lightweight LangGraph-style
workflows that evaluate document text through a deterministic node pipeline,
while still keeping the existing Celery task contract and fan-out/chord
execution model intact.

```
POST /documents  ->  ocr ──┐
                           ├─> compliance ──┐
                           └─> anomaly ─────┴─> aggregate ─> GET /tasks/{id}
```

Each agent has its own queue and its own worker pool, so an OCR backlog cannot
starve compliance or anomaly work. Every dispatch terminates in a single
aggregation task, which is what lets callers poll one task id regardless of how
the work was arranged internally.

## How the application works

1. A client sends a document request to the FastAPI API.
2. The API translates the request into a Celery canvas.
3. RabbitMQ receives the queued tasks.
4. Dedicated worker pools execute OCR, compliance, and anomaly jobs.
5. The results are merged into a single payload by the aggregate task.
6. The client reads the final result from `GET /tasks/{task_id}`.

This keeps the API responsive while allowing expensive document processing to
occur in the background.

## Updated architecture

The current implementation matches the core pattern in the reference design:

```text
External requests / API clients
    -> API gateway layer (FastAPI)
    -> asynchronous task queue (RabbitMQ)
        -> OCR agent
        -> Compliance agent
        -> Anomaly detection agent
        -> aggregate / reporting task
    -> result store (Redis)
    -> final task status + merged payload
```

This is the operational core of the workflow engine shown in the architecture
board: a single API entry point, decoupled worker agents, and a queued async
execution model. It keeps the system responsive and lets each agent operate on
its own queue without blocking the rest of the pipeline.

The messaging layer is intentionally split:

- RabbitMQ handles queueing and broker delivery for worker tasks.
- Redis stores Celery task results and status metadata.
- Each agent still owns its own queue, preserving the OCR backlog protection
  model that prevents a slow OCR batch from stalling compliance or anomaly work.

The compliance and anomaly agents are not raw stub implementations anymore.
They run through a LangGraph-style graph structure when available, with a safe
plain-Python fallback when the optional graph dependency is absent. This keeps
production deployments stable while giving the app a real, inspectable workflow
for rule evaluation and anomaly scoring.

### Alignment with the design board

The repository currently implements the core workflow-engine layer from the
board:

- API request intake
- async orchestration via Celery + RabbitMQ
- dedicated agent workers
- agent result aggregation
- task status polling via Redis-backed results

The diagram also references additional support layers such as a system state
store (for example PostgreSQL + pgvector) and secure external APIs. Those are
integration points and optional extensions for the next layer of the system, but
this repository focuses on the execution engine itself rather than a full
production data platform around it.

## Modular OCR Architecture

Designed with the **Strategy Pattern** to decouple ingestion hardware from
cloud dependencies. Defaults to **Tesseract OCR** for zero-cost local
execution and rapid integration testing. Production instances can toggle
`OCR_BACKEND=textract` via environment variables to utilise managed **AWS
Textract** for enterprise-grade table extraction, high concurrency, and higher
accuracy on noisy scans.

```
app/tasks/ocr.py          the agent — vendor-free, depends only on the interface
        |
        v
app/ocr/registry.py       name -> implementation, imported lazily
app/ocr/base.py           OCRBackend (ABC) + OCRExtraction / Table
        |
        +-- stub.py       extracts nothing; zero dependencies
        +-- tesseract.py  local; tesseract-ocr + poppler-utils
        +-- textract.py   AWS; boto3 + credentials
```

A single variable drives both the image's dependency layer (via a Dockerfile
build arg) and the strategy loaded at runtime, so the two cannot drift:

```bash
# .env
OCR_BACKEND=textract          # stub | tesseract | textract

docker compose up -d --build
curl -s localhost:8000/health # reports which backend is live
```

`/health` surfaces the active backend deliberately: a production deployment
left on `stub` would extract nothing while every task still reported `SUCCESS`.

### Why the interface is not `extract(bytes)`

Textract's API is asymmetric, and that asymmetry shaped the abstraction:

| Document | Textract call | Accepts |
| --- | --- | --- |
| Single image | `AnalyzeDocument` | inline bytes **or** an S3 object |
| Multi-page PDF/TIFF | `StartDocumentAnalysis` + polling | **S3 object only** |

Had backends been handed raw bytes, the second row would have been
unreachable, and the natural workaround — silently falling back to the
synchronous call — returns only the *first page* of every multi-page document.

So `SourceDocument` exposes both `read_bytes()` and `s3_location`, and each
strategy chooses. Tesseract rasterises bytes locally. Textract reads from S3
directly when it can, stages non-S3 paged documents into
`TEXTRACT_STAGING_BUCKET`, and — with no staging bucket configured — rejects
them with an explicit error rather than truncating them.

### Table extraction

With `TEXTRACT_EXTRACT_TABLES=true` (the default for that backend), Textract
runs on the `AnalyzeDocument` / `StartDocumentAnalysis` family with
`FeatureTypes=['TABLES']`. Cells are reconstructed from `CELL` blocks into a
dense, rectangular grid: merged cells place their text at the top-left
position and leave the covered cells empty, so consumers never handle spans.
Set it to `false` to fall back to the cheaper text-only API.

Tesseract has no table model and returns `tables: []`. Optional capabilities
degrade to empty rather than `null`, so callers never branch on which backend
produced a result.

```json
{
  "document_id": "INV-4471",
  "page_count": 1,
  "text": "INVOICE 4471",
  "mean_confidence": 0.956,
  "language": "eng",
  "tables": [
    {
      "page": 1,
      "row_count": 2,
      "column_count": 2,
      "mean_confidence": 0.95,
      "rows": [["Item", "Amount"], ["Widget Pro", "1250"]]
    }
  ]
}
```

### Adding a backend

1. Subclass `OCRBackend` in `app/ocr/yourvendor.py`, implementing `extract()`
   and, if it has dependencies or credentials, `check_ready()`.
2. Add one line to `BACKENDS` in `app/ocr/registry.py`.
3. Add any required Python package to the shared [requirements.txt](requirements.txt)
   so the image and the local environment stay in sync.

Nothing else changes — `app/tasks/ocr.py` never names a vendor. Two contracts
keep implementations interchangeable: normalise confidence to `0.0-1.0`, and
translate vendor exceptions into the shared taxonomy so retry behaviour does
not depend on which backend is active.

| Raise | Meaning | Celery |
| --- | --- | --- |
| `TransientAgentError` | throttling, 5xx, timeout | retried with backoff |
| `AgentError` | document will never parse | fails immediately |
| `BackendConfigurationError` | missing dependency or credentials | fails immediately |

Full detail in [docs/ocr-backends.md](docs/ocr-backends.md).

## Running it

Requires Docker. Redis and RabbitMQ both run with authentication and local
secrets, so generate them before the first startup:

```bash
python -c "import secrets,pathlib; pathlib.Path('secrets/redis_password').write_text(secrets.token_urlsafe(32))"
python -c "import pathlib; pathlib.Path('secrets/rabbitmq_password').write_text('guest\n')"
cp .env.example .env
docker compose up -d --build
```

The Docker stack now includes:

- Redis for task results and state
- RabbitMQ for the Celery broker
- API service
- OCR worker
- Compliance worker
- Anomaly worker
- Prometheus, Grafana, Redis exporter and cAdvisor (see [Monitoring](#monitoring))

```bash
curl -s localhost:8000/health

curl -s -X POST localhost:8000/documents \
  -H 'Content-Type: application/json' \
  -d '{"document_id":"INV-4471","source_uri":"file:///tmp/invoice.png","content_type":"image/png"}'

curl -s localhost:8000/tasks/<task_id>
```

Important: when running in Docker, the `file://` URI is resolved inside the
worker container, not on the host machine. If you send a path like
`file:///tmp/invoice.png`, the file must exist in the OCR worker container at
that exact path. A common mistake is creating the file on the host and expecting
it to appear inside the running Celery worker. The reliable pattern is to create
or mount the document into the worker container filesystem before submitting the
request.

Example:

```bash
docker compose exec -T worker_ocr python -c "from PIL import Image, ImageDraw; img = Image.new('RGB', (900, 400), 'white'); d = ImageDraw.Draw(img); d.text((90, 80), 'INVOICE 4471', fill='black'); img.save('/tmp/invoice.png')"

curl -s -X POST localhost:8000/documents \
  -H 'Content-Type: application/json' \
  -d '{"document_id":"INV-4471","source_uri":"file:///tmp/invoice.png","content_type":"image/png","agents":["ocr","compliance","anomaly"],"pipeline":true}'
```

Interactive API docs at `localhost:8000/docs`.

The project now includes a verified FastAPI layer in addition to the Celery worker stack. The API is the public entry point for the workflow engine: it accepts a document, enqueues the analysis, and exposes a single task id for polling. This layer is intentionally thin and delegates all orchestration to the Celery dispatch functions in `app/dispatch.py`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | liveness, broker reachability, active OCR backend |
| `POST` | `/documents` | accept a document, return a task id (202) |
| `GET` | `/tasks/{task_id}` | task state, and the merged result once ready |

`POST /documents` takes `agents` to select a subset, and `pipeline` to choose
the arrangement:

- `pipeline: true` (default) chains OCR ahead of the remaining agents, so they
  receive its output.
- `pipeline: false` runs every agent independently, each with no OCR input.

Both shapes end in aggregation, so the response shape is identical either way.
An unknown task id reports `PENDING` rather than 404 — Celery does not
distinguish "never existed" from "not started yet".

## Configuration

Every setting in `app/config.py` is overridable by an environment variable of
the same name, or by an entry in `.env`. See [.env.example](.env.example).

| Variable | Default | Notes |
| --- | --- | --- |
| `OCR_BACKEND` | `tesseract` | `stub`, `tesseract` or `textract` |
| `RABBITMQ_HOST` / `RABBITMQ_PORT` | `rabbitmq` / `5672` | Celery broker host and port |
| `RABBITMQ_USER` | `guest` | default broker login |
| `RABBITMQ_PASSWORD_FILE` | — | path to secret for broker auth |
| `REDIS_HOST` / `REDIS_PORT` | `redis` / `6379` | result backend host and port |
| `REDIS_PASSWORD_FILE` | — | path to mounted secret; preferred over `REDIS_PASSWORD` |
| `TASK_SOFT_TIME_LIMIT_S` | `240` | must exceed `TEXTRACT_MAX_POLL_S` |
| `TEXTRACT_EXTRACT_TABLES` | `true` | `false` uses the cheaper text-only API |
| `TEXTRACT_STAGING_BUCKET` | — | required for non-S3 multi-page documents |

The compose topology now sets `RABBITMQ_*` and `REDIS_*` in `docker-compose.yml`
under `environment:`, which takes precedence over `env_file:`. This prevents an
accidental stray `.env` value from redirecting a container to the wrong broker
or leaking a credential into `docker inspect`.

## Project status

The OCR agent is complete across all three backends. Compliance and anomaly
detection now return real schema-valid results via a lightweight LangGraph-style
workflow layer, with a plain-Python fallback so the service remains stable if the
optional graph dependency is unavailable.

The FastAPI layer is fully wired into the same dispatch model. It exposes the
main workflow endpoints for health checks, document submission, and async task
status polling, and those endpoints are covered by API-level regression tests.

The project now includes lightweight test coverage for both the workflow logic,
API surface, and RabbitMQ replay safety guard:

```bash
.venv\Scripts\python.exe -m pytest -q
```

This validates the engine remains stable after changes to the runtime stack,
worker setup, HTTP routing, and poison-pill replay protection. The Textract
backend's call paths are covered by tests against a faked boto3 client, but
have **not yet been exercised against live AWS**.

The Celery worker layer also includes a replay guard that inspects RabbitMQ's
`x-death` header and aborts the message when it exceeds the configured replay
limit. This prevents a message from looping endlessly through a dead-letter
queue path and helps keep poison messages out of the workflow pipeline.

## Layout

```
app/
  main.py         FastAPI app and routes
  dispatch.py     DocumentRequest -> Celery canvas; status reads
  celery_app.py   broker, per-agent routing, worker defaults
  config.py       settings
  models.py       request/response schemas
  sources.py      SourceDocument: URI resolution for file / http / s3
  errors.py       shared error taxonomy
  metrics.py      Prometheus metrics + Celery signal instrumentation
  ocr/            pluggable OCR strategies
  tasks/          one module per agent, plus aggregation
monitoring/
  prometheus/         Prometheus scrape configuration
  rabbitmq/           enabled_plugins (adds rabbitmq_prometheus)
  grafana/
    provisioning/     automatic datasource + dashboard provisioning
    dashboards/       multi-agent-engine.json (the Grafana dashboard)
docs/             design notes
secrets/          one file per secret (git-ignored)
```

## Monitoring

Prometheus + Grafana observability for the whole stack: FastAPI HTTP metrics,
custom application metrics, Celery worker metrics, RabbitMQ, Redis and
container metrics.

### Starting the complete stack

The Redis exporter needs a JSON map of Redis address → password (its image has
no shell, so it cannot read the raw secret file). Generate it once from the
same secret file the app uses:

```bash
python -c "import json, pathlib; json.dump({'redis://redis:6379/0': pathlib.Path('secrets/redis_password').read_text().strip()}, pathlib.Path('monitoring/redis/passwords.json').open('w'))"
```

The file is git-ignored. Then start everything:

```bash
docker compose up -d --build
```

This starts the application services **and** the monitoring stack
(`prometheus`, `grafana`, `redis-exporter`, `cadvisor`).

### URLs

| Service | URL |
| --- | --- |
| Frontend (Vite) | http://localhost:5173 |
| FastAPI | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |

Grafana login: `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` from your `.env`
(defaults `admin` / `admin`). Change them before exposing the stack anywhere
but your local machine.

### Metrics endpoint

`GET http://localhost:8000/metrics` exposes:

- HTTP metrics (`http_requests_total`, `http_request_duration_seconds`,
  `http_requests_inprogress`) via prometheus-fastapi-instrumentator
- Custom application metrics:
  - `mae_documents_submitted_total` / `mae_documents_processed_total` /
    `mae_documents_failed_total`
  - `mae_task_processing_seconds` (end-to-end dispatch-to-aggregate duration)
  - `mae_agent_tasks_total{agent="ocr|compliance|anomaly"}`

Labels are bounded to `agent`; task ids, document ids and source URIs are
**never** used as labels.

Worker metrics (`mae_worker_tasks_started_total`, `mae_worker_tasks_completed_total`,
`mae_worker_tasks_failed_total`, `mae_worker_task_duration_seconds`,
`mae_active_tasks`) are exported by each Celery prefork child on its own port
(`PROMETHEUS_METRICS_PORT` + child index, default `8001` → `8002`/`8003` for
`--concurrency=2`).

### How Prometheus discovers services

Prometheus runs inside the compose network, so scrape targets use **Docker
service names**, never `localhost` (see `monitoring/prometheus/prometheus.yml`):

| Job | Target | Metrics |
| --- | --- | --- |
| `fastapi` | `api:8000` | HTTP + application metrics |
| `celery-workers` | `worker_ocr:8002/8003`, `worker_compliance:8002/8003`, `worker_anomaly:8002/8003` | worker execution metrics |
| `rabbitmq` | `rabbitmq:15692` | official `rabbitmq_prometheus` plugin |
| `redis` | `redis-exporter:9121` | Redis exporter |
| `cadvisor` | `cadvisor:8080` | container CPU / memory / network |

If you change `--concurrency` in `docker-compose.yml`, update the
`celery-workers` targets to match (`8002..8002+concurrency` per worker).

### Accessing the dashboard

Grafana provisions Prometheus as the default datasource and the
"Multi-Agent Engine" dashboard automatically on startup — open
http://localhost:3000 and log in. The dashboard has six sections:
System Overview, Agent Overview, Queue Overview, Redis, Containers and
Application.

```bash
docker compose ps                      # all services running?
docker compose logs prometheus          # scrape / config errors
docker compose logs grafana            # provisioning / login errors
docker compose logs api                # API / metrics errors
```

### Troubleshooting common monitoring problems

- **Prometheus targets DOWN** — open http://localhost:9090/targets and check
  the error column. A target down usually means the underlying service is
  still starting (worker exporters bind on first task execution), or the
  target list drifted from `--concurrency` (see above).
- **No RabbitMQ metrics** — confirm the plugin is enabled:
  `docker compose exec rabbitmq rabbitmq-plugins list | grep prometheus`.
  The `monitoring/rabbitmq/enabled_plugins` file is mounted read-only; edit
  it and recreate the container to change plugins.
- **Grafana shows "datasource not found"** — check
  `docker compose logs grafana` for provisioning errors and confirm
  `monitoring/grafana/provisioning/datasources/prometheus.yml` is mounted.
- **Dashboard missing in Grafana** — the file provider watches
  `/var/lib/grafana/dashboards`; confirm the mount is intact and the JSON is
  valid. The dashboard reloads automatically within ~10s of a change.
- **Empty Redis panels / `redis_up 0`** — check
  `docker compose logs redis-exporter`. The exporter authenticates via
  `monitoring/redis/passwords.json`; if that file is stale or missing, regenerate
  it with the command above and run `docker compose up -d redis-exporter`.
- **`/monitoring/status` shows "unknown" workers** — the API could not reach
  the RabbitMQ management API on `rabbitmq:15672`; check the management
  plugin and `RABBITMQ_USER`/`RABBITMQ_PASSWORD_FILE`.
- **Container panels empty** — cAdvisor needs its host mounts and `privileged`
  mode; on Docker Desktop these work out of the box, but check
  `docker compose logs cadvisor` if panels stay empty.
