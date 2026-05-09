"""
Cloud Run startup wrapper.

If `import main` fails (ImportError, ValidationError, etc.), this wrapper:
  1. Prints a SHORT single-line summary → never truncated by Cloud Logging
  2. Prints the last 25 lines of the traceback → shows the actual cause
  3. Exits 1 so Cloud Run marks the revision as failed

On success, starts uvicorn programmatically (no shell expansion needed).
"""
import os
import sys


# Add /app/backend to Python path so we can import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))


def _fail(exc: BaseException) -> None:
    import traceback

    tb_lines = traceback.format_exc().splitlines()
    tail = "\n".join(tb_lines[max(0, len(tb_lines) - 25) :])

    # Single-line summary first — this is guaranteed to appear in Cloud Logging
    print(
        f"[MAEF STARTUP ERROR] {type(exc).__name__}: {exc}",
        file=sys.stderr,
        flush=True,
    )
    print(tail, file=sys.stderr, flush=True)
    sys.exit(1)


def main() -> None:
    # ── Step 1: validate all imports work before binding a port ──────────────
    try:
        from main import app  # noqa: F401 (imported for side-effects / validation)
    except Exception as exc:
        _fail(exc)

    # ── Step 2: start uvicorn ─────────────────────────────────────────────────
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        access_log=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
