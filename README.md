# Multi-Agent Engine

Asynchronous document analysis. A FastAPI dispatch layer accepts documents and
fans them out to independent agents — OCR, compliance and anomaly detection —
running as Celery tasks on dedicated queues, with Redis as broker and result
backend.

```
POST /documents  ->  ocr ──┐
                           ├─> compliance ──┐
                           └─> anomaly ─────┴─> aggregate ─> GET /tasks/{id}
```

Each agent has its own queue and its own worker pool, so an OCR backlog cannot
starve compliance or anomaly work. Every dispatch terminates in a single
aggregation task, which is what lets callers poll one task id regardless of how
the work was arranged internally.

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
3. If it needs extra packages, add `requirements-yourvendor.txt`; the
   Dockerfile installs `requirements-$OCR_BACKEND.txt` when present.

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

Requires Docker. Redis runs with authentication, so generate its secret first —
it is git-ignored and absent from a fresh clone:

```bash
python -c "import secrets,pathlib; pathlib.Path('secrets/redis_password').write_text(secrets.token_urlsafe(32))"
cp .env.example .env
docker compose up -d --build
```

```bash
curl -s localhost:8000/health

curl -s -X POST localhost:8000/documents \
  -H 'Content-Type: application/json' \
  -d '{"document_id":"INV-4471","source_uri":"file:///tmp/invoice.png","content_type":"image/png"}'

curl -s localhost:8000/tasks/<task_id>
```

Interactive API docs at `localhost:8000/docs`.

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
| `REDIS_HOST` / `REDIS_PORT` | `redis` / `6379` | pinned by compose |
| `REDIS_PASSWORD_FILE` | — | path to a mounted secret; preferred over `REDIS_PASSWORD` |
| `TASK_SOFT_TIME_LIMIT_S` | `240` | must exceed `TEXTRACT_MAX_POLL_S` |
| `TEXTRACT_EXTRACT_TABLES` | `true` | `false` uses the cheaper text-only API |
| `TEXTRACT_STAGING_BUCKET` | — | required for non-S3 multi-page documents |

`REDIS_HOST`, `REDIS_PORT` and `REDIS_PASSWORD_FILE` are set in
`docker-compose.yml` under `environment:`, which takes precedence over
`env_file:`. A stray value in `.env` therefore cannot point a container at the
wrong broker or leak a credential into `docker inspect`.

## Project status

The OCR agent is complete across all three backends. **Compliance and anomaly
detection are still stubs** — they return schema-valid empty results and log a
warning, so the pipeline is exercisable end to end while their logic is built.

The Textract backend's call paths are covered by tests against a faked boto3
client, but have **not yet been exercised against live AWS**.

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
  ocr/            pluggable OCR strategies
  tasks/          one module per agent, plus aggregation
docs/             design notes
secrets/          one file per secret (git-ignored)
```
