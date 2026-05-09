# ── Stage 1: dependency install ────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: lean runtime image ────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy backend source (main.py, core/, routers/, services/)
COPY backend/ .

# Cloud Run injects $PORT at runtime (default 8080)
ENV PORT=8080
EXPOSE 8080

# Shell form required so ${PORT} is expanded at runtime
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
