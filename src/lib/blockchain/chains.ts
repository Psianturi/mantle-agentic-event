/**
 * MAEF Supported Chains — single source of truth.
 * Add new chains here; frontend + backend both reference this config.
 */

export interface ChainConfig {
  chainId: number
  name: string
  shortName: string
  nativeSymbol: string
  rpcUrl: string
  explorerUrl: string
  contractAddress: string
  spawnFee: string        // in native token units — sent as tx value AND must match the
                          // deployed contract's spawnFee() (see setFees() in MAEFNFTV4.sol)
  color: string           // brand color for UI badges
  testnet: boolean
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // ── Active ────────────────────────────────────────────────────────────────
  5003: {
    chainId: 5003,
    name: 'Mantle Sepolia',
    shortName: 'Mantle',
    nativeSymbol: 'MNT',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorerUrl: 'https://explorer.sepolia.mantle.xyz',
    contractAddress: '0x66fD8b5411856D42c08D9356e879a6e7dF0c9419',
    spawnFee: '1',
    color: '#00F3FF',
    testnet: true,
  },
  11155111: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    shortName: 'Ethereum',
    nativeSymbol: 'ETH',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    contractAddress: '0x9FEF11E45cFD550b33F13A31E8d80BE61cda80f4',  // redeployed 16 Aug 2026 — fee-configurable V4
    spawnFee: '0.02',   // sized for typical Sepolia faucet drips; see setFees() in deploy-new-chain.js
    color: '#8B5CF6',
    testnet: true,
  },
}

export const DEFAULT_CHAIN_ID = 5003

export function getChain(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId]
}

export function getSupportedChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS)
}
