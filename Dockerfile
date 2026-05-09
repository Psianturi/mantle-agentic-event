# ── Stage 1: install dependencies into an isolated venv ───────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ── Stage 2: lean runtime image ────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Copy the entire venv (interpreter + site-packages) — paths stay consistent
COPY --from=builder /venv /venv

# Copy backend source (main.py, core/, routers/, services/)
COPY backend/ .

# Cloud Run injects $PORT at runtime (default 8080)
ENV PORT=8080
EXPOSE 8080

# Use venv's uvicorn directly; shell form so ${PORT} expands at runtime
CMD ["/bin/sh", "-c", "/venv/bin/uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
