# ── Stage 1: install dependencies into an isolated venv ───────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Download Playwright Chromium browser into a fixed path
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN /venv/bin/playwright install chromium \
 && /venv/bin/playwright install-deps chromium

# ── Stage 2: lean runtime image ────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Chromium system dependencies (required for headless Playwright on Cloud Run)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 \
    libcairo-gobject2 libcups2 libdbus-1-3 libatspi2.0-0 libxss1 \
    fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

# Copy the entire venv (interpreter + site-packages) — paths stay consistent
COPY --from=builder /venv /venv

# Copy Playwright Chromium browser from builder
COPY --from=builder /ms-playwright /ms-playwright

# Copy backend source (main.py, core/, routers/, services/)
COPY backend/ .

# Cloud Run injects $PORT at runtime (default 8080)
ENV PORT=8080
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
EXPOSE 8080

# Use entrypoint.py: catches ImportErrors and logs them concisely before exiting
CMD ["/venv/bin/python", "-u", "entrypoint.py"]
