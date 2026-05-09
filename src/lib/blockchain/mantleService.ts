import { ethers, BrowserProvider, Contract, TransactionReceipt } from 'ethers'
import { MANTLE_NETWORKS, DEFAULT_NETWORK, CONTRACT_ADDRESSES, GAS_LIMITS } from './config'
import { MAEF_NFT_ABI } from './abi'
import { ipfsService } from '@/lib/ipfs/ipfsService'

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

export interface MintNFTParams {
  agentWallet: string
  eventTitle: string
  eventUrl: string
  platform: string
  agentName: string
  summary: string
  niche?: string
}

export interface NFTMintResult {
  success: boolean
  tokenId?: string
  transactionHash?: string
  error?: string
  gasUsed?: string
}

export class MantleBlockchainService {
  private provider: BrowserProvider | null = null
  private signer: ethers.Signer | null = null
  private contract: Contract | null = null
  private currentNetwork = DEFAULT_NETWORK

  async connectWallet(): Promise<{ address: string; network: string }> {
    if (!window.ethereum) {
      throw new Error('MetaMask or compatible wallet not found. Please install a Web3 wallet.')
    }

    try {
      const provider = new BrowserProvider(window.ethereum)
      this.provider = provider

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.')
      }

      const address = accounts[0]

      await this.switchToMantleNetwork()

      this.signer = await provider.getSigner()
      this.initializeContract()

      const network = await provider.getNetwork()

      return {
        address,
        network: network.name || 'unknown'
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      throw error
    }
  }

  async switchToMantleNetwork(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('No wallet found')
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${this.currentNetwork.chainId.toString(16)}` }]
      })
    } catch (switchError: unknown) {
      const error = switchError as { code?: number }
      if (error.code === 4902) {
        await this.addMantleNetwork()
      } else {
        throw switchError
      }
    }
  }

  private async addMantleNetwork(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('No wallet found')
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${this.currentNetwork.chainId.toString(16)}`,
          chainName: this.currentNetwork.name,
          nativeCurrency: this.currentNetwork.nativeCurrency,
          rpcUrls: [this.currentNetwork.rpcUrl],
          blockExplorerUrls: [this.currentNetwork.blockExplorer]
        }
      ]
    })
  }

  private initializeContract(): void {
    if (!this.signer || !this.provider) {
      throw new Error('Signer not initialized')
    }

    // Dynamically pick contract address based on active network's chainId
    const chainId = this.currentNetwork.chainId
    let contractAddress: string
    if (chainId === MANTLE_NETWORKS.mainnet.chainId) {
      contractAddress = CONTRACT_ADDRESSES.mainnet.MAEF_NFT
    } else if (chainId === MANTLE_NETWORKS.sepolia.chainId) {
      contractAddress = CONTRACT_ADDRESSES.sepolia.MAEF_NFT
    } else {
      contractAddress = CONTRACT_ADDRESSES.sepolia.MAEF_NFT
    }

    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('Contract not deployed. Using mock mode.')
      return
    }

    this.contract = new Contract(contractAddress, MAEF_NFT_ABI, this.signer)
  }

  async mintNFT(params: MintNFTParams): Promise<NFTMintResult> {
    if (!this.contract) {
      return this.mockMintNFT(params)
    }

    try {
      const metadataURI = await this.uploadMetadataToIPFS(params)
      // Store metadataURI via setBaseMetadataURI after deploy, or pass via backend
      // ERC721A contract uses dynamic tokenURI based on agent level

      const tx = await this.contract.mintAttendanceNFT(
        params.agentWallet,
        params.eventTitle,
        params.eventUrl,
        params.platform,
        params.agentName,
        params.summary,
        params.niche || 'General',
        { gasLimit: GAS_LIMITS.MINT_NFT }
      )

      const receipt: TransactionReceipt = await tx.wait()

      const mintEvent = receipt.logs
        .map(log => {
          try {
            return this.contract?.interface.parseLog({
              topics: [...log.topics],
              data: log.data
            })
          } catch {
            return null
          }
        })
        .find(event => event?.name === 'NFTMinted')

      const tokenId = mintEvent?.args?.[0]?.toString() || '0'
      const gasUsed = receipt.gasUsed.toString()
      const gasPrice = receipt.gasPrice || BigInt(0)
      const gasCost = (Number(gasUsed) * Number(gasPrice)) / 1e18

      return {
        success: true,
        tokenId,
        transactionHash: receipt.hash,
        gasUsed: gasCost.toFixed(6)
      }
    } catch (error) {
      console.error('NFT minting error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private mockMintNFT(params: MintNFTParams): Promise<NFTMintResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const tokenId = Math.floor(Math.random() * 10000) + 1000
        const mockTxHash = `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`
        const gasUsed = (Math.random() * 0.005 + 0.008).toFixed(6)

        resolve({
          success: true,
          tokenId: tokenId.toString(),
          transactionHash: mockTxHash,
          gasUsed
        })
      }, 2000)
    })
  }

  private async uploadMetadataToIPFS(params: MintNFTParams): Promise<string> {
    if (!ipfsService.isInitialized()) {
      // Fallback to mock URI if IPFS not configured (dev mode)
      const mockHash = `Qm${Array.from({ length: 44 }, () =>
        '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[
          Math.floor(Math.random() * 58)
        ]
      ).join('')}`
      console.warn('IPFS not configured — using mock URI for dev mode')
      return `ipfs://${mockHash}`
    }

    const metadata = {
      name: `${params.eventTitle} - Proof of Attendance`,
      description: `${params.agentName} attended ${params.eventTitle} on ${params.platform}. ${params.summary}`,
      image: `https://placehold.co/600x600/1a1b3a/00f3ff?text=MAEF+POA&font=montserrat`,
      attributes: [
        { trait_type: 'Agent Name', value: params.agentName },
        { trait_type: 'Agent Wallet', value: params.agentWallet },
        { trait_type: 'Event Platform', value: params.platform },
        { trait_type: 'Event URL', value: params.eventUrl },
        { trait_type: 'Timestamp', value: Date.now() }
      ],
      summary: params.summary
    }

    const result = await ipfsService.uploadJSON(metadata)
    return `ipfs://${result.cid}`
  }

  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      return '0.0'
    }

    try {
      const balance = await this.provider.getBalance(address)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('Error fetching balance:', error)
      return '0.0'
    }
  }

  async estimateGas(params: MintNFTParams): Promise<string> {
    if (!this.contract) {
      const mockGas = (Math.random() * 0.005 + 0.008).toFixed(6)
      return mockGas
    }

    try {
      const metadataURI = 'ipfs://mock'
      const gasEstimate = await this.contract.mintAttendanceNFT.estimateGas(
        params.agentWallet,
        params.eventTitle,
        params.eventUrl,
        params.platform,
        params.agentName,
        params.summary,
        params.niche || 'General'
      )

      const gasPrice = await this.provider?.getFeeData()
      const gasCost =
        (Number(gasEstimate) * Number(gasPrice?.gasPrice || 0)) / 1e18

      return gasCost.toFixed(6)
    } catch (error) {
      console.error('Gas estimation error:', error)
      return '0.01'
    }
  }

  async getTotalMinted(): Promise<number> {
    if (!this.contract) {
      return 0
    }

    try {
      const total = await this.contract.getTotalMinted()
      return Number(total)
    } catch (error) {
      console.error('Error fetching total minted:', error)
      return 0
    }
  }

  async getAgentNFTs(agentWallet: string): Promise<string[]> {
    if (!this.contract) {
      return []
    }

    try {
      const tokenIds = await this.contract.getAgentTokenIds(agentWallet)
      return tokenIds.map((id: bigint) => id.toString())
    } catch (error) {
      console.error('Error fetching agent NFTs:', error)
      return []
    }
  }

  getExplorerUrl(txHash: string): string {
    return `${this.currentNetwork.blockExplorer}/tx/${txHash}`
  }

  getAddressExplorerUrl(address: string): string {
    return `${this.currentNetwork.blockExplorer}/address/${address}`
  }

  disconnect(): void {
    this.provider = null
    this.signer = null
    this.contract = null
  }
}

export const mantleService = new MantleBlockchainService()
