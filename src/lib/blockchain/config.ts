export const MANTLE_NETWORKS = {
  mainnet: {
    chainId: 5000,
    name: 'Mantle',
    rpcUrl: 'https://rpc.mantle.xyz',
    blockExplorer: 'https://explorer.mantle.xyz',
    nativeCurrency: {
      name: 'MNT',
      symbol: 'MNT',
      decimals: 18
    }
  },
  testnet: {
    chainId: 5001,
    name: 'Mantle Testnet',
    rpcUrl: 'https://rpc.testnet.mantle.xyz',
    blockExplorer: 'https://explorer.testnet.mantle.xyz',
    nativeCurrency: {
      name: 'MNT',
      symbol: 'MNT',
      decimals: 18
    }
  },
  sepolia: {
    chainId: 5003,
    name: 'Mantle Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    blockExplorer: 'https://explorer.sepolia.mantle.xyz',
    nativeCurrency: {
      name: 'MNT',
      symbol: 'MNT',
      decimals: 18
    }
  }
}

export const DEFAULT_NETWORK = MANTLE_NETWORKS.sepolia

export const CONTRACT_ADDRESSES = {
  mainnet: {
    MAEF_NFT: '0x0000000000000000000000000000000000000000'
  },
  testnet: {
    MAEF_NFT: '0x0000000000000000000000000000000000000000'
  },
  sepolia: {
    MAEF_NFT: '0x0000000000000000000000000000000000000000'
  }
}

export const GAS_LIMITS = {
  MINT_NFT: 300000,
  TRANSFER: 100000
}
