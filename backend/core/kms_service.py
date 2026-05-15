"""
GCP Cloud KMS — symmetric encryption for agent private keys.

Each agent's private key is encrypted before being stored in Firestore.
This ensures keys are never exposed in plaintext in the database.

GCP Setup (one-time):
  gcloud kms keyrings create maef-agents --location=asia-southeast1
  gcloud kms keys create agent-private-keys \\
    --location=asia-southeast1 --keyring=maef-agents --purpose=encryption

  # Grant Cloud Run SA encrypt+decrypt on this key
  gcloud kms keys add-iam-policy-binding agent-private-keys \\
    --location=asia-southeast1 --keyring=maef-agents \\
    --member=serviceAccount:<SA_EMAIL> \\
    --role=roles/cloudkms.cryptoKeyEncrypterDecrypter

  # Set Cloud Run env var:
  KMS_KEY_NAME=projects/agentic-event-factory/locations/asia-southeast1/keyRings/maef-agents/cryptoKeys/agent-private-keys

Dev mode (KMS_KEY_NAME not set):
  Private keys are stored as-is (plaintext) — acceptable for testnet only.
"""

import base64
import logging

logger = logging.getLogger(__name__)

_kms_client = None


def _get_kms_client():
    global _kms_client
    if _kms_client is None:
        from google.cloud import kms_v1  # lazy import
        _kms_client = kms_v1.KeyManagementServiceClient()
    return _kms_client


def _get_kms_key_name() -> str | None:
    from core.config import settings
    return settings.kms_key_name or None


def encrypt_private_key(private_key: str) -> str:
    """
    Encrypt a private key string with GCP KMS.
    Returns base64-encoded ciphertext string for Firestore storage.

    If KMS_KEY_NAME is not configured (local dev), returns plaintext
    with a warning. Never use this path in production/mainnet.
    """
    key_name = _get_kms_key_name()
    if not key_name:
        from core.config import settings
        if settings.environment == "production":
            raise RuntimeError(
                "KMS_KEY_NAME must be configured in production. "
                "Refusing to store agent private key as plaintext. "
                "Set KMS_KEY_NAME in Cloud Run environment variables."
            )
        logger.warning(
            "KMS_KEY_NAME not set — private key stored unencrypted. "
            "Set KMS_KEY_NAME before mainnet deployment."
        )
        return private_key

    try:
        client = _get_kms_client()
        response = client.encrypt(
            request={
                "name": key_name,
                "plaintext": private_key.encode("utf-8"),
            }
        )
        encrypted = base64.b64encode(response.ciphertext).decode("utf-8")
        logger.debug("Private key encrypted with KMS key %s", key_name.split("/")[-1])
        return encrypted
    except Exception as exc:
        logger.error("KMS encrypt failed: %s", exc)
        raise RuntimeError(f"KMS encryption failed: {exc}") from exc


def decrypt_private_key(stored_value: str) -> str:
    """
    Decrypt a stored private key value from Firestore.

    Handles three cases:
      1. KMS not configured (dev): treat as plaintext.
      2. Legacy plaintext key (starts with '0x'): return as-is with warning.
      3. KMS-encrypted (base64 ciphertext): decrypt and return.
    """
    key_name = _get_kms_key_name()

    # Dev mode — KMS not configured, value was never encrypted
    if not key_name:
        return stored_value

    # Legacy plaintext private key (agent spawned before KMS was enabled)
    if stored_value.startswith("0x"):
        logger.warning(
            "Found legacy plaintext private key in Firestore. "
            "Re-encrypt with KMS or rotate this agent's key."
        )
        return stored_value

    try:
        client = _get_kms_client()
        ciphertext = base64.b64decode(stored_value)
        response = client.decrypt(
            request={
                "name": key_name,
                "ciphertext": ciphertext,
            }
        )
        return response.plaintext.decode("utf-8")
    except Exception as exc:
        logger.error("KMS decrypt failed: %s", exc)
        raise RuntimeError(f"KMS decryption failed: {exc}") from exc
