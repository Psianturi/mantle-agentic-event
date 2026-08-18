import { useState, useCallback } from 'react'
import { mantleService, MintNFTParams, NFTMintResult } from '@/lib/blockchain/mantleService'

export interface BlockchainState {
  isConnected: boolean
  address: string | null
  network: string | null
  isConnecting: boolean
  balance: string
  error: string | null
}

export function useBlockchain() {
  const [state, setState] = useState<BlockchainState>({
    isConnected: false,
    address: null,
    network: null,
    isConnecting: false,
    balance: '0.0',
    error: null
  })

  const connectWallet = useCallback(async (chainId?: number) => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const { address, network } = await mantleService.connectWallet(chainId)
      const balance = await mantleService.getBalance(address, chainId)

      setState({
        isConnected: true,
        address,
        network,
        isConnecting: false,
        balance,
        error: null
      })

      return address
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet'
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage
      }))
      throw error
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    mantleService.disconnect()
    setState({
      isConnected: false,
      address: null,
      network: null,
      isConnecting: false,
      balance: '0.0',
      error: null
    })
  }, [])

  const mintNFT = useCallback(
    async (params: MintNFTParams): Promise<NFTMintResult> => {
      if (!state.isConnected) {
        throw new Error('Wallet not connected')
      }

      return await mantleService.mintNFT(params)
    },
    [state.isConnected]
  )

  const estimateGas = useCallback(
    async (params: MintNFTParams): Promise<string> => {
      return await mantleService.estimateGas(params)
    },
    []
  )

  const refreshBalance = useCallback(async (chainId?: number) => {
    if (state.address) {
      const balance = await mantleService.getBalance(state.address, chainId)
      setState(prev => ({ ...prev, balance }))
      return balance
    }
    return '0.0'
  }, [state.address])

  const getExplorerUrl = useCallback((txHash: string, chainId?: number) => {
    return mantleService.getExplorerUrl(txHash, chainId)
  }, [])

  const getAddressExplorerUrl = useCallback((address: string, chainId?: number) => {
    return mantleService.getAddressExplorerUrl(address, chainId)
  }, [])

  const getBalance = useCallback(async (address: string, chainId?: number): Promise<string> => {
    return mantleService.getBalance(address, chainId)
  }, [])

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    mintNFT,
    estimateGas,
    refreshBalance,
    getExplorerUrl,
    getAddressExplorerUrl,
    getBalance,
  }
}
