# OCR backends

Text extraction is a **strategy**: the ocr agent depends on the abstract
`OCRBackend`, never on a vendor. Moving from local development to production
Textract is a configuration change plus a rebuild, not a code change.

```
app/tasks/ocr.py          the agent: builds a SourceDocument, calls the backend
        |
        v
app/ocr/__init__.py       get_ocr_backend() -> OCRBackend
app/ocr/registry.py       name -> "module:Class", imported lazily
app/ocr/base.py           OCRBackend (ABC) + OCRExtraction (result)
        |
        +-- stub.py       default; extracts nothing, zero dependencies
        +-- tesseract.py  local; needs tesseract-ocr + poppler-utils
        +-- textract.py   AWS; needs boto3 + credentials
```

## Switching backend

`OCR_BACKEND` drives both the image's dependency layer (via the Dockerfile
build arg) and the strategy loaded at runtime, so one value keeps them in step:

```bash
# .env
OCR_BACKEND=tesseract      # stub | tesseract | textract

docker compose up -d --build
curl -s localhost:8000/health   # confirms which backend is live
```

`/health` reports `ocr_backend` deliberately: a production deployment left on
`stub` would extract nothing while every task still reported SUCCESS.

## Why the interface is not `extract(bytes)`

Textract has two paths, and which applies is a property of the document:

| Document | Textract API | Accepts |
| --- | --- | --- |
| Single image | `DetectDocumentText` | inline bytes **or** an S3 object |
| Multi-page PDF/TIFF | `StartDocumentTextDetection` + polling | **S3 object only** |

Had backends been handed raw bytes, that second row would have been
impossible, and the likely workaround — falling back to the sync API — would
silently return only the first page of every multi-page document.

So `SourceDocument` exposes both `read_bytes()` and `s3_location`, and each
strategy chooses. Tesseract always rasterises bytes; Textract reads from S3
when it can, and stages non-S3 paged documents into
`TEXTRACT_STAGING_BUCKET`. With no staging bucket configured, such a document
is **rejected with a clear error** rather than silently truncated.

## Adding a backend

1. Subclass `OCRBackend` in `app/ocr/yourvendor.py`, implementing `extract()`
   and — if it has dependencies or credentials — `check_ready()`.
2. Add one line to `BACKENDS` in `app/ocr/registry.py`.
3. Add any required Python package to the shared `requirements.txt` so local
   development and the Docker image stay aligned.

Nothing else changes. Two contracts make implementations interchangeable:

- **Normalise confidence to 0.0-1.0.** Both Tesseract and Textract report
  0-100; use `self.normalise_confidence()`. `OCRExtraction` rejects
  out-of-range values in `__post_init__` rather than letting a bad scale reach
  the API.
- **Translate vendor exceptions into `app.errors`.** Retry behaviour must not
  depend on which backend is active:

| Raise | Meaning | Celery |
| --- | --- | --- |
| `TransientAgentError` | throttling, 5xx, timeout | retried with backoff |
| `AgentError` | document will never parse | fails immediately |
| `BackendConfigurationError` | missing dependency or credentials | fails immediately |

Only `TransientAgentError` is in `autoretry_for`, so a malformed document or a
misconfigured worker fails fast instead of burning the retry budget.

## Backend notes

**tesseract** — rasterises PDFs at `TESSERACT_DPI` via poppler, then runs
`image_to_data` per page. Words Tesseract could not score (`conf == -1`) are
excluded from the mean rather than averaged in as zeros. A pytesseract timeout
is treated as transient.

**textract** — `TEXTRACT_MAX_POLL_S` (180s) must stay below
`TASK_SOFT_TIME_LIMIT_S` (240s), or Celery kills the task mid-poll and the
retry never happens. Result pagination (`NextToken`) is followed to the end.
`PARTIAL_SUCCESS` returns the pages that worked and logs a warning.
