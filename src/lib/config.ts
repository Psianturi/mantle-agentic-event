export const config = {
  backend: {
    url: import.meta.env.VITE_GCP_BACKEND_URL || 'https://agentic-event-factory.run.app',
    projectId: import.meta.env.VITE_GCP_PROJECT_ID || 'agentic-event-factory',
    timeout: 55000,
    pollingInterval: 3000,
    maxPollAttempts: 200,
  },
  
  mantle: {
    rpcUrl: import.meta.env.VITE_MANTLE_NETWORK_RPC || 'https://rpc.mantle.xyz',
    chainId: parseInt(import.meta.env.VITE_MANTLE_CHAIN_ID || '5000'),
    explorerUrl: 'https://explorer.mantle.xyz',
    networkName: 'Mantle Network',
  },

  features: {
    useMockData: import.meta.env.DEV && !import.meta.env.VITE_GCP_BACKEND_URL,
    enablePolling: true,
    enableWisdomGeneration: true,
    maxEventsForWisdom: 5,
  },

  ui: {
    toastDuration: 4000,
    animationDuration: 300,
    pollingIndicatorDelay: 1000,
  },
} as const

export type AppConfig = typeof config

export function isBackendAvailable(): boolean {
  return !!import.meta.env.VITE_GCP_BACKEND_URL
}

export function isDevelopment(): boolean {
  return import.meta.env.DEV
}

export function isProduction(): boolean {
  return import.meta.env.PROD
}
