import { ethers, BrowserProvider, Contract, JsonRpcProvider, TransactionReceipt } from 'ethers'
import { GAS_LIMITS } from './config'
import { MAEF_NFT_ABI } from './abi'
import { ipfsService } from '@/lib/ipfs/ipfsService'
import { DEFAULT_CHAIN_ID, getChain } from './chains'

type EthProvider = {
  isMetaMask?: boolean
  isOKExWallet?: boolean
  isRabby?: boolean
  isBitKeep?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, callback: (...args: unknown[]) => void) => void
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthProvider
    okxwallet?: EthProvider      // OKX Wallet primary injection point
    bitkeep?: {                  // Bitget Wallet injection point
      ethereum?: EthProvider
    }
  }
}

export interface DetectedWallet {
  id: 'okx' | 'metamask' | 'rabby' | 'bitget' | 'injected'
  name: string
  provider: EthProvider
}

// Detects all EIP-1193 providers currently injected in the browser.
export function detectWallets(): DetectedWallet[] {
  const wallets: DetectedWallet[] = []
  if (typeof window === 'undefined') return wallets

  // OKX Wallet (priority injection point)
  if (window.okxwallet) {
    wallets.push({ id: 'okx', name: 'OKX Wallet', provider: window.okxwallet })
  }

  // Bitget Wallet (bitkeep.ethereum injection point)
  if (window.bitkeep?.ethereum) {
    wallets.push({ id: 'bitget', name: 'Bitget Wallet', provider: window.bitkeep.ethereum })
  }

  // Standard window.ethereum (MetaMask, Rabby, Coinbase, etc.)
  if (window.ethereum) {
    if (window.ethereum.isRabby) {
      wallets.push({ id: 'rabby', name: 'Rabby', provider: window.ethereum })
    } else if (window.ethereum.isMetaMask) {
      wallets.push({ id: 'metamask', name: 'MetaMask', provider: window.ethereum })
    } else {
      wallets.push({ id: 'injected', name: 'Browser Wallet', provider: window.ethereum })
    }
  }
  return wallets
}

// Falls back to best-available provider when no preferred one is set.
// Priority: OKX Wallet → Bitget Wallet → window.ethereum (MetaMask, Rabby, Coinbase, etc.)
function resolveProvider(): EthProvider | undefined {
  return window.okxwallet ?? window.bitkeep?.ethereum ?? window.ethereum
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

export interface SpawnAgentOnChainResult {
  success: boolean
  transactionHash?: string
  contractAddress?: string
  provisionAmount?: string
  error?: string
  gasUsed?: string
}

export interface TopUpGasResult {
  success: boolean
  transactionHash?: string
  amount?: string
  gasUsed?: string
  error?: string
}

export class MantleBlockchainService {
  private provider: BrowserProvider | null = null
  private signer: ethers.Signer | null = null
  private contract: Contract | null = null
  private currentChainId = DEFAULT_CHAIN_ID
  private preferredProvider: EthProvider | null = null

  // Called by WalletConnect picker before connectWallet() to set a specific provider.
  setPreferredProvider(provider: EthProvider | null): void {
    this.preferredProvider = provider
  }

  private getEthProvider(): EthProvider | undefined {
    return this.preferredProvider ?? resolveProvider()
  }

  private getChainConfig(chainId: number) {
    const chain = getChain(chainId)
    if (!chain) {
      throw new Error(`Unsupported network: ${chainId}`)
    }
    return chain
  }

  async connectWallet(chainId = DEFAULT_CHAIN_ID): Promise<{ address: string; network: string }> {
    const ethProvider = this.getEthProvider()
    if (!ethProvider) {
      throw new Error('No Web3 wallet found. Please install MetaMask, OKX Wallet, or another EVM-compatible wallet.')
    }

    try {
      const accounts = await ethProvider.request({
        method: 'eth_requestAccounts'
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.')
      }

      await this.activateChain(chainId)
      const address = await this.signer!.getAddress()
      const chain = this.getChainConfig(chainId)

      return {
        address,
        network: chain.name
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      throw error
    }
  }

  private async activateChain(chainId: number): Promise<void> {
    await this.switchToNetwork(chainId)
    const ethProvider = this.getEthProvider()
    if (!ethProvider) {
      throw new Error('No wallet found')
    }

    // A BrowserProvider is bound to the wallet's currently selected chain.
    this.provider = new BrowserProvider(ethProvider as any)
    this.signer = await this.provider.getSigner()
    this.currentChainId = chainId
    this.initializeContract()
  }

  async switchToNetwork(chainId = DEFAULT_CHAIN_ID): Promise<void> {
    const ethProvider = this.getEthProvider()
    if (!ethProvider) {
      throw new Error('No wallet found')
    }

    const chain = this.getChainConfig(chainId)

    try {
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chain.chainId.toString(16)}` }]
      })
    } catch (switchError: unknown) {
      const error = switchError as { code?: number }
      if (error.code === 4902) {
        await this.addNetwork(chainId)
      } else {
        throw switchError
      }
    }
  }

  private async addNetwork(chainId: number): Promise<void> {
    const ethProvider = this.getEthProvider()
    if (!ethProvider) {
      throw new Error('No wallet found')
    }

    const chain = this.getChainConfig(chainId)

    await ethProvider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${chain.chainId.toString(16)}`,
          chainName: chain.name,
          nativeCurrency: {
            name: chain.nativeSymbol,
            symbol: chain.nativeSymbol,
            decimals: 18,
          },
          rpcUrls: [chain.rpcUrl],
          blockExplorerUrls: [chain.explorerUrl]
        }
      ]
    })
  }

  private initializeContract(): void {
    if (!this.signer || !this.provider) {
      throw new Error('Signer not initialized')
    }

    const contractAddress = this.getChainConfig(this.currentChainId).contractAddress

    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('Contract not deployed. Using mock mode.')
      return
    }

    this.contract = new Contract(contractAddress, MAEF_NFT_ABI, this.signer)
  }

  getContractAddress(chainId = this.currentChainId): string {
    return this.getChainConfig(chainId).contractAddress
  }

  async spawnAgent(agentWallet: string, chainId = this.currentChainId): Promise<SpawnAgentOnChainResult> {
    await this.activateChain(chainId)
    if (!this.contract) {
      return {
        success: false,
        error: 'Contract is not initialized. Check wallet connection and VITE_NFT_CONTRACT_ADDRESS_SEPOLIA.'
      }
    }

    try {
      const tx = await this.contract.spawnAgent(agentWallet, {
        value: ethers.parseEther('1'),
      })

      const receipt: TransactionReceipt = await tx.wait()
      const gasUsed = receipt.gasUsed.toString()
      const gasPrice = receipt.gasPrice || BigInt(0)
      const gasCost = (Number(gasUsed) * Number(gasPrice)) / 1e18

      return {
        success: true,
        transactionHash: receipt.hash,
        contractAddress: this.getContractAddress(chainId),
        provisionAmount: '0.5',
        gasUsed: gasCost.toFixed(6)
      }
    } catch (error) {
      console.error('Agent spawn transaction error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async topUpAgentGas(agentWallet: string, amount: number, chainId = this.currentChainId): Promise<TopUpGasResult> {
    await this.activateChain(chainId)
    if (!this.signer || !this.provider) {
      return {
        success: false,
        error: 'Wallet signer is not initialized. Please reconnect your wallet.'
      }
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        error: 'Top-up amount must be greater than zero.'
      }
    }

    try {
      const tx = await this.signer.sendTransaction({
        to: agentWallet,
        value: ethers.parseEther(amount.toString()),
      })

      const receipt = await tx.wait()
      if (!receipt) {
        throw new Error('Transaction receipt not available')
      }
      const gasUsed = receipt.gasUsed.toString()
      const gasPrice = receipt.gasPrice || BigInt(0)
      const gasCost = (Number(gasUsed) * Number(gasPrice)) / 1e18

      return {
        success: true,
        transactionHash: receipt.hash,
        amount: amount.toFixed(4),
        gasUsed: gasCost.toFixed(6),
      }
    } catch (error) {
      console.error('Agent gas top-up transaction error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown top-up error occurred'
      }
    }
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

  async getBalance(address: string, chainId = this.currentChainId): Promise<string> {
    try {
      const chain = this.getChainConfig(chainId)
      const provider = new JsonRpcProvider(chain.rpcUrl)
      const balance = await provider.getBalance(address)
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

  getExplorerUrl(txHash: string, chainId = this.currentChainId): string {
    return `${this.getChainConfig(chainId).explorerUrl}/tx/${txHash}`
  }

  getAddressExplorerUrl(address: string, chainId = this.currentChainId): string {
    return `${this.getChainConfig(chainId).explorerUrl}/address/${address}`
  }

  disconnect(): void {
    this.provider = null
    this.signer = null
    this.contract = null
    this.preferredProvider = null
  }
}

export const mantleService = new MantleBlockchainService()
