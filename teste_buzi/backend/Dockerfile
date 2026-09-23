# ── build stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS base

WORKDIR /app

# System deps for PyPDF2, python-docx, passlib
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── runtime ───────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy installed packages from build stage
COPY --from=base /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=base /usr/local/bin /usr/local/bin

# Application code
COPY . .

# Create uploads dir & ensure it persists via volume
RUN mkdir -p /app/uploads

EXPOSE 8000

# Seed DB on first run, then start Uvicorn
CMD ["sh", "-c", "mkdir -p /data/uploads && python seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
