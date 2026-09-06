# syntax=docker/dockerfile:1

# 3.13 rather than the 3.14 in .venv: broader prebuilt-wheel coverage for the
# native dependencies pulled in by uvicorn[standard].
FROM python:3.13-slim

# Which OCR strategy this image is built for. Selects both the system packages
# and the optional Python dependency layer, and is the runtime default. Keep it
# in step with the OCR_BACKEND environment variable.
ARG OCR_BACKEND=stub

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    OCR_BACKEND=${OCR_BACKEND}

WORKDIR /srv

# System packages for the selected backend only: tesseract adds ~150-200MB, so
# a textract or stub image should not carry it.
RUN set -eux; \
    if [ "$OCR_BACKEND" = "tesseract" ]; then \
        apt-get update; \
        apt-get install -y --no-install-recommends tesseract-ocr poppler-utils; \
        rm -rf /var/lib/apt/lists/*; \
    fi

# Dependencies before application code, so editing app/ does not invalidate the
# (slow) install layers.
COPY requirements.txt requirements-tesseract.txt requirements-textract.txt ./
RUN set -eux; \
    pip install -r requirements.txt; \
    if [ -f "requirements-$OCR_BACKEND.txt" ]; then \
        pip install -r "requirements-$OCR_BACKEND.txt"; \
    fi

# Celery refuses to run its worker as root without an explicit override, and
# neither service needs to write into the image.
RUN useradd --create-home --uid 10001 appuser
COPY --chown=appuser:appuser app ./app
USER appuser

EXPOSE 8000

# Overridden per-service in docker-compose.yml.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
