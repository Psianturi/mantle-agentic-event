"""
Web3 service: connects to Mantle Sepolia and mints NFTs via MAEFDynamicNFT.

The backend's AGENT_WALLET (stored in Secret Manager as AGENT_PRIVATE_KEY) holds
MINTER_ROLE on the contract.  The `agentWallet` parameter is the NFT *recipient*
address (user's MetaMask or the agent's derived address).
"""

import asyncio
import logging
from typing import Any

from eth_account import Account
from web3 import Web3

from core.config import settings
from core.secrets import get_agent_private_key, get_mantle_rpc_url

logger = logging.getLogger(__name__)

# ── Minimal ABI (only what backend needs to call) ─────────────────────────────
MAEF_ABI: list[dict] = [
    {
        "inputs": [
            {"internalType": "address", "name": "agentWallet", "type": "address"},
            {"internalType": "string", "name": "eventTitle", "type": "string"},
            {"internalType": "string", "name": "eventUrl", "type": "string"},
            {"internalType": "string", "name": "platform", "type": "string"},
            {"internalType": "string", "name": "agentName", "type": "string"},
            {"internalType": "string", "name": "summary", "type": "string"},
            {"internalType": "string", "name": "niche", "type": "string"},
        ],
        "name": "mintAttendanceNFT",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getTotalMinted",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "agentWallet", "type": "address"},
            {"indexed": False, "internalType": "string", "name": "eventTitle", "type": "string"},
            {"indexed": False, "internalType": "string", "name": "agentName", "type": "string"},
            {"indexed": False, "internalType": "uint256", "name": "agentLevel", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
        ],
        "name": "NFTMinted",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "agentWallet", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "newLevel", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "totalEvents", "type": "uint256"},
        ],
        "name": "AgentLevelUp",
        "type": "event",
    },
]


class Web3Service:
    def __init__(self) -> None:
        self._w3: Web3 | None = None
        self._contract: Any = None

    # ── Connection helpers ────────────────────────────────────────────────────

    def _init_w3(self) -> Web3:
        if self._w3 and self._w3.is_connected():
            return self._w3

        rpc_url = get_mantle_rpc_url()
        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 30}))
        # Mantle is OP Stack (L2) — does not need PoA middleware

        if not w3.is_connected():
            raise ConnectionError(f"Cannot connect to Mantle RPC: {rpc_url}")

        self._w3 = w3
        return w3

    def _init_contract(self) -> Any:
        if self._contract:
            return self._contract

        w3 = self._init_w3()
        addr = settings.contract_address
        if not addr or not Web3.is_address(addr):
            raise ValueError(
                "CONTRACT_ADDRESS env var is not set or is invalid. "
                "Deploy the contract first and set the env var."
            )

        self._contract = w3.eth.contract(
            address=Web3.to_checksum_address(addr),
            abi=MAEF_ABI,
        )
        return self._contract

    # ── Public async interface ────────────────────────────────────────────────

    async def mint_attendance_nft(
        self,
        agent_wallet: str,
        event_title: str,
        event_url: str,
        platform: str,
        agent_name: str,
        summary: str,
        niche: str = "General",
        agent_private_key: str | None = None,  # Agent's own key for autonomy
    ) -> dict[str, Any]:
        """
        Signs and broadcasts mintAttendanceNFT to Mantle.
        
        If agent_private_key is provided, the agent signs its own transaction
        (true agentic autonomy). Otherwise, falls back to backend master key.
        
        Runs the blocking web3 call in a thread executor so FastAPI stays non-blocking.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._sync_mint,
            agent_wallet, event_title, event_url, platform, agent_name, summary, niche, agent_private_key,
        )

    async def get_total_minted(self) -> int:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_total_minted)

    # ── Synchronous implementations (run in thread pool) ─────────────────────

    def _sync_mint(
        self,
        agent_wallet: str,
        event_title: str,
        event_url: str,
        platform: str,
        agent_name: str,
        summary: str,
        niche: str,
        agent_private_key: str | None = None,
    ) -> dict[str, Any]:
        w3 = self._init_w3()
        contract = self._init_contract()
        
        # Use agent's own key if provided (agentic autonomy)
        # Otherwise fall back to backend master key (MINTER_ROLE)
        if agent_private_key:
            private_key = agent_private_key
            logger.info("Agent signing its own transaction (autonomous mode)")
        else:
            private_key = get_agent_private_key()  # Backend master key
            logger.info("Backend signing transaction (MINTER_ROLE mode)")
        
        signer = Account.from_key(private_key)
        signer_address = signer.address

        recipient = Web3.to_checksum_address(agent_wallet)
        nonce = w3.eth.get_transaction_count(signer_address, "pending")
        gas_price = w3.eth.gas_price

        fn_call = contract.functions.mintAttendanceNFT(
            recipient, event_title, event_url, platform, agent_name, summary, niche
        )

        try:
            gas_estimate = fn_call.estimate_gas({"from": signer_address})
            gas_limit = int(gas_estimate * 1.2)  # 20 % buffer
        except Exception as exc:
            logger.warning("Gas estimation failed, using default 300 000: %s", exc)
            gas_limit = 300_000

        raw_tx = fn_call.build_transaction(
            {
                "chainId": settings.chain_id,
                "from": signer_address,
                "nonce": nonce,
                "gas": gas_limit,
                "gasPrice": gas_price,
            }
        )

        signed = w3.eth.account.sign_transaction(raw_tx, private_key=private_key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        # Extract tokenId from NFTMinted event log
        token_id: int | None = None
        level_up: bool = False
        try:
            mint_logs = contract.events.NFTMinted().process_receipt(receipt)
            if mint_logs:
                token_id = int(mint_logs[0]["args"]["tokenId"])
            level_logs = contract.events.AgentLevelUp().process_receipt(receipt)
            level_up = len(level_logs) > 0
        except Exception as exc:
            logger.warning("Could not parse event logs: %s", exc)

        return {
            "tx_hash": tx_hash.hex(),
            "token_id": str(token_id) if token_id is not None else None,
            "gas_used": str(receipt["gasUsed"]),
            "block_number": receipt["blockNumber"],
            "status": "success" if receipt["status"] == 1 else "failed",
            "level_up": level_up,
        }

    def _sync_total_minted(self) -> int:
        contract = self._init_contract()
        return int(contract.functions.getTotalMinted().call())


# Singleton — re-used across all requests
web3_service = Web3Service()
