/**
 * Monitoring Service - Interface untuk monitoring endpoints backend
 * GET /api/v1/monitoring/gas-status/{agent_wallet}
 * GET /api/v1/monitoring/spawn-quota/{user_wallet}
 */

import { GCP_BACKEND_URL } from './cloudRunService'

export interface GasStatusResponse {
  agent_wallet: string
  chain_id: number
  native_symbol: string
  gas_balance_wei: string
  gas_balance_mnt: string
  status: 'healthy' | 'warning' | 'critical' | 'depleted'
  can_mint: boolean
  estimated_mints_remaining: number
  thresholds: {
    healthy: string
    warning: string
    critical: string
  }
}

export interface SpawnQuotaResponse {
  user_wallet: string
  chain_id: number
  spawned_count: number
  max_spawn_limit: number
  remaining_slots: number
  can_spawn: boolean
  agents: Array<{
    agent_wallet: string
    agent_name: string
    spawned_at: string
  }>
}

class MonitoringService {
  /**
   * Get gas status untuk agent wallet
   */
  async getAgentGasStatus(agentWallet: string, chainId = 5003): Promise<GasStatusResponse> {
    const response = await fetch(`${GCP_BACKEND_URL}/api/v1/monitoring/gas-status/${agentWallet}?chain_id=${chainId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch gas status: ${response.statusText}`)
    }
    
    return response.json()
  }

  /**
   * Get spawn quota untuk user wallet
   */
  async getSpawnQuota(userWallet: string, chainId = 5003): Promise<SpawnQuotaResponse> {
    const response = await fetch(`${GCP_BACKEND_URL}/api/v1/monitoring/spawn-quota/${userWallet}?chain_id=${chainId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch spawn quota: ${response.statusText}`)
    }
    
    return response.json()
  }

  /**
   * Helper: Check if gas balance is low (below warning threshold)
   */
  isGasLow(status: GasStatusResponse['status']): boolean {
    return status === 'warning' || status === 'critical' || status === 'depleted'
  }

  /**
   * Helper: Get status color for UI
   */
  getStatusColor(status: GasStatusResponse['status']): string {
    switch (status) {
      case 'healthy':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'critical':
        return 'text-orange-500'
      case 'depleted':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  /**
   * Helper: Get status label
   */
  getStatusLabel(status: GasStatusResponse['status']): string {
    switch (status) {
      case 'healthy':
        return 'Healthy'
      case 'warning':
        return 'Low Gas'
      case 'critical':
        return 'Critical'
      case 'depleted':
        return 'Depleted'
      default:
        return 'Unknown'
    }
  }
}

export const monitoringService = new MonitoringService()
