"""
Firestore async client — lazy singleton per process.

Cloud Run automatically authenticates via the attached Service Account
(no explicit credentials needed in production).
In local development, set GOOGLE_APPLICATION_CREDENTIALS to a service
account key JSON file that has "Cloud Datastore User" role.
"""

import logging

from google.cloud import firestore

logger = logging.getLogger(__name__)

_db: firestore.AsyncClient | None = None


def get_db() -> firestore.AsyncClient:
    """Return the Firestore async client, initialising it on first call."""
    global _db
    if _db is None:
        try:
            _db = firestore.AsyncClient()
            logger.info("Firestore async client initialised")
        except Exception as exc:
            logger.error("Failed to initialise Firestore client: %s", exc)
            raise
    return _db
