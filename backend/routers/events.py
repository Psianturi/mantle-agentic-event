"""
POST /api/v1/event/attend  — Core agentic workflow.

Flow:
  A) Validate & sanitise event URL (SSRF guard)
  B) Gemini generates a Wisdom Summary from event metadata
  C) Backend signs & sends mintAttendanceNFT() to Mantle Sepolia
  D) Return tx hash + token ID + wisdom summary to frontend
"""

import logging
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from web3 import Web3

from core.config import settings
from services.llm_service import summarize_event
from services.web3_service import web3_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/event", tags=["events"])

# Allowlist mirrors the frontend's cloudRunService.ts validateEventUrl()
_ALLOWED_HOSTS: frozenset[str] = frozenset(
    {
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
        "lu.ma",
        "luma.com",
        "eventbrite.com",
        "www.eventbrite.com",
        "zoom.us",
    }
)

_MANTLE_EXPLORER_BY_CHAIN: dict[int, str] = {
    5003: "https://explorer.sepolia.mantle.xyz",
    5000: "https://explorer.mantle.xyz",
}


# ── Request / Response models ─────────────────────────────────────────────────


class AttendRequest(BaseModel):
    agent_id: str
    agent_wallet: str       # NFT recipient (agent's derived address or user's wallet)
    agent_name: str
    event_url: str
    event_title: str
    platform: str = "YouTube"
    niche: str = "General"

    @field_validator("agent_wallet")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        if not Web3.is_address(v):
            raise ValueError("Invalid Ethereum wallet address")
        return Web3.to_checksum_address(v)

    @field_validator("event_url")
    @classmethod
    def validate_event_url(cls, v: str) -> str:
        parsed = urlparse(v)
        if parsed.scheme != "https":
            raise ValueError("Event URL must use HTTPS")
        if parsed.hostname not in _ALLOWED_HOSTS:
            raise ValueError(
                f"Host '{parsed.hostname}' is not in the allowed event URL list"
            )
        return v


class AttendResponse(BaseModel):
    success: bool
    tx_hash: str | None
    token_id: str | None
    wisdom_summary: str
    gas_used: str | None
    block_number: int | None
    explorer_url: str | None
    level_up: bool


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.post("/attend", response_model=AttendResponse)
async def attend_event(req: AttendRequest) -> AttendResponse:
    """
    Autonomous event-attendance workflow.

    Step A — AI: Gemini generates a Wisdom Summary for the event.
    Step B — Web3: backend wallet signs mintAttendanceNFT() and broadcasts it.
    Step C — Return: tx hash, token ID, explorer link, and wisdom text.
    """
    # Guard: contract must be deployed before minting
    if not settings.contract_address or not Web3.is_address(settings.contract_address):
        raise HTTPException(
            status_code=503,
            detail=(
                "Smart contract is not configured. "
                "Deploy the contract and set CONTRACT_ADDRESS env var."
            ),
        )

    # ── Step A: Wisdom Summary ─────────────────────────────────────────────
    wisdom_summary = await summarize_event(
        event_title=req.event_title,
        event_url=req.event_url,
        platform=req.platform,
        agent_name=req.agent_name,
    )
    logger.info("Wisdom generated for agent %s: %.80s", req.agent_id, wisdom_summary)

    # ── Steps B + C: Mint on Mantle (Mode A: master key / MINTER_ROLE) ─────
    # Backend deployer wallet holds MINTER_ROLE and signs all mint txs.
    # NFT is minted TO the agent_wallet (agent keeps identity + ownership).
    # agent_private_key=None triggers fallback to AGENT_PRIVATE_KEY env var.
    try:
        mint_result = await web3_service.mint_attendance_nft(
            agent_wallet=req.agent_wallet,
            event_title=req.event_title,
            event_url=req.event_url,
            platform=req.platform,
            agent_name=req.agent_name,
            summary=wisdom_summary,
            niche=req.niche,
            agent_private_key=None,  # Mode A: master key (MINTER_ROLE) signs
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(
            status_code=503, detail=f"Mantle RPC unavailable: {exc}"
        )
    except Exception as exc:
        logger.error("mintAttendanceNFT failed for agent %s: %s", req.agent_id, exc)
        raise HTTPException(
            status_code=500,
            detail="NFT minting failed. Check Cloud Run logs for details.",
        )

    tx_hash = mint_result.get("tx_hash")
    success = mint_result.get("status") == "success"
    explorer_base = _MANTLE_EXPLORER_BY_CHAIN.get(
        settings.chain_id, "https://explorer.sepolia.mantle.xyz"
    )

    return AttendResponse(
        success=success,
        tx_hash=tx_hash,
        token_id=mint_result.get("token_id"),
        wisdom_summary=wisdom_summary,
        gas_used=mint_result.get("gas_used"),
        block_number=mint_result.get("block_number"),
        explorer_url=f"{explorer_base}/tx/{tx_hash}" if tx_hash else None,
        level_up=mint_result.get("level_up", False),
    )
