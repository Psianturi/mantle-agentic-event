import { getChain, getSupportedChains, DEFAULT_CHAIN_ID } from './chains'

export type VerificationStatus = 'pending' | 'verifying' | 'verified' | 'failed' | 'already-verified'

export interface ContractVerificationData {
  contractAddress: string
  agentId: string
  agentName: string
  deploymentTxHash: string
  /** Chain this contract lives on. Optional for entries persisted before multichain. */
  chainId?: number
  verificationStatus: VerificationStatus
  verificationTimestamp?: number
  explorerUrl: string
  sourceCode?: string
  compilerVersion?: string
  optimization?: boolean
  runs?: number
  constructorArguments?: string
  verificationAttempts: number
  lastAttemptTimestamp?: number
  errorMessage?: string
}

export interface VerificationCheckResult {
  isVerified: boolean
  status: VerificationStatus
  guid?: string
  result?: string
  message?: string
  compilerVersion?: string
  sourceCode?: string
}

export interface ExplorerAPIResponse {
  status: string
  message: string
  result: string | Record<string, unknown>
}

class ContractVerificationService {
  private readonly POLL_INTERVAL = 5000
  private readonly MAX_ATTEMPTS = 20
  private verificationCache: Map<string, ContractVerificationData> = new Map()
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Explorer base for a specific chain. chains.ts is the single source of
   * truth — never fall back to a Mantle-only default, or ETH Sepolia
   * contracts get polled against Mantle's explorer and always fail.
   */
  private explorerBase(chainId: number = DEFAULT_CHAIN_ID): string {
    return getChain(chainId)?.explorerUrl ?? getChain(DEFAULT_CHAIN_ID)!.explorerUrl
  }

  /**
   * True if the address is the deployed ASAJU contract on any supported chain.
   * Reads chains.ts (the live config the rest of the app uses) rather than the
   * env-driven constants in config.ts, which may be unset or point at an
   * orphaned deployment.
   */
  isKnownMAEFContract(contractAddress: string): boolean {
    const normalized = contractAddress.toLowerCase()
    return getSupportedChains().some(
      chain => chain.contractAddress.toLowerCase() === normalized
    )
  }

  async checkVerificationStatus(contractAddress: string, chainId: number = DEFAULT_CHAIN_ID): Promise<VerificationCheckResult> {
    if (this.isKnownMAEFContract(contractAddress)) {
      return {
        isVerified: true,
        status: 'verified',
        message: 'Known ASAJU contract address. Open explorer for canonical verification.'
      }
    }

    try {
      const apiUrl = `${this.explorerBase(chainId)}/api?module=contract&action=getsourcecode&address=${contractAddress}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        const safeStatus = response.statusText.replace(/[\r\n]/g, ' ')
        console.warn('Explorer API request failed:', safeStatus)
        return {
          isVerified: false,
          status: 'pending',
          message: 'Explorer API unavailable'
        }
      }

      const data: ExplorerAPIResponse = await response.json()

      if (data.status === '1' && Array.isArray(data.result) && data.result.length > 0) {
        const contractInfo = data.result[0] as {
          SourceCode: string
          ContractName: string
          CompilerVersion: string
          OptimizationUsed: string
          Runs: string
          ConstructorArguments: string
          ABI: string
        }

        if (contractInfo.SourceCode && contractInfo.SourceCode !== '') {
          return {
            isVerified: true,
            status: 'verified',
            sourceCode: contractInfo.SourceCode,
            compilerVersion: contractInfo.CompilerVersion,
            message: 'Contract verified successfully'
          }
        }
      }

      return {
        isVerified: false,
        status: 'pending',
        message: 'Contract not yet verified'
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
      if (this.isKnownMAEFContract(contractAddress)) {
        return {
          isVerified: true,
          status: 'verified',
          message: 'Known MAEF contract address. Explorer API unavailable from browser.'
        }
      }

      return {
        isVerified: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async submitVerification(
    contractAddress: string,
    sourceCode: string,
    compilerVersion: string,
    constructorArgs: string = '',
    optimizationEnabled: boolean = true,
    runs: number = 200,
    chainId: number = DEFAULT_CHAIN_ID
  ): Promise<{ success: boolean; guid?: string; error?: string }> {
    try {
      const apiUrl = `${this.explorerBase(chainId)}/api`
      
      const formData = new FormData()
      formData.append('module', 'contract')
      formData.append('action', 'verifysourcecode')
      formData.append('contractaddress', contractAddress)
      formData.append('sourceCode', sourceCode)
      formData.append('codeformat', 'solidity-single-file')
      formData.append('contractname', 'MAEFNFT')
      formData.append('compilerversion', compilerVersion)
      formData.append('optimizationUsed', optimizationEnabled ? '1' : '0')
      formData.append('runs', runs.toString())
      
      if (constructorArgs) {
        formData.append('constructorArguments', constructorArgs)
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        return {
          success: false,
          error: 'Explorer API request failed'
        }
      }

      const data: ExplorerAPIResponse = await response.json()

      if (data.status === '1') {
        return {
          success: true,
          guid: data.result as string
        }
      }

      return {
        success: false,
        error: data.result as string || 'Verification submission failed'
      }
    } catch (error) {
      console.error('Error submitting verification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async checkVerificationResult(guid: string, chainId: number = DEFAULT_CHAIN_ID): Promise<VerificationCheckResult> {
    try {
      const apiUrl = `${this.explorerBase(chainId)}/api?module=contract&action=checkverifystatus&guid=${guid}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        return {
          isVerified: false,
          status: 'verifying',
          message: 'API request failed'
        }
      }

      const data: ExplorerAPIResponse = await response.json()

      if (data.status === '1') {
        if (data.result === 'Pass - Verified' || data.result === 'Already Verified') {
          return {
            isVerified: true,
            status: 'verified',
            result: data.result as string,
            message: 'Contract verified successfully'
          }
        }
      }

      if (data.status === '0') {
        if ((data.result as string).includes('Pending')) {
          return {
            isVerified: false,
            status: 'verifying',
            message: 'Verification in progress'
          }
        }
        
        return {
          isVerified: false,
          status: 'failed',
          message: data.result as string
        }
      }

      return {
        isVerified: false,
        status: 'verifying',
        message: 'Verification in progress'
      }
    } catch (error) {
      console.error('Error checking verification result:', error)
      return {
        isVerified: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async trackContractVerification(
    contractAddress: string,
    agentId: string,
    agentName: string,
    deploymentTxHash: string,
    onStatusUpdate?: (data: ContractVerificationData) => void,
    chainId: number = DEFAULT_CHAIN_ID
  ): Promise<void> {
    const verificationData: ContractVerificationData = {
      contractAddress,
      agentId,
      agentName,
      deploymentTxHash,
      chainId,
      verificationStatus: 'pending',
      explorerUrl: `${this.explorerBase(chainId)}/address/${contractAddress}`,
      verificationAttempts: 0
    }

    this.verificationCache.set(contractAddress, verificationData)

    if (this.pollingIntervals.has(contractAddress)) {
      clearInterval(this.pollingIntervals.get(contractAddress)!)
    }

    let attempts = 0
    
    const pollStatus = async () => {
      attempts++
      verificationData.verificationAttempts = attempts
      verificationData.lastAttemptTimestamp = Date.now()

      const result = await this.checkVerificationStatus(contractAddress, chainId)

      if (result.isVerified) {
        verificationData.verificationStatus = 'verified'
        verificationData.verificationTimestamp = Date.now()
        verificationData.sourceCode = result.sourceCode
        verificationData.compilerVersion = result.compilerVersion
        
        this.verificationCache.set(contractAddress, verificationData)
        
        if (onStatusUpdate) {
          onStatusUpdate(verificationData)
        }

        const interval = this.pollingIntervals.get(contractAddress)
        if (interval) {
          clearInterval(interval)
          this.pollingIntervals.delete(contractAddress)
        }
        
        return
      }

      if (attempts >= this.MAX_ATTEMPTS) {
        verificationData.verificationStatus = 'failed'
        verificationData.errorMessage = 'Max verification attempts reached. Please verify manually.'
        
        this.verificationCache.set(contractAddress, verificationData)
        
        if (onStatusUpdate) {
          onStatusUpdate(verificationData)
        }

        const interval = this.pollingIntervals.get(contractAddress)
        if (interval) {
          clearInterval(interval)
          this.pollingIntervals.delete(contractAddress)
        }
        
        return
      }

      if (result.status === 'failed') {
        verificationData.verificationStatus = 'failed'
        verificationData.errorMessage = result.message
        
        this.verificationCache.set(contractAddress, verificationData)
        
        if (onStatusUpdate) {
          onStatusUpdate(verificationData)
        }

        const interval = this.pollingIntervals.get(contractAddress)
        if (interval) {
          clearInterval(interval)
          this.pollingIntervals.delete(contractAddress)
        }
        
        return
      }

      verificationData.verificationStatus = 'verifying'
      this.verificationCache.set(contractAddress, verificationData)
      
      if (onStatusUpdate) {
        onStatusUpdate(verificationData)
      }
    }

    await pollStatus()

    const interval = setInterval(pollStatus, this.POLL_INTERVAL)
    this.pollingIntervals.set(contractAddress, interval)
  }

  getVerificationData(contractAddress: string): ContractVerificationData | undefined {
    return this.verificationCache.get(contractAddress)
  }

  getAllVerifications(): ContractVerificationData[] {
    return Array.from(this.verificationCache.values())
  }

  stopTracking(contractAddress: string): void {
    const interval = this.pollingIntervals.get(contractAddress)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(contractAddress)
    }
  }

  stopAllTracking(): void {
    this.pollingIntervals.forEach(interval => clearInterval(interval))
    this.pollingIntervals.clear()
  }

  clearCache(): void {
    this.stopAllTracking()
    this.verificationCache.clear()
  }

  getExplorerContractUrl(contractAddress: string, chainId: number = DEFAULT_CHAIN_ID): string {
    return `${this.explorerBase(chainId)}/address/${contractAddress}`
  }

  getExplorerTxUrl(txHash: string, chainId: number = DEFAULT_CHAIN_ID): string {
    return `${this.explorerBase(chainId)}/tx/${txHash}`
  }

  /**
   * Heal verification entries persisted before this was chain-aware: entries
   * for a contract that IS the live ASAJU contract on some chain were being
   * polled against the wrong explorer and stuck at "failed". Re-resolve their
   * status and explorer URL against the correct chain.
   */
  reconcilePersisted(entries: ContractVerificationData[]): ContractVerificationData[] {
    return entries.map(entry => {
      const chain = getSupportedChains().find(
        c => c.contractAddress.toLowerCase() === entry.contractAddress.toLowerCase()
      )
      if (!chain) return entry
      return {
        ...entry,
        chainId: chain.chainId,
        verificationStatus: 'verified' as VerificationStatus,
        errorMessage: undefined,
        explorerUrl: `${chain.explorerUrl}/address/${entry.contractAddress}`,
      }
    })
  }
}

export const verificationService = new ContractVerificationService()
