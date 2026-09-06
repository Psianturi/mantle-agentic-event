import { useState, useEffect, useCallback, startTransition } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { Agent, NFT, TerminalLog, Event, SubAgentType, AgentProposal, MarketplaceAgent } from '@/lib/types'
import { getMockAgents, getMockNFTs, getMockEvents, getMockProposals, getMockMarketplaceAgents } from '@/lib/mockData'
import { cn } from '@/lib/utils'
import { buildScoutedOpportunities } from '@/lib/scoutUtils'
import { AnalyticsView } from '@/views/AnalyticsView'
import { VaultView } from '@/views/VaultView'
import { MarketplaceView } from '@/views/MarketplaceView'
import { AgentCard } from '@/components/AgentCard'
import { AttendEventCard } from '@/components/AttendEventCard'
import { NeuralFusionLab } from '@/components/NeuralFusionLab'
import { GasPriceMonitor } from '@/components/GasPriceMonitor'
import { NFTCard } from '@/components/NFTCard'
import { SpawnAgentDialog } from '@/components/SpawnAgentDialog'
import { TerminalConsole } from '@/components/TerminalConsole'
import { WalletConnect } from '@/components/WalletConnect'
import { WisdomReportDialog } from '@/components/WisdomReportDialog'
import { AgentConfigDialog } from '@/components/AgentConfigDialog'
import { AgentChatDialog } from '@/components/AgentChatDialog'
import { NFTMetadataDialog } from '@/components/NFTMetadataDialog'
import { BatchIPFSUploadDialog } from '@/components/BatchIPFSUploadDialog'
import { DataFlowBackground } from '@/components/DataFlowBackground'
import { BackendHealthModal } from '@/components/BackendHealthModal'
import { ArchitectureFlow } from '@/components/ArchitectureFlow'
import { SubAgentDelegation } from '@/components/SubAgentDelegation'
import { FeaturedWisdomFeed, type WisdomFeedItem } from '@/components/FeaturedWisdomFeed'
import { ContractDeploymentProgress } from '@/components/ContractDeploymentProgress'
import { ContractVerificationTracker } from '@/components/ContractVerificationTracker'
import { AgentEvolutionDialog } from '@/components/AgentEvolutionDialog'
import { PendingProposals } from '@/components/PendingProposals'
import { TransactionSignatureModal } from '@/components/TransactionSignatureModal'
import { TopUpGasDialog } from '@/components/TopUpGasDialog'
import { GenesisMintConfirmation } from '@/components/GenesisMintConfirmation'
import { SecurityAuditLog } from '@/components/SecurityAuditLog'
import { GlobalSecurityAuditLog } from '@/components/GlobalSecurityAuditLog'
import { AgentBreedingDialog } from '@/components/AgentBreedingDialog'
import { ProactiveScoutingPanel } from '@/components/ProactiveScoutingPanel'
import { ProposalModal } from '@/components/ProposalModal'
import { Robot, Wallet as WalletIcon, ChartLine, Globe, Plus, Brain, CloudArrowUp, FlowArrow, ShieldCheck, ShieldWarning, Storefront, Newspaper, Binoculars, House } from '@phosphor-icons/react'
import maefLogo from '@/assets/maef-logo.png'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useBlockchain } from '@/hooks/useBlockchain'
import { ipfsService } from '@/lib/ipfs/ipfsService'
import { useSubAgentTasks } from '@/hooks/useSubAgentTasks'
import { CloudRunAPIError, cloudRunService, validateEventUrl } from '@/services/cloudRunService'
import { ContractVerificationData, verificationService } from '@/lib/blockchain/verificationService'
import { CONTRACT_ADDRESSES } from '@/lib/blockchain/config'
import { mantleService } from '@/lib/blockchain/mantleService'
import { ChainSelector } from '@/components/ChainSelector'
import { NetworkMismatchAlert } from '@/components/NetworkMismatchAlert'
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/blockchain/chains'
import { useNavigate } from 'react-router-dom'

const simulationMessages = [
  { type: 'secretary', messages: ['Scanning Luma events...', 'Registering for DeFi Summit 2026...', 'Checking Eventbrite for new conferences...', 'Joining Web3 Workshop...'] },
  { type: 'scribe', messages: ['Transcribing YouTube podcast...', 'Extracting key insights from video...', 'Analyzing speaker sentiment...', 'Processing audio content...'] },
  { type: 'social-lite', messages: ['Monitoring Telegram channel...', 'Checking Discord notifications...', 'Analyzing community sentiment...', 'Engaging with community members...'] },
  { type: 'mint-master', messages: ['Estimating Mantle gas fees...', 'Optimizing transaction parameters...', 'Preparing NFT metadata...', 'Calculating optimal mint timing...'] }
]

function App() {
  const navigate = useNavigate()
  type PendingAttendContext = {
    agentId: string
    eventUrl: string
  }

  const [agents, setAgents] = useState<Agent[]>([])
  const [nfts, setNFTs] = useState<NFT[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [mockAgents, setMockAgents] = useState<Agent[]>(() => getMockAgents())
  const [mockNFTs, setMockNFTs] = useState<NFT[]>(() => getMockNFTs())
  const [mockEvents, setMockEvents] = useState<Event[]>(() => getMockEvents())
  const [mockProposals, setMockProposals] = useState<AgentProposal[]>(() => getMockProposals())
  const [logs, setLogs] = useState<TerminalLog[]>([])
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>()
  const [selectedChainId, setSelectedChainId] = useState(DEFAULT_CHAIN_ID)
  const [walletChainId, setWalletChainId] = useState<number | undefined>()
  type MainView = 'dashboard' | 'analytics' | 'vault' | 'marketplace'
  const HASH_TO_VIEW: Record<string, MainView> = { analytics: 'analytics', 'nft-vault': 'vault', marketplace: 'marketplace' }
  const VIEW_TO_HASH: Record<MainView, string> = { dashboard: '', analytics: 'analytics', vault: 'nft-vault', marketplace: 'marketplace' }
  const [mainView, setMainView] = useState<MainView>(() => {
    const hashView = HASH_TO_VIEW[window.location.hash.slice(1)]
    if (hashView) return hashView
    return 'dashboard'
  })
  useEffect(() => {
    const hash = VIEW_TO_HASH[mainView]
    if (hash) {
      window.location.hash = hash
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [mainView])

  // Auto-reconnect on page load if any EIP-1193 wallet is already authorized.
  const WALLET_SESSION_KEY = 'maef-wallet-session-at'
  const WALLET_LAST_ACTIVITY_KEY = 'maef-wallet-last-activity'
  const WALLET_SESSION_TTL = 20 * 60 * 60 * 1000 // 20 hours max session
  const WALLET_IDLE_TIMEOUT = 5 * 60 * 60 * 1000 // 5 hours idle timeout

  // Activity tracker: updates last activity timestamp to reset idle timeout
  const updateActivity = () => {
    if (walletConnected) {
      localStorage.setItem(WALLET_LAST_ACTIVITY_KEY, Date.now().toString())
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const eth = window.okxwallet ?? window.ethereum
    if (!eth) return
    eth.request({ method: 'eth_accounts' })
      .then(async (accounts) => {
        if ((accounts as string[]).length === 0) return
        const savedAt = parseInt(localStorage.getItem(WALLET_SESSION_KEY) || '0')
        const lastActivity = parseInt(localStorage.getItem(WALLET_LAST_ACTIVITY_KEY) || '0')
        const now = Date.now()

        // Check both TTL and idle timeout
        const sessionExpired = now - savedAt >= WALLET_SESSION_TTL
        const idleExpired = now - lastActivity >= WALLET_IDLE_TIMEOUT

        if (sessionExpired || idleExpired) {
          localStorage.removeItem(WALLET_SESSION_KEY)
          localStorage.removeItem(WALLET_LAST_ACTIVITY_KEY)
        } else {
          // Silent reconnect on page load: activate whatever chain the wallet
          // is already on, instead of forcing it back to DEFAULT_CHAIN_ID.
          let detectedChainId: number | undefined
          try {
            const chainHex = (await eth.request({ method: 'eth_chainId' })) as string
            const parsed = parseInt(chainHex, 16)
            if (getChain(parsed)) detectedChainId = parsed
          } catch { /* fall back to default */ }
          handleWalletConnect('', detectedChainId)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // React to wallet account switches or lock events across all supported wallets.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const eth = window.okxwallet ?? window.ethereum
    if (!eth) return
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as unknown[]
      if (accounts.length === 0) {
        handleWalletDisconnect()
      } else if ((accounts[0] as string)?.toLowerCase() !== walletAddress?.toLowerCase()) {
        handleWalletConnect('')
      }
    }
    eth.on('accountsChanged', onAccountsChanged)
    return () => eth.removeListener('accountsChanged', onAccountsChanged)
  }, [walletAddress]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen to chainChanged events - auto-sync when user switches network in wallet
  useEffect(() => {
    if (typeof window === 'undefined' || !walletConnected) return
    const eth = window.okxwallet ?? window.ethereum
    if (!eth) return
    
    const onChainChanged = (...args: unknown[]) => {
      const chainIdHex = args[0] as string
      const newChainId = parseInt(chainIdHex, 16)
      setWalletChainId(newChainId)
      setSelectedChainId(newChainId)
      const chain = getChain(newChainId)
      if (chain) {
        toast.info(`Network changed to ${chain.name}`)
      } else {
        toast.warning(`Switched to unsupported chain ${newChainId}`)
      }
    }
    
    eth.on('chainChanged', onChainChanged)
    return () => eth.removeListener('chainChanged', onChainChanged)
  }, [walletConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  const [lastSocialPost, setLastSocialPost] = useState<{ agentId: string; text: string; eventTitle: string } | null>(null)

  const [featuredWisdom, setFeaturedWisdom] = useState<WisdomFeedItem[]>([])
  const [featuredWisdomLoading, setFeaturedWisdomLoading] = useState(false)
  const blockchain = useBlockchain()
  const [useMockData, setUseMockData] = useState(false)

  useEffect(() => {
    if (!useMockData) {
      return
    }

    const interval = setInterval(() => {
      if (agents && agents.length > 0) {
        const activeAgents = agents.filter(a => a.status !== 'idle')
        const targetAgent = activeAgents.length > 0 
          ? activeAgents[Math.floor(Math.random() * activeAgents.length)]
          : agents[Math.floor(Math.random() * agents.length)]
        
        const randomSubAgentType = simulationMessages[Math.floor(Math.random() * simulationMessages.length)]
        const randomMessage = randomSubAgentType.messages[Math.floor(Math.random() * randomSubAgentType.messages.length)]
        
        const agentName = targetAgent.name
        const formattedMessage = `[${agentName} - ${randomSubAgentType.type}] ${randomMessage}`
        
        const newLog: TerminalLog = {
          id: `sim-log-${Date.now()}-${Math.random()}`,
          agentId: targetAgent.id,
          subAgentType: randomSubAgentType.type as SubAgentType,
          message: formattedMessage,
          timestamp: Date.now(),
          type: Math.random() > 0.85 ? 'success' : 'info'
        }
        
        setLogs((current) => {
          const newLogs = [...current, newLog]
          return newLogs.slice(-50)
        })
      }
    }, 2500 + Math.random() * 2000)
    
    return () => clearInterval(interval)
  }, [agents, useMockData])
  
  const [spawnDialogOpen, setSpawnDialogOpen] = useState(false)
  const [wisdomDialogOpen, setWisdomDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [chatDialogOpen, setChatDialogOpen] = useState(false)
  const [nftMetadataDialogOpen, setNFTMetadataDialogOpen] = useState(false)
  const [batchIPFSDialogOpen, setBatchIPFSDialogOpen] = useState(false)
  const [evolutionDialogOpen, setEvolutionDialogOpen] = useState(false)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<AgentProposal | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null)
  const [eventUrl, setEventUrl] = useState('')
  const [isProcessingEvent, setIsProcessingEvent] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [healthCheckOpen, setHealthCheckOpen] = useState(false) // no auto-popup
  const [backendConnected, setBackendConnected] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'live' | 'error'>('checking')
  const [deployingAgentId, setDeployingAgentId] = useState<string | null>(null)
  const [verificationData, setVerificationData] = useLocalStorage<ContractVerificationData[]>('maef-verifications', [])
  const [activeVerifications, setActiveVerifications] = useState<Set<string>>(new Set())

  // Entries persisted before verification was chain-aware got stuck at "failed"
  // (polled against Mantle's explorer regardless of the agent's actual chain).
  useEffect(() => {
    setVerificationData((current) => {
      if (!current?.length) return current ?? []
      const healed = verificationService.reconcilePersisted(current)
      const changed = healed.some((h, i) => h.verificationStatus !== current[i].verificationStatus)
      return changed ? healed : current
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [proposals, setProposals] = useLocalStorage<AgentProposal[]>('maef-proposals', [])
  const [userBalance, setUserBalance] = useLocalStorage<number>('maef-user-balance', 45.50)
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false)
  const [genesisMintDialogOpen, setGenesisMintDialogOpen] = useState(false)
  const [selectedAgentForTopUp, setSelectedAgentForTopUp] = useState<Agent | null>(null)
  const [pendingAttendContext, setPendingAttendContext] = useState<PendingAttendContext | null>(null)
  const [marketplaceAgents, setMarketplaceAgents] = useLocalStorage<MarketplaceAgent[]>('maef-marketplace', getMockMarketplaceAgents())
  const [purchasingAgentId, setPurchasingAgentId] = useState<string | null>(null)
  const [breedingDialogOpen, setBreedingDialogOpen] = useState(false)
  const [proposalModalAgent, setProposalModalAgent] = useState<Agent | null>(null)
  const [proposalCounts, setProposalCounts] = useState<Record<string, number>>({})
  const handleProposalCountChange = useCallback((agentId: string, count: number) => {
    setProposalCounts(prev => ({ ...prev, [agentId]: count }))
  }, [])
  const [platformMetrics, setPlatformMetrics] = useState<{ total_agents: number; total_wisdom_nfts: number; total_events_attended: number; average_agent_level: number } | null>(null)
  useEffect(() => {
    cloudRunService.getPublicMetrics()
      .then(data => setPlatformMetrics(data))
      .catch(() => {})
  }, [])

  
  const { tasks, startWorkflow, clearTasks } = useSubAgentTasks(activeAgentId, isProcessingEvent)
  const [replenishMap, setReplenishMap] = useLocalStorage<Record<string, boolean>>('maef-auto-replenish', {})
  const displayedAgents = (useMockData ? mockAgents : (agents ?? [])).map(a => ({
    ...a,
    autoReplenishGas: replenishMap?.[a.id] ?? a.autoReplenishGas ?? false
  }))
  const displayedNFTs = useMockData ? mockNFTs : (nfts ?? [])
  const displayedEvents = useMockData ? mockEvents : (events ?? [])
  const displayedProposals = useMockData ? mockProposals : (proposals ?? [])

  const handleHealthConfirmed = () => {
    setBackendConnected(true)
    setBackendStatus('live')
  }

  // Silent background health check on mount — no blocking popup
  useEffect(() => {
    cloudRunService.healthCheck()
      .then(() => {
        setBackendConnected(true)
        setBackendStatus('live')
      })
      .catch(() => {
        setBackendStatus('error')
      })
  }, [])

  // Fetch featured wisdom on mount for Dashboard social proof
  useEffect(() => {
    setFeaturedWisdomLoading(true)
    cloudRunService.getPublicFeaturedWisdom()
      .then(data => setFeaturedWisdom(data))
      .catch(() => setFeaturedWisdom([]))
      .finally(() => setFeaturedWisdomLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Secret hotkey: press M three times within 1s to toggle mock mode
  useEffect(() => {
    let presses = 0
    let timer: ReturnType<typeof setTimeout>
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'M' && e.shiftKey && !e.ctrlKey && !e.altKey) {
        presses++
        clearTimeout(timer)
        if (presses >= 3) {
          presses = 0
          setUseMockData(m => {
            const next = !m
            toast(next ? '🔧 Mock mode ON' : '🌐 Live mode ON', { duration: 2000 })
            return next
          })
        } else {
          timer = setTimeout(() => { presses = 0 }, 1000)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); clearTimeout(timer) }
  }, [])

  const handleSwitchNetwork = async () => {
    const eth = (window as any).okxwallet ?? (window as any).ethereum
    if (!eth?.request) {
      toast.error('No wallet detected')
      return
    }

    const targetChain = getChain(selectedChainId)
    if (!targetChain) return

    try {
      // Try to switch to the target chain
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${selectedChainId.toString(16)}` }],
      })
      setWalletChainId(selectedChainId)
      toast.success(`Switched to ${targetChain.name}`)
    } catch (switchError: any) {
      // Error 4902: chain not added to wallet yet
      if (switchError.code === 4902) {
        try {
          // Add the chain first, then switch
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChain.chainId.toString(16)}`,
              chainName: targetChain.name,
              nativeCurrency: {
                name: targetChain.nativeSymbol,
                symbol: targetChain.nativeSymbol,
                decimals: 18,
              },
              rpcUrls: [targetChain.rpcUrl],
              blockExplorerUrls: [targetChain.explorerUrl],
            }],
          })
          setWalletChainId(selectedChainId)
          toast.success(`Added and switched to ${targetChain.name}`)
        } catch (addError: any) {
          console.error('Failed to add chain:', addError)
          toast.error('Failed to add network', { 
            description: addError.message || 'Add manually in wallet settings.' 
          })
        }
      } else if (switchError.code === 4001) {
        // User rejected the request
        toast.info('Network switch cancelled')
      } else {
        // Other error
        console.error('Switch network error:', switchError)
        toast.error('Failed to switch network', { 
          description: switchError.message || 'Try manually in your wallet.' 
        })
      }
    }
  }

  // chainIdOverride is used by the silent auto-reconnect effect to connect to
  // whatever chain the wallet is already on. Manual connect clicks omit it,
  // so they keep using selectedChainId (the user's ChainSelector choice).
  const handleWalletConnect = async (address: string, chainIdOverride?: number) => {
    try {
      const initialChainId = chainIdOverride ?? selectedChainId
      const connectedAddress = await blockchain.connectWallet(initialChainId)
      setWalletConnected(true)
      setWalletAddress(connectedAddress)
      // Detect wallet's current chain
      try {
        const eth = (window as any).okxwallet ?? (window as any).ethereum
        const chainHex: string = await eth.request({ method: 'eth_chainId' })
        const detectedChainId = parseInt(chainHex, 16)
        setWalletChainId(detectedChainId)
        setSelectedChainId(detectedChainId)
      } catch { /* non-fatal */ }
      const now = Date.now().toString()
      localStorage.setItem(WALLET_SESSION_KEY, now)
      localStorage.setItem(WALLET_LAST_ACTIVITY_KEY, now)
      // Clear any previous wallet's data before loading new wallet's data
      setAgents([])
      setEvents([])
      setNFTs([])
      setLogs([])
      toast.success('Wallet connected successfully!', {
        description: `Connected to ${getChain(selectedChainId)?.name ?? 'the selected network'}`
      })
      // Load cloud state persisted in Firestore for this wallet
      const cloudAgents = await cloudRunService.getAgentsByWallet(connectedAddress)
      setBackendConnected(true)  // getAgentsByWallet success = backend is reachable
      const cloudHistory = await cloudRunService.getEventHistoryByWallet(connectedAddress)

      const restoredEvents: Event[] = cloudHistory.map((item) => ({
        id: item.id,
        agentId: item.agentId,
        chainId: item.chainId,
        url: item.eventUrl,
        title: item.eventTitle,
        platform: normalizePlatform(item.platform),
        date: item.attendedAt > 0 ? item.attendedAt * 1000 : Date.now(),
        summary: item.wisdomSummary,
        status: deriveEventStatus(
          normalizePlatform(item.platform),
          item.lumaStatus,
          item.lumaStartAt,
        ),
        lumaStartAt: item.lumaStartAt,
      }))

      const restoredNFTs: NFT[] = cloudHistory
        .filter((item) => item.txHash)
        .map((item) => ({
          id: `nft-${item.id}`,
          agentId: item.agentId,
          chainId: item.chainId,
          eventId: item.id,
          eventTitle: item.eventTitle,
          summary: item.wisdomSummary,
          date: item.attendedAt > 0 ? item.attendedAt * 1000 : Date.now(),
          transactionHash: item.txHash,
          tokenId: item.tokenId || '?',
          explorerUrl: item.explorerUrl,
          imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT',
        }))

      setEvents(restoredEvents)
      setNFTs(restoredNFTs)

      // Seed Mission Control terminal with real event history from backend
      if (cloudHistory.length > 0) {
        const agentNameMap: Record<string, string> = {}
        for (const a of cloudAgents) agentNameMap[a.id] = a.name
        const recent = [...cloudHistory]
          .sort((a, b) => b.attendedAt - a.attendedAt)
          .slice(0, 15)
          .reverse()
        const historyLogs: TerminalLog[] = []
        for (const item of recent) {
          const agentName = agentNameMap[item.agentId] || 'Agent'
          const ts = item.attendedAt > 0 ? item.attendedAt * 1000 : Date.now()
          historyLogs.push({
            id: `hist-sec-${item.id}`,
            agentId: item.agentId,
            subAgentType: 'secretary' as SubAgentType,
            message: `[${agentName} - Secretary] Attended: "${item.eventTitle}"`,
            timestamp: ts,
            type: 'info',
          })
          if (item.wisdomSummary) {
            historyLogs.push({
              id: `hist-scribe-${item.id}`,
              agentId: item.agentId,
              subAgentType: 'scribe' as SubAgentType,
              message: `[${agentName} - Scribe] "${item.wisdomSummary.slice(0, 90)}${item.wisdomSummary.length > 90 ? '...' : ''}"`,
              timestamp: ts + 1000,
              type: 'success',
            })
          }
          if (item.txHash) {
            historyLogs.push({
              id: `hist-mint-${item.id}`,
              agentId: item.agentId,
              subAgentType: 'mint-master' as SubAgentType,
              message: `[${agentName} - Mint-Master] NFT minted on ${getChain(item.chainId)?.shortName ?? 'chain'}. TX: ${item.txHash.slice(0, 18)}...`,
              timestamp: ts + 2000,
              type: 'success',
            })
          }
        }
        setLogs(historyLogs.slice(-50))
      }

      if (cloudAgents.length > 0) {
        // Enrich with live gas balance from RPC (best-effort, non-blocking)
        const enriched = await Promise.all(
          cloudAgents.map(async (a) => {
            try {
              const balStr = await blockchain.getBalance(a.walletAddress, a.chainId)
              const liveBalance = parseFloat(balStr)
              return { ...a, agentGasBalance: liveBalance, mantleBalance: liveBalance }
            } catch {
              return a
            }
          })
        )
        setAgents(enriched)
        toast.info(`Loaded ${enriched.length} agent${enriched.length > 1 ? 's' : ''} from cloud`, {
          description: `Synced ${restoredEvents.length} event${restoredEvents.length > 1 ? 's' : ''} and ${restoredNFTs.length} NFT${restoredNFTs.length > 1 ? 's' : ''}`
        })
      } else {
        setAgents([])
      }
    } catch (error) {
      console.error('Wallet connection failed:', error)
      toast.error('Failed to connect wallet', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    }
  }

  const handleWalletDisconnect = () => {
    blockchain.disconnectWallet()
    localStorage.removeItem(WALLET_SESSION_KEY)
    setWalletConnected(false)
    setWalletAddress(undefined)
    setWalletChainId(undefined)
    setAgents([])
    setNFTs([])
    setEvents([])
    toast.info('Wallet disconnected')
  }

  const handleAgentCreated = (newAgent: Agent) => {
    setAgents((current) => [...(current ?? []), newAgent])
    setDeployingAgentId(newAgent.id)
    
    toast.success(`Agent "${newAgent.name}" spawned successfully!`, {
      description: `Wallet: ${newAgent.walletAddress.slice(0, 10)}...`
    })
    
    addLog(newAgent.id, 'secretary', `[${newAgent.name} - secretary] Agent initialization complete`, 'success')
    
    addLog(newAgent.id, 'secretary', `[${newAgent.name} - secretary] Registered agent wallet on MAEF smart contract`, 'success')

    const contractAddress = newAgent.contractAddress || CONTRACT_ADDRESSES.sepolia.MAEF_NFT
    const deploymentTxHash = newAgent.deploymentTxHash || ''

    setTimeout(() => {
      setDeployingAgentId(null)
    }, 12000)

    if (!deploymentTxHash) {
      return
    }

    setActiveVerifications((current) => new Set([...current, contractAddress]))

    verificationService.trackContractVerification(
      contractAddress,
      newAgent.id,
      newAgent.name,
      deploymentTxHash,
      (verificationData) => {
        setVerificationData((current) => {
          const existing = (current ?? []).filter(v => !(v.contractAddress === contractAddress && v.agentId === newAgent.id))
          return [...existing, verificationData]
        })

        if (verificationData.verificationStatus === 'verified') {
          toast.success(`Contract verified for ${newAgent.name}!`, {
            description: `Contract is now visible on ${getChain(newAgent.chainId ?? selectedChainId)?.name ?? 'the block explorer'}`,
            action: {
              label: 'View Contract',
              onClick: () => window.open(verificationData.explorerUrl, '_blank')
            }
          })
          setActiveVerifications((current) => {
            const next = new Set(current)
            next.delete(contractAddress)
            return next
          })
        } else if (verificationData.verificationStatus === 'failed') {
          toast.error(`Contract verification failed for ${newAgent.name}`, {
            description: verificationData.errorMessage
          })
          setActiveVerifications((current) => {
            const next = new Set(current)
            next.delete(contractAddress)
            return next
          })
        }
      },
      newAgent.chainId ?? selectedChainId
    )
  }

  const addLog = (agentId: string, subAgentType: Agent['subAgents'][0]['type'], message: string, type: TerminalLog['type']) => {
    const log: TerminalLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      agentId,
      subAgentType,
      message,
      timestamp: Date.now(),
      type
    }
    setLogs((current) => [...current, log])
  }

  // Derive a human-readable title + platform from URL (no extra input needed)
  const deriveTitleFromUrl = (url: string): string => {
    try {
      const p = new URL(url)
      const host = p.hostname.replace('www.', '')
      if (host.includes('youtube') || host.includes('youtu.be')) {
        const v = p.searchParams.get('v') || p.pathname.slice(1)
        return `YouTube: ${v}`
      }
      if (host.includes('lu.ma')) return `Luma: ${p.pathname.replace('/', '')}`
      if (host.includes('eventbrite')) {
        const parts = p.pathname.split('/').filter(Boolean)
        return `Eventbrite: ${parts[parts.length - 1] || 'Event'}`
      }
      return `${host} Event`
    } catch { return 'Event' }
  }

  const derivePlatformFromUrl = (url: string): 'YouTube' | 'Luma' | 'Eventbrite' | 'Zoom' => {
    try {
      const host = new URL(url).hostname.replace('www.', '')
      if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube'
      if (host.includes('lu.ma') || host.includes('luma.com')) return 'Luma'
      if (host.includes('eventbrite')) return 'Eventbrite'
      if (host.includes('zoom')) return 'Zoom'
      return 'YouTube'  // safe default
    } catch { return 'YouTube' }
  }

  const normalizePlatform = (platform: string): Event['platform'] => {
    if (platform === 'Luma' || platform === 'Eventbrite' || platform === 'Zoom') {
      return platform
    }
    return 'YouTube'
  }

  const deriveEventStatus = (
    platform: Event['platform'],
    lumaStatus?: 'scheduled' | 'completed' | 'unknown',
    lumaStartAt?: string,
  ): Event['status'] => {
    if (platform !== 'Luma') return 'completed'
    if (!lumaStartAt) return lumaStatus === 'scheduled' ? 'scheduled' : 'completed'

    const startMs = new Date(lumaStartAt).getTime()
    if (Number.isNaN(startMs)) {
      return lumaStatus === 'scheduled' ? 'scheduled' : 'completed'
    }
    return startMs > Date.now() ? 'scheduled' : 'completed'
  }

  const handleAttendEvent = async () => {
    updateActivity() // Track user interaction
    if (!walletConnected) {
      toast.error('Please connect your wallet first!')
      return
    }
    if (!eventUrl.trim()) {
      toast.error('Please enter an event URL')
      return
    }
    const urlValidation = validateEventUrl(eventUrl.trim())
    if (!urlValidation.valid) {
      toast.error(urlValidation.error || 'Invalid URL')
      return
    }

    const agent = selectedAgent ?? (displayedAgents.length > 0 ? displayedAgents[0] : null)
    if (!agent) {
      toast.error('No agents available. Spawn an agent first!')
      return
    }

    const eventTitle = deriveTitleFromUrl(eventUrl.trim())
    const platform = derivePlatformFromUrl(eventUrl.trim())
    const agentChainId = agent.chainId ?? DEFAULT_CHAIN_ID
    const agentChain = getChain(agentChainId)

    setIsProcessingEvent(true)
    setActiveAgentId(agent.id)
    startWorkflow()

    if (useMockData) {
      // ── Mock / offline fallback (dev only) ──────────────────────────────
      addLog(agent.id, 'secretary', `[${agent.name} - Secretary] [MOCK] Joining event: ${eventUrl}`, 'info')
      await new Promise(resolve => setTimeout(resolve, 1000))
      addLog(agent.id, 'scribe', `[${agent.name} - Scribe] [MOCK] Generating AI summary...`, 'info')
      await new Promise(resolve => setTimeout(resolve, 2000))
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] [MOCK] Simulating NFT mint...`, 'info')
      await new Promise(resolve => setTimeout(resolve, 1500))

      const mockTx = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      const newEvent: Event = { id: `event-${Date.now()}`, agentId: agent.id, url: eventUrl.trim(), title: eventTitle, platform, date: Date.now(), summary: '[MOCK] AI summary placeholder.', status: 'completed' }
      const newNFT: NFT = { id: `nft-${Date.now()}`, agentId: agent.id, eventId: newEvent.id, eventTitle, summary: newEvent.summary, date: Date.now(), transactionHash: mockTx, tokenId: `${1000 + displayedNFTs.length + 1}`, imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT' }
      const newEventsAttended = agent.eventsAttended + 1

      setMockEvents(c => [...c, newEvent])
      setMockNFTs(c => [...c, newNFT])
      setMockAgents(c => c.map(a => a.id === agent.id ? { ...a, eventsAttended: newEventsAttended, level: Math.floor(newEventsAttended / 2) + 1, wisdomUnlocked: newEventsAttended >= 5 } : a))
      setEventUrl('')
      setIsProcessingEvent(false)
      setActiveAgentId(null)
      clearTasks()
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] [MOCK] NFT simulated. TX: ${mockTx.slice(0, 16)}...`, 'success')
      toast.success('[MOCK] Event simulated (no real tx)', { description: 'Switch to Live mode for real blockchain minting.' })
      return
    }

    // ── Real backend flow ─────────────────────────────────────────────────
    try {
      addLog(agent.id, 'secretary', `[${agent.name} - Secretary] Connecting to Agent Engine (Cloud Run)...`, 'info')
      await new Promise(resolve => setTimeout(resolve, 400))

      // ── Luma RSVP: auto-register if agent has Luma session + URL is Luma ──
      if (platform === 'Luma' && !agent.lumaConnected) {
        addLog(agent.id, 'secretary', `[${agent.name} - Secretary] Luma event detected — connect Luma account to enable autonomous RSVP`, 'info')
      }
      if (platform === 'Luma' && agent.lumaConnected) {
        addLog(agent.id, 'secretary', `[${agent.name} - Secretary] Luma event detected — initiating autonomous RSVP...`, 'info')
        try {
          const rsvpResult = await cloudRunService.lumaRsvp(agent.id, eventUrl.trim())
          if (rsvpResult.rsvp_confirmed) {
            addLog(agent.id, 'secretary', `[${agent.name} - Secretary] RSVP confirmed for "${rsvpResult.event_title || eventTitle}"`, 'success')
          } else {
            addLog(agent.id, 'secretary', `[${agent.name} - Secretary] RSVP status: ${rsvpResult.status}`, 'warning')
          }
        } catch (rsvpErr) {
          // Non-fatal: RSVP failure doesn't block Scouting Brief processing
          addLog(agent.id, 'secretary', `[${agent.name} - Secretary] RSVP skipped — ${rsvpErr instanceof Error ? rsvpErr.message : 'connection error'}`, 'warning')
        }
      }

      addLog(agent.id, 'scribe', `[${agent.name} - Scribe] Sending event to Gemini AI for analysis...`, 'info')
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Preparing on-chain mint. NFT recipient: ${agent.walletAddress.slice(0, 10)}...${agent.walletAddress.slice(-4)}`, 'info')
      toast.info('Processing event...', { description: 'Gemini AI is analyzing. This takes 15-40s.' })

      // Mode B (Autonomous Signing): Agent signs with its own private key
      // Fallback to Mode A if Mode B fails (network error, KMS timeout, etc.)
      const result = await cloudRunService.attendEvent({
        agentId: agent.id,
        agentWallet: agent.walletAddress,
        agentName: agent.name,
        eventUrl: eventUrl.trim(),
        eventTitle,
        platform,
        niche: agent.niche,
        chainId: agentChainId,
        modeB: true,  // Enable autonomous signing by default for demo impact
      })

      const isScoutingBrief = result.lumaStatus === 'scheduled'
      const resolvedTitle = result.txHash ? eventTitle : eventTitle  // title may have been resolved by backend
      const signingMode = result.txHash ? (result.txHash.includes('agent') ? 'Agent' : 'Backend') : 'Unknown'

      if (isScoutingBrief) {
        addLog(agent.id, 'secretary', `[${agent.name} - Secretary] Future Luma event detected — switching to Scouting mode`, 'info')
        addLog(agent.id, 'scribe', `[${agent.name} - Scribe] Pre-Event Scouting Brief generated: "${result.wisdomSummary.slice(0, 80)}..."`, 'success')
        addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Scouting Brief saved — no NFT minted until event completes.`, 'info')
        toast.success(`Scouting Brief registered for "${resolvedTitle}"`, {
          description: `Future event — agent prepared a predictive analysis. No XP until event completes.`,
        })
      } else {
        addLog(agent.id, 'scribe', `[${agent.name} - Scribe] Wisdom generated: "${result.wisdomSummary.slice(0, 80)}..."`, 'success')
        addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Transaction signed by ${signingMode}. TX: ${result.txHash.slice(0, 18)}...`, 'info')
        addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] NFT minted on ${agentChain?.shortName ?? 'chain'}! Token #${result.tokenId} | Block ${result.blockNumber}`, 'success')
        addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Gas used: ${Number(result.gasUsed || 0).toLocaleString()} units`, 'info')
      }

      const nicheTag = agent.niche === 'Blockchain/DeFi' ? '#DeFi #Web3 #Mantle' : agent.niche === 'Trading/Investment' ? '#Trading #Crypto #DeFi' : agent.niche === 'Technology' ? '#Tech #AI #Web3' : '#Health #Wellness #Web3'
      const shortWisdom = result.wisdomSummary.length > 110 ? result.wisdomSummary.slice(0, 110) + '…' : result.wisdomSummary
      if (!isScoutingBrief) {
        const socialPostText = `My AI agent ${agent.name} just attended "${resolvedTitle}" and minted a Proof-of-Attendance NFT on @MantleNetwork!\n\nKey insight: "${shortWisdom}"\n\nNFT #${result.tokenId} ${nicheTag} #MAEF`
        setLastSocialPost({ agentId: agent.id, text: socialPostText, eventTitle: resolvedTitle })
        addLog(agent.id, 'social-lite', `[${agent.name} - Social-Lite] Post draft ready for "${resolvedTitle}"`, 'success')
      }

      const newEvent: Event = {
        id: `event-${Date.now()}`,
        agentId: agent.id,
        chainId: agentChainId,
        url: eventUrl.trim(),
        title: resolvedTitle,
        platform,
        date: Date.now(),
        summary: result.wisdomSummary,
        status: deriveEventStatus(platform, result.lumaStatus, result.lumaStartAt),
        lumaStartAt: result.lumaStartAt,
      }

      const newNFT: NFT = {
        id: `nft-${Date.now()}`,
        agentId: agent.id,
        chainId: agentChainId,
        eventId: newEvent.id,
        eventTitle: resolvedTitle,
        summary: result.wisdomSummary,
        date: Date.now(),
        transactionHash: result.txHash,
        tokenId: result.tokenId,
        explorerUrl: result.explorerUrl,
        imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT',
      }

      // Scouting Brief: 0 XP — eventsAttended and level unchanged
      const newEventsAttended = isScoutingBrief
        ? agent.eventsAttended
        : (result.newTotalEvents ?? (agent.eventsAttended + 1))
      const newLevel = isScoutingBrief
        ? agent.level
        : (result.newLevel ?? (result.levelUp ? agent.level + 1 : agent.level))
      let refreshedBalance: number | undefined
      try {
        const nextBalance = await blockchain.getBalance(agent.walletAddress, agentChainId)
        refreshedBalance = parseFloat(nextBalance)
      } catch {
        refreshedBalance = undefined
      }

      setEvents(c => [...(c ?? []), newEvent])
      if (!isScoutingBrief) setNFTs(c => [...(c ?? []), newNFT])
      setAgents(c => (c ?? []).map(a =>
        a.id === agent.id
          ? {
              ...a,
              eventsAttended: newEventsAttended,
              level: newLevel,
              wisdomUnlocked: newEventsAttended >= 5,
              gasSpent: (a.gasSpent || 0) + Number(result.gasUsed || 0),
              mantleBalance: refreshedBalance ?? a.mantleBalance,
              agentGasBalance: refreshedBalance ?? a.agentGasBalance,
            }
          : a
      ))

      setEventUrl('')
      setIsProcessingEvent(false)
      setActiveAgentId(null)
      clearTasks()

      toast.success(`NFT #${result.tokenId} minted on ${agentChain?.name ?? 'the selected network'}!`, {
        description: `Token ID: ${result.tokenId} | Gas: ${Number(result.gasUsed || 0).toLocaleString()} units`,
        action: {
          label: `View Agent Wisdom on ${agentChain?.shortName ?? 'Explorer'}`,
          onClick: () => window.open(result.explorerUrl, '_blank'),
        },
        duration: 10000,
      })

      if (newEventsAttended >= 5 && !agent.wisdomUnlocked) {
        setTimeout(() => {
          toast.success('🎉 Wisdom Unlocked!', { description: 'Generate your Wisdom Report now!', duration: 5000 })
        }, 1200)
      }
    } catch (error) {
      const modeBOutOfGas =
        error instanceof CloudRunAPIError && error.errorCode === 'AGENT_OUT_OF_GAS'

      if (modeBOutOfGas) {
        setSelectedAgentForTopUp(agent)
        setPendingAttendContext({
          agentId: agent.id,
          eventUrl: eventUrl.trim(),
        })
        setTopUpDialogOpen(true)
        toast.warning('Agent wallet out of gas', {
          description: `${agent.name} needs a gas top-up before autonomous signing can continue.`
        })
      }

      const msg = error instanceof Error ? error.message : 'Unknown error from Agent Engine'
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Error: ${msg}`, 'error')
      if (!modeBOutOfGas) {
        toast.error('Event attendance failed', {
          description: msg,
          action: { label: 'Retry', onClick: handleAttendEvent },
        })
      }
      setIsProcessingEvent(false)
      setActiveAgentId(null)
      clearTasks()
    }
  }

  const handleTopUpAgentGas = async (agentId: string, amount: number): Promise<void> => {
    updateActivity() // Track user interaction
    const agent = (agents ?? []).find((a) => a.id === agentId)
    if (!agent) {
      throw new Error('Agent not found for gas top-up')
    }

    const agentChainId = agent.chainId ?? DEFAULT_CHAIN_ID
    const tx = await mantleService.topUpAgentGas(agent.walletAddress, amount, agentChainId)
    if (!tx.success) {
      throw new Error(tx.error || 'Gas top-up transaction failed')
    }

    // Keep local balances reasonably in sync until the next full hydration.
    const txFee = Number(tx.gasUsed || 0)
    setUserBalance((current) => (current ?? 0) - amount - txFee)

    let refreshedAgentBalance = agent.agentGasBalance
    try {
      const bal = await blockchain.getBalance(agent.walletAddress, agentChainId)
      refreshedAgentBalance = parseFloat(bal)
    } catch {
      refreshedAgentBalance = (agent.agentGasBalance ?? 0) + amount
    }

    setAgents((current) =>
      (current ?? []).map((a) =>
        a.id === agentId
          ? {
              ...a,
              agentGasBalance: refreshedAgentBalance,
              mantleBalance: refreshedAgentBalance,
            }
          : a
      )
    )

    addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Gas topped up by owner. TX: ${tx.transactionHash?.slice(0, 18)}...`, 'success')

    // Auto-retry pending Mode B request for the same agent.
    if (pendingAttendContext && pendingAttendContext.agentId === agentId) {
      setEventUrl(pendingAttendContext.eventUrl)
      setPendingAttendContext(null)
      setTopUpDialogOpen(false)
      toast.info('Retrying autonomous mint...', {
        description: 'Mode B event attendance is being retried after top-up.'
      })
      await handleAttendEvent()
    }
  }

  const handleOpenWisdomReport = (agent: Agent) => {
    if (agent.wisdomUnlocked) {
      setSelectedAgent(agent)
      setWisdomDialogOpen(true)
    } else {
      toast.error('Wisdom not yet unlocked', {
        description: `Agent needs to attend ${5 - agent.eventsAttended} more event(s)`
      })
    }
  }

  const handleConfigureAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setConfigDialogOpen(true)
  }

  const handleSaveAgentConfig = (agentId: string, instructions: string, customAgenda: string) => {
    setAgents((current) =>
      (current ?? []).map((a) =>
        a.id === agentId ? { ...a, customInstructions: instructions, customAgenda } : a
      )
    )

    void cloudRunService.updateAgentState(agentId, { customInstructions: instructions, customAgenda }).catch((error) => {
      console.warn('[cloudRunService] failed to persist agent config:', error)
    })
  }

  const handleToggleScout = (agentId: string, enabled: boolean) => {
    setAgents((current) =>
      (current ?? []).map((a) => {
        if (a.id === agentId) {
          const updatedAgent = { ...a, autoScoutEnabled: enabled }

          if (enabled && a.level >= 2) {
            const opportunities = buildScoutedOpportunities(a, displayedEvents)
            updatedAgent.scoutedOpportunities = opportunities
          }

          return updatedAgent
        }
        return a
      })
    )

    if (enabled) {
      const sourceCount = displayedEvents.length
      if (sourceCount === 0) {
        toast.info('No historical events yet', {
          description: 'Auto Scout will populate opportunities after your first attended events.'
        })
      } else {
        toast.info('Scout refreshed from live event history', {
          description: `Generated recommendations from ${sourceCount} event records.`
        })
      }
    }

    void cloudRunService.updateAgentState(agentId, { autoScoutEnabled: enabled }).catch((error) => {
      console.warn('[cloudRunService] failed to persist auto scout state:', error)
    })
  }

  const [scoutingAgentId, setScoutingAgentId] = useState<string | null>(null)

  // Wire scoutingAgentId into the SubAgentDelegation active state
  useEffect(() => {
    if (scoutingAgentId) {
      setActiveAgentId(scoutingAgentId)
      setIsProcessingEvent(true)
    } else {
      setIsProcessingEvent(false)
    }
  }, [scoutingAgentId])

  // Start sub-agent task animation once isProcessingEvent is true
  useEffect(() => {
    if (isProcessingEvent && activeAgentId) {
      startWorkflow()
    }
  }, [isProcessingEvent, activeAgentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRunAutoScout = async (agentId: string) => {
    updateActivity() // Track user interaction
    if (!backendConnected) {
      toast.error('Backend not available', { description: 'Connect to Cloud Run backend first.' })
      return
    }
    setScoutingAgentId(agentId)
    toast.info('Secretary is searching for events...', { description: 'Scanning YouTube for relevant content.' })
    try {
      const result = await cloudRunService.runAutoScout(agentId)
      if (result.status === 'no_new_events') {
        toast.info('No new events found', { description: result.message ?? 'All discovered events already attended.' })
        return
      }
      if (result.status === 'skipped') {
        const score = result.decision_metrics?.score
        const threshold = result.decision_metrics?.threshold_applied
        const balance = result.decision_metrics?.agent_gas_balance
        const detail =
          score != null && threshold != null
            ? `${result.message ?? 'Agent skipped this scout cycle.'} Score ${score}/100 vs threshold ${threshold}.`
            : result.message ?? 'Agent skipped this scout cycle to preserve gas or avoid low-value minting.'

        toast.info('Auto Scout skipped by policy', {
          description: balance != null ? `${detail} Balance: ${balance.toFixed(4)} MNT.` : detail,
        })
        return
      }
      const { discovered, attend_result } = result
      if (attend_result?.success) {
        toast.success(`Agent attended: ${discovered?.title}`, {
          description: `NFT minted. TX: ${attend_result.tx_hash?.slice(0, 10)}...`,
        })
        // Update agent stats in local state from scout result
        if (attend_result.new_total_events != null || attend_result.new_level != null) {
          setAgents((current) =>
            (current ?? []).map((a) =>
              a.id === agentId
                ? {
                    ...a,
                    eventsAttended: attend_result.new_total_events ?? a.eventsAttended,
                    level: attend_result.new_level ?? a.level,
                  }
                : a
            )
          )
        }
      } else {
        toast.warning('Discovered event but mint failed', {
          description: discovered?.title ?? 'Check Cloud Run logs.',
        })
      }
    } catch (err) {
      if (err instanceof CloudRunAPIError && err.errorCode === 'AGENT_OUT_OF_GAS') {
        const agent = (agents ?? []).find(a => a.id === agentId) || null
        if (agent) {
          setSelectedAgentForTopUp(agent)
          setPendingAttendContext(null) // scout has its own URL selection path
          setTopUpDialogOpen(true)
        }
        toast.warning('Auto Scout paused: agent out of gas', {
          description: 'Top up agent wallet, then run Auto Scout again.'
        })
        return
      }

      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Auto Scout failed', { description: msg })
    } finally {
      setScoutingAgentId(null)
      clearTasks()
    }
  }

  const handleApproveScoutedEvent = (agentId: string, eventId: string) => {
    setAgents((current) =>
      (current ?? []).map((a) => {
        if (a.id === agentId && a.scoutedOpportunities) {
          return {
            ...a,
            scoutedOpportunities: a.scoutedOpportunities.map((evt) =>
              evt.id === eventId ? { ...evt, approved: true } : evt
            )
          }
        }
        return a
      })
    )
  }

  const handleSaveCustomAgenda = (agentId: string, agenda: string) => {
    setAgents((current) =>
      (current ?? []).map((a) =>
        a.id === agentId ? { ...a, customAgenda: agenda } : a
      )
    )
    toast.success('Custom Agenda Updated', {
      description: 'Agent will now scout events based on your custom criteria'
    })

    void cloudRunService.updateAgentState(agentId, { customAgenda: agenda }).catch((error) => {
      console.warn('[cloudRunService] failed to persist custom agenda:', error)
    })
  }

  const handleChatWithAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setChatDialogOpen(true)
  }

  const handleBatchIPFSComplete = (results: Array<{
    eventId: string
    metadataCID: string
    imageCID: string
    metadataURI: string
  }>) => {
    setNFTs((current) =>
      (current ?? []).map((nft) => {
        const result = results.find(r => r.eventId === nft.eventId)
        if (result) {
          return {
            ...nft,
            metadataCID: result.metadataCID,
            imageCID: result.imageCID,
            metadataURI: result.metadataURI,
            imageUrl: `https://ipfs.io/ipfs/${result.imageCID}`
          }
        }
        return nft
      })
    )
  }

  const handleViewEvolution = (agent: Agent) => {
    setSelectedAgent(agent)
    setEvolutionDialogOpen(true)
  }

  const handleOpenSignatureModal = (proposal: AgentProposal) => {
    setSelectedProposal(proposal)
    setSignatureModalOpen(true)
  }

  const handleConfirmProposal = (proposalId: string) => {
    const updateProposals = useMockData ? setMockProposals : setProposals
    updateProposals((current) =>
      (current ?? []).map((p) =>
        p.id === proposalId ? { ...p, status: 'approved', executionDetails: {
          transactionHash: `0x${Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join('')}`,
          result: 'Transaction executed successfully on Mantle Network',
          executedAt: Date.now()
        } } : p
      )
    )
    
    toast.success('Proposal Executed', {
      description: 'Transaction has been broadcasted to Mantle Network',
    })
  }

  const handleApproveProposal = (proposalId: string) => {
    const updateProposals = useMockData ? setMockProposals : setProposals
    updateProposals((current) =>
      (current ?? []).map((p) =>
        p.id === proposalId ? { ...p, status: 'approved' } : p
      )
    )
  }

  const handleRejectProposal = (proposalId: string) => {
    const updateProposals = useMockData ? setMockProposals : setProposals
    updateProposals((current) =>
      (current ?? []).map((p) =>
        p.id === proposalId ? { ...p, status: 'rejected' } : p
      )
    )
  }

  const handleBuyAgent = async (marketplaceAgent: MarketplaceAgent) => {
    if (!walletConnected) {
      toast.error('Please connect your wallet first!')
      return
    }

    if ((userBalance ?? 0) < marketplaceAgent.price) {
      toast.error('Insufficient balance!', {
        description: `You need ${marketplaceAgent.price} MNT but only have ${(userBalance ?? 0).toFixed(2)} MNT`
      })
      return
    }

    setPurchasingAgentId(marketplaceAgent.id)

    await new Promise(resolve => setTimeout(resolve, 2000))

    const newAgent: Agent = {
      ...marketplaceAgent,
      ownershipStatus: 'marketplace-acquired',
      autoReplenishGas: false
    }

    setAgents((current) => [...(current ?? []), newAgent])
    setMarketplaceAgents((current) => (current ?? []).filter(a => a.id !== marketplaceAgent.id))
    setUserBalance((current) => (current ?? 0) - marketplaceAgent.price)

    setPurchasingAgentId(null)

    toast.success('Purchase Successful! Identity Wiped. Wisdom Inherited.', {
      description: `Agent "${marketplaceAgent.name}" is now yours!`
    })

    addLog(newAgent.id, 'secretary', `[SYSTEM] Agent "${newAgent.name}" purchased. Memory reset, wisdom data preserved.`, 'success')
  }

  const handleToggleAutoReplenish = (agent: Agent, enabled: boolean) => {
    setReplenishMap(prev => ({ ...(prev ?? {}), [agent.id]: enabled }))
    setAgents((current) =>
      (current ?? []).map((a) =>
        a.id === agent.id ? { ...a, autoReplenishGas: enabled } : a
      )
    )

    if (enabled) {
      toast.success('Auto-Replenishment Activated', {
        description: `${agent.name} will auto-replenish gas when below 0.05 MNT`
      })
      addLog(agent.id, 'mint-master', `[SYSTEM] Auto-replenishment active. Agent is fully self-sustaining.`, 'success')
    } else {
      toast.info('Auto-Replenishment Deactivated', {
        description: `${agent.name} will no longer auto-replenish gas`
      })
    }
  }

  const handleDeleteAgent = async (agent: Agent) => {
    if (!walletAddress) {
      toast.error('Wallet not connected')
      return
    }
    try {
      await cloudRunService.deleteAgent(agent.id, walletAddress)
      setAgents(current => (current ?? []).filter(a => a.id !== agent.id))
      toast.success(`${agent.name} removed`, { description: 'Agent deleted from dashboard' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      toast.error('Failed to remove agent', { description: msg })
    }
  }

  const handleRetrySpawn = async (agent: Agent) => {
    if (!walletAddress) {
      toast.error('Wallet not connected')
      return
    }
    try {
      toast.info(`Retrying V4 spawn for ${agent.name}...`)
      const result = await cloudRunService.retrySpawnBredAgent(agent.id, walletAddress)
      if (result.status === 'already_spawned') {
        toast.success(`${agent.name} is already active on V4`)
        setAgents(current => (current ?? []).map(a => a.id === agent.id ? { ...a, spawnedOnV4: true } : a))
      } else {
        toast.success(`Spawn retry initiated for ${agent.name}`, {
          description: 'V4 activation TX sent — check back in ~30s'
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Retry failed'
      toast.error('Spawn retry failed', { description: msg })
    }
  }

  const handleBreedComplete = (result: import('@/lib/types').BreedingResult, offspringName: string) => {
    const newAgent = result.offspring
    const parent1 = displayedAgents.find(a => a.id === (newAgent.parentIds?.[0]))
    const parent2 = displayedAgents.find(a => a.id === (newAgent.parentIds?.[1]))

    // Backend already persisted offspring + parent counters atomically.
    // We only need to update local React state for immediate UI consistency.
    setAgents((current) => {
      const updated = (current ?? []).map((a) => {
        if (a.id === parent1?.id || a.id === parent2?.id) {
          return {
            ...a,
            breedingCount: (a.breedingCount ?? 0) + 1,
            lastBreedingTime: Date.now(),
            breedingCooldownHours: 24,
          }
        }
        return a
      })
      return [...updated, newAgent]
    })

    setUserBalance((current) => (current ?? 0) - 2.5)

    toast.success('Breeding Successful!', {
      description: `${offspringName} has been created with inherited wisdom from both parents.`,
      duration: 5000
    })

    addLog(newAgent.id, 'secretary', `[SYSTEM] Agent "${offspringName}" bred successfully. Inherited ${result.wisdomMerge.inheritedWisdom} events worth of wisdom. Wallet: ${newAgent.walletAddress}`, 'success')

    if (parent1 && parent2) {
      addLog(newAgent.id, 'secretary', `[SYSTEM] Parents: "${parent1.name}" + "${parent2.name}" | Generation ${newAgent.generation} | ${result.geneticBonus.length} genetic bonuses`, 'info')
    }
  }

  const handleCooldownBoost = (agentId: string) => {
    setAgents((current) =>
      (current ?? []).map((a) =>
        a.id === agentId
          ? { ...a, lastBreedingTime: undefined, breedingCooldownHours: undefined }
          : a
      )
    )

    setUserBalance((current) => (current ?? 0) - 0.5)

    const agent = agents?.find(a => a.id === agentId)

    toast.success('⚡ Neural Recovery Complete!', {
      description: `${agent?.name} is now ready for fusion. Cooldown bypassed.`,
      duration: 4000
    })

    if (agent) {
      addLog(agent.id, 'mint-master', `[SYSTEM] Neural recovery boost applied. Agent is ready for immediate fusion.`, 'success')
    }

  }

  const isPlatformView = !walletConnected
  const stats = isPlatformView && platformMetrics
    ? [
        { label: 'Active Agents', value: platformMetrics.total_agents, icon: Robot, color: 'text-primary' },
        { label: 'NFTs Minted', value: platformMetrics.total_wisdom_nfts, icon: WalletIcon, color: 'text-secondary' },
        { label: 'Events Attended', value: platformMetrics.total_events_attended, icon: Globe, color: 'text-primary' },
        { label: 'Avg Agent Level', value: `Lv ${platformMetrics.average_agent_level.toFixed(1)}`, icon: ChartLine, color: 'text-secondary' }
      ]
    : [
        { label: 'Active Agents', value: displayedAgents.length, icon: Robot, color: 'text-primary' },
        { label: 'NFTs Minted', value: displayedNFTs.length, icon: WalletIcon, color: 'text-secondary' },
        { label: 'Events Attended', value: displayedEvents.length, icon: Globe, color: 'text-primary' },
        { label: 'Wisdom Unlocked', value: displayedAgents.filter(a => a.wisdomUnlocked).length, icon: ChartLine, color: 'text-secondary' }
      ]

  const isViewOnly = !walletConnected
  const visiblePendingProposals = displayedProposals.filter((proposal) =>
    proposal.status === 'pending' && displayedAgents.some((agent) => agent.id === proposal.agentId)
  )

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <DataFlowBackground />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,243,255,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(157,0,255,0.15),transparent_50%),radial-gradient(ellipse_at_center,rgba(100,100,255,0.05),transparent_70%)]" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDI0MywyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />

      <BackendHealthModal
        open={healthCheckOpen}
        onOpenChange={setHealthCheckOpen}
        onHealthConfirmed={handleHealthConfirmed}
      />

      <div className="relative z-10">
        <NetworkMismatchAlert
          walletChainId={walletChainId}
          selectedChainId={selectedChainId}
          onSwitch={handleSwitchNetwork}
        />
        <header className="border-b border-primary/20 backdrop-blur-xl bg-background/70 sticky top-0 z-40 shadow-lg shadow-primary/5">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Left: Home icon + Logo */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate('/')}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title="Back to home"
                >
                  <House size={16} weight="duotone" />
                </button>
                <img
                  src={maefLogo}
                  alt="ASAJU AI"
                  className="h-12 w-auto object-contain"
                  style={{ mixBlendMode: 'lighten' }}
                />
                <div>
                  <h1 className="text-sm font-black tracking-widest text-white leading-none">ASAJU AI</h1>
                  <p className="text-[9px] text-muted-foreground font-mono hidden sm:block leading-none mt-0.5">Autonomous Agent Intelligence</p>
                </div>
              </div>

              {/* Nav — center */}
              <nav className="flex items-center gap-0.5 flex-1 justify-center">
                {([
                  { view: 'dashboard', label: 'Dashboard', icon: Robot, color: 'primary' },
                  { view: 'analytics', label: 'Analytics', icon: ChartLine, color: 'primary' },
                  { view: 'vault', label: 'NFT Vault', icon: WalletIcon, color: 'primary' },
                  { view: 'marketplace', label: 'Marketplace', icon: Storefront, color: 'secondary' },
                ] as const).map(({ view, label, icon: Icon, color }) => (
                  <Button
                    key={view}
                    onClick={() => startTransition(() => setMainView(view))}
                    variant={mainView === view ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'px-3 h-8 text-sm font-medium transition-all duration-200',
                      mainView === view
                        ? `bg-${color}/10 text-${color} border border-${color}/40`
                        : `text-muted-foreground hover:text-foreground hover:bg-white/5`
                    )}
                  >
                    <Icon className="mr-1.5 hidden sm:inline" size={14} weight="duotone" />
                    {label}
                  </Button>
                ))}
              </nav>

              {/* Right — status + wallet */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Backend status pill — status only, no public toggle */}
                <div
                  className={cn(
                    'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono',
                    backendStatus === 'live' && 'bg-emerald-500/10 text-emerald-400',
                    backendStatus === 'checking' && 'bg-yellow-500/10 text-yellow-400',
                    backendStatus === 'error' && 'bg-red-500/10 text-red-400',
                  )}
                  title={backendStatus === 'live' ? 'Cloud Run backend connected' : backendStatus === 'checking' ? 'Connecting...' : 'Backend offline'}
                >
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    backendStatus === 'live' && 'bg-emerald-400 animate-pulse',
                    backendStatus === 'checking' && 'bg-yellow-400 animate-pulse',
                    backendStatus === 'error' && 'bg-red-400',
                  )} />
                  {backendStatus === 'live' ? 'Live' : backendStatus === 'checking' ? '...' : 'Offline'}
                </div>

                <ChainSelector
                  selectedChainId={selectedChainId}
                  onChainChange={setSelectedChainId}
                />
                {walletConnected && <GasPriceMonitor />}
                <WalletConnect
                  onConnect={handleWalletConnect}
                  isConnected={walletConnected}
                  address={walletAddress}
                  onDisconnect={handleWalletDisconnect}
                />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 pb-24">
          {mainView === 'dashboard' && (
            <>
              {/* Hero section */}
              <div className="text-center py-8 px-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Autonomous AI Agents That Turn Information Overload Into On-Chain Wisdom.
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-4">
                  ASAJU AI enables agents to autonomously discover Web3 events, attend them, generate intelligent summaries, mint Proof-of-Attendance NFTs on-chain, and continuously evolve through accumulated knowledge — all secured by sovereign wallets and powered by Google Gemini.
                </p>

                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium">
                  🚀 AI Agents • On-Chain NFTs • Autonomous Learning • Mantle Network
                </div>

                {/* 4-step autonomous pipeline */}
                <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap mb-5">
                  {([
                    { emoji: '🔍', label: 'Discover', sub: 'Finds relevant events' },
                    { emoji: '🧠', label: 'Learn', sub: 'Understands what it watches' },
                    { emoji: '✍️', label: 'Sign', sub: 'Proves it on its own' },
                    { emoji: '🏆', label: 'Earn NFT', sub: 'Permanent on-chain proof' },
                  ] as const).map((step, i, arr) => (
                    <div key={step.label} className="flex items-center gap-1 sm:gap-2">
                      <div className="flex flex-col items-center gap-0.5 px-2.5 sm:px-3 py-2 rounded-xl bg-card/60 border border-border/40 min-w-[70px] sm:min-w-[88px] hover:border-primary/40 transition-colors">
                        <span className="text-lg sm:text-xl leading-none mb-0.5">{step.emoji}</span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-foreground leading-tight">{step.label}</span>
                        <span className="text-[8px] sm:text-[9px] text-muted-foreground leading-tight mt-0.5">{step.sub}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <span className="text-muted-foreground/40 text-sm hidden sm:inline">→</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tech stack badges */}
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {(['Google Gemini', 'Skill Scores', 'Mantle Network', 'Secure Wallets', 'Autonomous Agents', 'On-Chain NFTs'] as const).map(tag => (
                    <span key={tag} className="text-[9px] font-mono text-muted-foreground/50 px-2 py-0.5 rounded-full bg-card/40 border border-border/30">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 font-mono flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPlatformView ? 'bg-emerald-400 animate-pulse' : 'bg-primary'}`} />
                  {isPlatformView ? 'Platform Totals — all agents on ASAJU AI' : 'Your Stats'}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                  >
                    <Card className="glass-card-hover p-4 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl group-hover:from-primary/20 transition-all duration-500" />
                      <div className="relative flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300">
                          <stat.icon size={22} className={stat.color} weight="duotone" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-5">
              <AttendEventCard
                selectedAgent={selectedAgent ?? displayedAgents[0]}
                displayedAgents={displayedAgents}
                onSelectAgent={(id) => { const a = displayedAgents.find(x => x.id === id); if (a) setSelectedAgent(a) }}
                walletConnected={walletConnected}
                onConnectWallet={() => handleWalletConnect('')}
                onAttendEvent={handleAttendEvent}
                eventUrl={eventUrl}
                onEventUrlChange={setEventUrl}
                isProcessingEvent={isProcessingEvent}
                scoutingAgentId={scoutingAgentId}
                onRunAutoScout={handleRunAutoScout}
              />

              {lastSocialPost && (
                <Card className="glass-card-hover p-4 border border-green-500/30 bg-green-500/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                        <span className="text-sm">💬</span>
                      </div>
                      <span className="text-sm font-semibold text-green-400">Social-Lite: Post Draft Ready</span>
                    </div>
                    <button onClick={() => setLastSocialPost(null)} className="text-muted-foreground/50 hover:text-muted-foreground text-xs">✕</button>
                  </div>
                  <pre className="text-xs text-muted-foreground font-sans whitespace-pre-wrap leading-relaxed bg-background/50 rounded-md p-3 border border-border/30 mb-3">
                    {lastSocialPost.text}
                  </pre>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs border-green-500/40 text-green-400 hover:bg-green-500/10"
                      onClick={() => { navigator.clipboard.writeText(lastSocialPost.text); toast.success('Copied for Twitter/X!') }}>
                      🐦 Copy for X/Twitter
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => { navigator.clipboard.writeText(lastSocialPost.text.replace(/\n\n/g, ' ')); toast.success('Copied for LinkedIn!') }}>
                      💼 Copy for LinkedIn
                    </Button>
                  </div>
                </Card>
              )}

              {displayedAgents.length > 0 && (
                <SubAgentDelegation
                  agents={displayedAgents}
                  isActive={isProcessingEvent}
                  currentTasks={tasks}
                  activeAgentId={activeAgentId}
                  syncAgentId={(selectedAgent ?? displayedAgents[0])?.id}
                />
              )}

              {deployingAgentId && agents && (
                <ContractDeploymentProgress
                  agent={agents.find(a => a.id === deployingAgentId)!}
                  isDeploying={true}
                  onComplete={() => setDeployingAgentId(null)}
                />
              )}

              {verificationData && verificationData.filter(v => 
                v.verificationStatus === 'verifying' || v.verificationStatus === 'pending'
              ).map((verification) => (
                <ContractVerificationTracker
                  key={verification.contractAddress}
                  contractAddress={verification.contractAddress}
                  agentId={verification.agentId}
                  agentName={verification.agentName}
                  deploymentTxHash={verification.deploymentTxHash}
                />
              ))}

              {visiblePendingProposals.length > 0 && (
                <div className="space-y-4">
                  <Card className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 shadow-lg shadow-amber-500/10">
                    <div className="flex items-start gap-3">
                      <ShieldWarning size={28} weight="duotone" className="text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1">
                        <h4 className="font-bold text-amber-500 mb-1 text-lg">⚠️ Human-in-the-Loop Active</h4>
                        <p className="text-sm text-foreground/90">
                          Your agents <span className="font-semibold">cannot move funds or execute trades without your explicit wallet signature</span>. All proposed actions below require your approval through a secure transaction signing process.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <PendingProposals
                    proposals={visiblePendingProposals}
                    agents={displayedAgents}
                    onApprove={handleApproveProposal}
                    onReject={handleRejectProposal}
                    onOpenSignatureModal={handleOpenSignatureModal}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>Your Agents</span>
                    <span className="text-sm text-muted-foreground font-normal">({displayedAgents.length} active)</span>
                  </h2>
                  <Button
                    onClick={walletConnected ? () => setSpawnDialogOpen(true) : () => handleWalletConnect('')}
                    size="sm"
                    className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold shadow-lg shadow-secondary/20"
                  >
                    <Plus className="mr-1.5" weight="bold" size={15} />
                    {walletConnected ? 'Spawn Agent' : 'Connect Wallet'}
                  </Button>
                </div>
                {displayedAgents.length === 0 ? (
                  <div className="space-y-4">
                    {/* Ghost Agent Preview — teaser for public users */}
                    {!walletConnected && featuredWisdom.length > 0 && (() => {
                      const preview = featuredWisdom[0]
                      return (
                        <div className="relative">
                          <div className="opacity-50 blur-[1px] pointer-events-none select-none">
                            <Card className="glass-card p-5 border border-primary/30">
                              <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 border border-primary/40 flex items-center justify-center shrink-0">
                                  <Robot size={26} className="text-primary" weight="duotone" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-base">{preview.agentName}</span>
                                    <span className="text-[10px] font-mono bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded">Lv 3</span>
                                    <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">5 Autonomous Sigs</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono truncate">{preview.niche} · Mantle Sepolia</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-center">
                                {[['Events', '5'], ['NFTs Minted', '5'], ['Gas Balance', '0.342 MNT']].map(([label, val]) => (
                                  <div key={label} className="bg-background/40 rounded-lg p-2 border border-border/30">
                                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                                    <p className="text-sm font-bold">{val}</p>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <span className="text-[10px] font-mono bg-primary/20 border border-primary/30 text-primary px-2.5 py-1 rounded-full tracking-widest uppercase">Preview: Active Agent Profile</span>
                            <Button
                              onClick={() => handleWalletConnect('')}
                              className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-bold shadow-xl shadow-secondary/40"
                            >
                              <Plus className="mr-2" weight="bold" />
                              Connect Wallet to Spawn Your Own
                            </Button>
                          </div>
                        </div>
                      )
                    })()}
                    <Card className="glass-card-hover p-10 text-center border border-dashed border-primary/30">
                      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center">
                        <Robot size={36} className="text-primary animate-float" weight="duotone" />
                      </div>
                      <h3 className="text-base font-bold mb-2">Spawn Your First AI Agent</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        Each agent autonomously attends events, generates AI wisdom, and mints Proof-of-Attendance NFTs on Mantle.
                      </p>
                      <Button
                        onClick={walletConnected ? () => setSpawnDialogOpen(true) : () => handleWalletConnect('')}
                        size="lg"
                        className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-bold px-8 shadow-xl shadow-secondary/30"
                      >
                        <Plus className="mr-2" weight="bold" />
                        {walletConnected ? 'Spawn Agent to Start' : 'Connect Wallet to Start'}
                      </Button>
                    </Card>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedAgents.map((agent, idx) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <div className="space-y-3">
                          <AgentCard
                            agent={agent}
                            onClick={() => agent.wisdomUnlocked && handleOpenWisdomReport(agent)}
                            onConfigure={handleConfigureAgent}
                            onChat={handleChatWithAgent}
                            onViewEvolution={handleViewEvolution}
                            onToggleAutoReplenish={handleToggleAutoReplenish}
                            pendingProposalCount={proposalCounts[agent.id] ?? 0}
                            onOpenProposals={(a) => setProposalModalAgent(a)}
                            onDeleteAgent={handleDeleteAgent}
                            onRetrySpawn={handleRetrySpawn}
                          />
                          {agent.wisdomUnlocked && (
                            <Button
                              onClick={() => handleOpenWisdomReport(agent)}
                              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold shadow-2xl shadow-amber-500/30"
                            >
                              <Brain className="mr-2" weight="duotone" />
                              Generate Wisdom Report
                            </Button>
                          )}
                          {agent.level >= 2 && (
                            <ProactiveScoutingPanel
                              agent={agent}
                              onToggleScout={handleToggleScout}
                              onApproveEvent={handleApproveScoutedEvent}
                            />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Featured Wisdom — community showcase ─── */}
              {!walletConnected && featuredWisdom.length > 0 && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <p className="text-[11px] text-emerald-400/80 font-mono">
                    Live autonomous output — agents discovered, attended, and minted these NFTs without any human wallet interaction
                  </p>
                </div>
              )}
              {(() => {
                const seen = new Set<string>()
                const dedupedWisdom = featuredWisdom.filter(item => {
                  const key = item.eventTitle.toLowerCase().trim()
                  if (seen.has(key)) return false
                  seen.add(key)
                  return true
                })
                return (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
                        <Newspaper className="text-accent" weight="duotone" size={19} />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold">Featured Wisdom</h2>
                        <p className="text-xs text-muted-foreground">Real insights generated by AI agents — minted as NFTs on Mantle</p>
                      </div>
                      <button
                        onClick={() => {
                          setFeaturedWisdom([])
                          setFeaturedWisdomLoading(true)
                          cloudRunService.getPublicFeaturedWisdom()
                            .then(data => setFeaturedWisdom(data))
                            .catch(() => setFeaturedWisdom([]))
                            .finally(() => setFeaturedWisdomLoading(false))
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                      >
                        <Globe size={13} />
                        Refresh
                      </button>
                    </div>
                    <FeaturedWisdomFeed items={dedupedWisdom} loading={featuredWisdomLoading} />
                  </div>
                )
              })()}

              {/* ── Fusion Lab (inline, only when ≥ 2 agents) ─── */}
              {displayedAgents.length >= 2 && (
                <NeuralFusionLab
                  agents={displayedAgents}
                  walletConnected={walletConnected}
                  userBalance={userBalance ?? 0}
                  proposalCounts={proposalCounts}
                  onConnectWallet={() => handleWalletConnect('')}
                  onInitiateFusion={() => setBreedingDialogOpen(true)}
                  onConfigureAgent={handleConfigureAgent}
                  onChatWithAgent={handleChatWithAgent}
                  onViewEvolution={handleViewEvolution}
                  onToggleAutoReplenish={handleToggleAutoReplenish}
                  onOpenProposals={(a) => setProposalModalAgent(a)}
                  onDeleteAgent={handleDeleteAgent}
                  onRetrySpawn={handleRetrySpawn}
                  onCooldownBoost={handleCooldownBoost}
                />
              )}

              {/* ── How the Agentic Economy Works ─────────── */}
              <Card className="glass-card-hover border border-primary/20 overflow-hidden">
                <div className="p-5 flex items-center gap-3 border-b border-primary/10">
                  <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <FlowArrow className="text-primary" weight="duotone" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">How the Agentic Economy Works</h3>
                    <p className="text-xs text-muted-foreground">System architecture — from event to on-chain NFT</p>
                  </div>
                </div>
                <div className="p-5">
                  <ArchitectureFlow currentPhase={displayedAgents.length > 0 ? (displayedAgents[0].eventsAttended >= 5 ? 4 : Math.min(Math.floor(displayedAgents[0].eventsAttended / 1.5) + 1, 3)) : 0} />
                </div>
              </Card>
              </div>
            </>
          )}

          {/* ── Analytics ─────────────────────────────── */}
          {mainView === 'analytics' && (
            <AnalyticsView agents={displayedAgents} events={displayedEvents} nfts={displayedNFTs} />
          )}

          {/* ── NFT Vault ─────────────────────────────── */}
          {/* -- NFT Vault ------------------------------- */}
          {mainView === 'vault' && (
            <VaultView
              displayedAgents={displayedAgents}
              displayedEvents={displayedEvents}
              displayedNFTs={displayedNFTs}
              selectedChainId={selectedChainId}
              verificationData={verificationData}
              setMainView={setMainView}
              isViewOnly={isViewOnly}
              onOpenMetadata={(nft) => { setSelectedNFT(nft); setNFTMetadataDialogOpen(true) }}
              onOpenBatchIPFS={() => setBatchIPFSDialogOpen(true)}
              startTransition={startTransition}
            />
          )}


          {mainView === 'marketplace' && (
            <MarketplaceView
              marketplaceAgents={marketplaceAgents ?? []}
              purchasingAgentId={purchasingAgentId}
              onBuy={handleBuyAgent}
            />
          )}


        </main>
      </div>

      <SpawnAgentDialog
        open={spawnDialogOpen}
        onOpenChange={setSpawnDialogOpen}
        onAgentCreated={handleAgentCreated}
        userWallet={walletAddress}
        chainId={selectedChainId}
        originalAgentCount={displayedAgents.filter(a =>
          a.ownershipStatus === 'original-creator' && (a.chainId ?? DEFAULT_CHAIN_ID) === selectedChainId
        ).length}
        bredAgentCount={displayedAgents.filter(a =>
          a.ownershipStatus === 'bred' && (a.chainId ?? DEFAULT_CHAIN_ID) === selectedChainId
        ).length}
      />

      {selectedAgent && (
        <>
          <WisdomReportDialog
            open={wisdomDialogOpen}
            onOpenChange={setWisdomDialogOpen}
            agent={selectedAgent}
          />
          <AgentConfigDialog
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
            agent={selectedAgent}
            onSave={handleSaveAgentConfig}
          />
          <AgentChatDialog
            open={chatDialogOpen}
            onOpenChange={setChatDialogOpen}
            agent={selectedAgent}
          />
          <AgentEvolutionDialog
            open={evolutionDialogOpen}
            onOpenChange={setEvolutionDialogOpen}
            agent={selectedAgent}
            allAgents={agents ?? []}
          />
        </>
      )}

      <NFTMetadataDialog
        open={nftMetadataDialogOpen}
        onOpenChange={setNFTMetadataDialogOpen}
        nft={selectedNFT}
      />

      <BatchIPFSUploadDialog
        open={batchIPFSDialogOpen}
        onOpenChange={setBatchIPFSDialogOpen}
        events={events ?? []}
        agents={agents ?? []}
        onBatchComplete={handleBatchIPFSComplete}
      />

      <TransactionSignatureModal
        open={signatureModalOpen}
        onOpenChange={setSignatureModalOpen}
        proposal={selectedProposal}
        onConfirm={handleConfirmProposal}
        onCancel={() => setSignatureModalOpen(false)}
        walletAddress={walletAddress}
      />

      <AgentBreedingDialog
        open={breedingDialogOpen}
        onOpenChange={setBreedingDialogOpen}
        agents={agents ?? []}
        onBreedComplete={handleBreedComplete}
        userBalance={userBalance ?? 0}
        userWallet={walletAddress ?? ''}
      />

      {selectedAgentForTopUp && (
        <TopUpGasDialog
          open={topUpDialogOpen}
          onOpenChange={(open) => {
            setTopUpDialogOpen(open)
            if (!open) {
              setPendingAttendContext(null)
            }
          }}
          agent={selectedAgentForTopUp}
          userBalance={userBalance ?? 0}
          onTopUp={handleTopUpAgentGas}
        />
      )}

      {proposalModalAgent && (
        <ProposalModal
          open={!!proposalModalAgent}
          onOpenChange={(open) => { if (!open) setProposalModalAgent(null) }}
          agent={proposalModalAgent}
          onProposalCountChange={handleProposalCountChange}
        />
      )}

      <TerminalConsole logs={logs} />
      <Toaster />
    </div>
  )
}

export default App
