import { useState, useEffect, startTransition } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { Agent, NFT, TerminalLog, Event, ScoutedEvent, SubAgentType, AgentProposal, MarketplaceAgent, Niche, RarityTier } from '@/lib/types'
import { getMockAgents, getMockNFTs, getMockEvents, getMockProposals, getMockMarketplaceAgents } from '@/lib/mockData'
import { cn } from '@/lib/utils'
import { AgentCard } from '@/components/AgentCard'
import { MarketplaceAgentCard } from '@/components/MarketplaceAgentCard'
import { MarketplaceFilters } from '@/components/MarketplaceFilters'
import { GasPriceMonitor } from '@/components/GasPriceMonitor'
import { NFTCard } from '@/components/NFTCard'
import { SpawnAgentDialog } from '@/components/SpawnAgentDialog'
import { TerminalConsole } from '@/components/TerminalConsole'
import { WalletConnect } from '@/components/WalletConnect'
import { WisdomReportDialog } from '@/components/WisdomReportDialog'
import { AgentConfigDialog } from '@/components/AgentConfigDialog'
import { AnalyticsCharts } from '@/components/AnalyticsCharts'
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
import { VerificationDashboard } from '@/components/VerificationDashboard'
import { AgentEvolutionDialog } from '@/components/AgentEvolutionDialog'
import { PendingProposals } from '@/components/PendingProposals'
import { TransactionSignatureModal } from '@/components/TransactionSignatureModal'
import { TopUpGasDialog } from '@/components/TopUpGasDialog'
import { GenesisMintConfirmation } from '@/components/GenesisMintConfirmation'
import { SecurityAuditLog } from '@/components/SecurityAuditLog'
import { GlobalSecurityAuditLog } from '@/components/GlobalSecurityAuditLog'
import { AgentBreedingDialog } from '@/components/AgentBreedingDialog'
import { FusionCooldownTimer } from '@/components/FusionCooldownTimer'
import { BreedingCooldownBoost } from '@/components/BreedingCooldownBoost'
import { ProactiveScoutingPanel } from '@/components/ProactiveScoutingPanel'
import { Sparkle, Robot, Wallet as WalletIcon, ChartLine, Globe, Plus, Brain, CloudArrowUp, FlowArrow, ShieldCheck, ShieldWarning, Storefront, Dna, Newspaper } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useBlockchain } from '@/hooks/useBlockchain'
import { ipfsService } from '@/lib/ipfs/ipfsService'
import { useSubAgentTasks } from '@/hooks/useSubAgentTasks'
import { CloudRunAPIError, cloudRunService, validateEventUrl } from '@/services/cloudRunService'
import { ContractVerificationData, verificationService } from '@/lib/blockchain/verificationService'
import { CONTRACT_ADDRESSES } from '@/lib/blockchain/config'
import { mantleService } from '@/lib/blockchain/mantleService'

const simulationMessages = [
  { type: 'secretary', messages: ['Scanning Luma events...', 'Registering for DeFi Summit 2026...', 'Checking Eventbrite for new conferences...', 'Joining Web3 Workshop...'] },
  { type: 'scribe', messages: ['Transcribing YouTube podcast...', 'Extracting key insights from video...', 'Analyzing speaker sentiment...', 'Processing audio content...'] },
  { type: 'social-lite', messages: ['Monitoring Telegram channel...', 'Checking Discord notifications...', 'Analyzing community sentiment...', 'Engaging with community members...'] },
  { type: 'mint-master', messages: ['Estimating Mantle gas fees...', 'Optimizing transaction parameters...', 'Preparing NFT metadata...', 'Calculating optimal mint timing...'] }
]

const NICHE_SCOUT_KEYWORDS: Record<Niche, string[]> = {
  'Blockchain/DeFi': ['blockchain', 'defi', 'mantle', 'layer 2', 'rollup', 'smart contract', 'on-chain'],
  'Trading/Investment': ['trading', 'investment', 'market', 'portfolio', 'analysis', 'quant', 'risk'],
  'Technology': ['technology', 'ai', 'agent', 'developer', 'infrastructure', 'architecture', 'automation'],
  'Health/Wellness': ['health', 'wellness', 'fitness', 'preventive', 'lifestyle', 'mental', 'nutrition'],
}

function tokenizeScoutText(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4)
}

function computeScoutRelevance(agent: Agent, source: Event): number {
  const base = 55
  const nicheKeywords = NICHE_SCOUT_KEYWORDS[agent.niche] || []
  const agendaKeywords = tokenizeScoutText(agent.customAgenda || '')
  const queryKeywords = [...new Set([...nicheKeywords, ...agendaKeywords])]
  const searchable = `${source.title} ${source.summary} ${source.url} ${source.platform}`.toLowerCase()

  const keywordHits = queryKeywords.reduce((acc, keyword) => (
    searchable.includes(keyword.toLowerCase()) ? acc + 1 : acc
  ), 0)

  const platformBoost = source.platform === 'YouTube' || source.platform === 'Luma' ? 6 : 3
  const recencyDays = Math.max(0, Math.floor((Date.now() - source.date) / (24 * 60 * 60 * 1000)))
  const recencyBoost = Math.max(0, 12 - Math.min(12, recencyDays))

  return Math.min(98, base + (keywordHits * 7) + platformBoost + recencyBoost)
}

function buildScoutedOpportunities(agent: Agent, eventPool: Event[]): ScoutedEvent[] {
  const existingUrls = new Set(
    eventPool
      .filter((evt) => evt.agentId === agent.id)
      .map((evt) => evt.url.trim().toLowerCase())
  )

  const dedupedByUrl = new Map<string, Event>()
  eventPool.forEach((evt) => {
    const key = evt.url.trim().toLowerCase()
    if (!key) return
    const previous = dedupedByUrl.get(key)
    if (!previous || evt.date > previous.date) {
      dedupedByUrl.set(key, evt)
    }
  })

  const ranked = Array.from(dedupedByUrl.values())
    .filter((evt) => !existingUrls.has(evt.url.trim().toLowerCase()))
    .map((evt) => ({
      source: evt,
      relevance: computeScoutRelevance(agent, evt),
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5)

  const now = Date.now()
  return ranked.map(({ source, relevance }, idx) => ({
    id: `scouted-${agent.id}-${source.id}-${idx}`,
    title: source.title,
    platform: source.platform,
    url: source.url,
    date: now + ((idx + 1) * 2 * 24 * 60 * 60 * 1000),
    description: source.summary,
    relevanceScore: relevance,
    scoutedAt: now,
    approved: false,
  }))
}

function App() {
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
  type MainView = 'dashboard' | 'analytics' | 'vault' | 'marketplace' | 'discover'
  const HASH_TO_VIEW: Record<string, MainView> = { analytics: 'analytics', 'nft-vault': 'vault', discover: 'discover', marketplace: 'marketplace' }
  const VIEW_TO_HASH: Record<MainView, string> = { dashboard: '', analytics: 'analytics', vault: 'nft-vault', discover: 'discover', marketplace: 'marketplace' }
  const [mainView, setMainView] = useState<MainView>(() => {
    const hashView = HASH_TO_VIEW[window.location.hash.slice(1)]
    if (hashView) return hashView
    // Public users land on Discover to see live on-chain wisdom immediately
    const hasWallet = typeof window !== 'undefined' && !!(window.ethereum as { selectedAddress?: string } | undefined)?.selectedAddress
    return hasWallet ? 'dashboard' : 'discover'
  })
  useEffect(() => {
    const hash = VIEW_TO_HASH[mainView]
    if (hash) {
      window.location.hash = hash
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [mainView])

  const [lastSocialPost, setLastSocialPost] = useState<{ agentId: string; text: string; eventTitle: string } | null>(null)

  const [featuredWisdom, setFeaturedWisdom] = useState<WisdomFeedItem[]>([])
  const [featuredWisdomLoading, setFeaturedWisdomLoading] = useState(false)
  const [marketplaceFilters, setMarketplaceFilters] = useState<{
    generation: number[]
    niche: Niche[]
    rarityTier: RarityTier[]
    sortBy: 'price-asc' | 'price-desc' | 'level-desc' | 'generation-desc' | 'wisdom-desc' | 'rarity-desc'
  }>({
    generation: [],
    niche: [],
    rarityTier: [],
    sortBy: 'level-desc'
  })
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
  const [proposals, setProposals] = useLocalStorage<AgentProposal[]>('maef-proposals', [])
  const [userBalance, setUserBalance] = useLocalStorage<number>('maef-user-balance', 45.50)
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false)
  const [genesisMintDialogOpen, setGenesisMintDialogOpen] = useState(false)
  const [selectedAgentForTopUp, setSelectedAgentForTopUp] = useState<Agent | null>(null)
  const [pendingAttendContext, setPendingAttendContext] = useState<PendingAttendContext | null>(null)
  const [marketplaceAgents, setMarketplaceAgents] = useLocalStorage<MarketplaceAgent[]>('maef-marketplace', getMockMarketplaceAgents())
  const [purchasingAgentId, setPurchasingAgentId] = useState<string | null>(null)
  const [breedingDialogOpen, setBreedingDialogOpen] = useState(false)
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

  // Fetch public featured wisdom when Discover tab is opened
  useEffect(() => {
    if (mainView !== 'discover') return
    if (featuredWisdom.length > 0) return // already loaded this session
    setFeaturedWisdomLoading(true)
    cloudRunService.getPublicFeaturedWisdom()
      .then(data => setFeaturedWisdom(data))
      .catch(() => setFeaturedWisdom([]))
      .finally(() => setFeaturedWisdomLoading(false))
  }, [mainView]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleWalletConnect = async (address: string) => {
    try {
      const connectedAddress = await blockchain.connectWallet()
      setWalletConnected(true)
      setWalletAddress(connectedAddress)
      toast.success('Wallet connected successfully!', {
        description: `Connected to Mantle Network`
      })
      // Load cloud state persisted in Firestore for this wallet
      const cloudAgents = await cloudRunService.getAgentsByWallet(connectedAddress)
      const cloudHistory = await cloudRunService.getEventHistoryByWallet(connectedAddress)

      const restoredEvents: Event[] = cloudHistory.map((item) => ({
        id: item.id,
        agentId: item.agentId,
        url: item.eventUrl,
        title: item.eventTitle,
        platform: normalizePlatform(item.platform),
        date: item.attendedAt > 0 ? item.attendedAt * 1000 : Date.now(),
        summary: item.wisdomSummary,
        status: 'completed',
      }))

      const restoredNFTs: NFT[] = cloudHistory
        .filter((item) => item.txHash)
        .map((item) => ({
          id: `nft-${item.id}`,
          agentId: item.agentId,
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
              message: `[${agentName} - Mint-Master] NFT minted on Mantle. TX: ${item.txHash.slice(0, 18)}...`,
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
              const balStr = await blockchain.getBalance(a.walletAddress)
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
    setWalletConnected(false)
    setWalletAddress(undefined)
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
            description: 'Contract is now visible on Mantle Explorer',
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
      }
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
      if (host.includes('lu.ma')) return 'Luma'
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

  const handleAttendEvent = async () => {
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
        modeB: true,  // Enable autonomous signing by default for demo impact
      })

      const signingMode = result.txHash ? (result.txHash.includes('agent') ? 'Agent' : 'Backend') : 'Unknown'
      addLog(agent.id, 'scribe', `[${agent.name} - Scribe] Wisdom generated: "${result.wisdomSummary.slice(0, 80)}..."`, 'success')
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Transaction signed by ${signingMode}. TX: ${result.txHash.slice(0, 18)}...`, 'info')
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] NFT minted on Mantle! Token #${result.tokenId} | Block ${result.blockNumber}`, 'success')
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Gas used: ${Number(result.gasUsed || 0).toLocaleString()} units`, 'info')
      const nicheTag = agent.niche === 'Blockchain/DeFi' ? '#DeFi #Web3 #Mantle' : agent.niche === 'Trading/Investment' ? '#Trading #Crypto #DeFi' : agent.niche === 'Technology' ? '#Tech #AI #Web3' : '#Health #Wellness #Web3'
      const shortWisdom = result.wisdomSummary.length > 110 ? result.wisdomSummary.slice(0, 110) + '…' : result.wisdomSummary
      const socialPostText = `My AI agent ${agent.name} just attended "${eventTitle}" and minted a Proof-of-Attendance NFT on @MantleNetwork!\n\nKey insight: "${shortWisdom}"\n\nNFT #${result.tokenId} ${nicheTag} #MAEF`
      setLastSocialPost({ agentId: agent.id, text: socialPostText, eventTitle })
      addLog(agent.id, 'social-lite', `[${agent.name} - Social-Lite] Post draft ready for "${eventTitle}"`, 'success')

      const newEvent: Event = {
        id: `event-${Date.now()}`,
        agentId: agent.id,
        url: eventUrl.trim(),
        title: eventTitle,
        platform,
        date: Date.now(),
        summary: result.wisdomSummary,
        status: 'completed',
      }

      const newNFT: NFT = {
        id: `nft-${Date.now()}`,
        agentId: agent.id,
        eventId: newEvent.id,
        eventTitle,
        summary: result.wisdomSummary,
        date: Date.now(),
        transactionHash: result.txHash,
        tokenId: result.tokenId,
        explorerUrl: result.explorerUrl,
        imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT',
      }

      // Use authoritative stats from backend (Firestore-persisted), fallback to local increment
      const newEventsAttended = result.newTotalEvents ?? (agent.eventsAttended + 1)
      const newLevel = result.newLevel ?? (result.levelUp ? agent.level + 1 : agent.level)
      let refreshedBalance: number | undefined
      try {
        const nextBalance = await blockchain.getBalance(agent.walletAddress)
        refreshedBalance = parseFloat(nextBalance)
      } catch {
        refreshedBalance = undefined
      }

      setEvents(c => [...(c ?? []), newEvent])
      setNFTs(c => [...(c ?? []), newNFT])
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

      toast.success(`NFT #${result.tokenId} minted on Mantle Sepolia!`, {
        description: `Token ID: ${result.tokenId} | Gas: ${Number(result.gasUsed || 0).toLocaleString()} units`,
        action: {
          label: 'View Agent Wisdom on MantleScan',
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
    const agent = (agents ?? []).find((a) => a.id === agentId)
    if (!agent) {
      throw new Error('Agent not found for gas top-up')
    }

    const tx = await mantleService.topUpAgentGas(agent.walletAddress, amount)
    if (!tx.success) {
      throw new Error(tx.error || 'Gas top-up transaction failed')
    }

    // Keep local balances reasonably in sync until the next full hydration.
    const txFee = Number(tx.gasUsed || 0)
    setUserBalance((current) => (current ?? 0) - amount - txFee)

    let refreshedAgentBalance = agent.agentGasBalance
    try {
      const bal = await blockchain.getBalance(agent.walletAddress)
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

  const stats = [
    { label: 'Active Agents', value: displayedAgents.length, icon: Robot, color: 'text-primary' },
    { label: 'NFTs Minted', value: displayedNFTs.length, icon: WalletIcon, color: 'text-secondary' },
    { label: 'Events Attended', value: displayedEvents.length, icon: Globe, color: 'text-primary' },
    { label: 'Wisdom Unlocked', value: displayedAgents.filter(a => a.wisdomUnlocked).length, icon: ChartLine, color: 'text-secondary' }
  ]

  const filteredAndSortedMarketplace = () => {
    let filtered = [...(marketplaceAgents ?? [])]
    
    if (marketplaceFilters.generation.length > 0) {
      filtered = filtered.filter(a => marketplaceFilters.generation.includes(a.generation ?? 1))
    }
    
    if (marketplaceFilters.niche.length > 0) {
      filtered = filtered.filter(a => marketplaceFilters.niche.includes(a.niche))
    }
    
    filtered.sort((a, b) => {
      switch (marketplaceFilters.sortBy) {
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'level-desc':
          return b.level - a.level
        case 'wisdom-desc':
          return b.eventsAttended - a.eventsAttended
        case 'generation-desc':
          return (b.generation ?? 1) - (a.generation ?? 1)
        default:
          return 0
      }
    })
    
    return filtered
  }

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
        <header className="border-b border-primary/20 backdrop-blur-xl bg-background/70 sticky top-0 z-40 shadow-lg shadow-primary/5">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Logo — left */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center animate-glow-pulse shadow-lg shadow-primary/50">
                    <Sparkle size={20} className="text-background" weight="fill" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-secondary blur-xl opacity-50 -z-10" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-none">MAEF</h1>
                  <p className="text-[10px] text-muted-foreground font-mono hidden sm:block leading-none mt-0.5">Mantle Agentic Event Factory</p>
                </div>
              </div>

              {/* Nav — center */}
              <nav className="flex items-center gap-0.5 flex-1 justify-center">
                {([
                  { view: 'dashboard', label: 'Dashboard', icon: Robot, color: 'primary' },
                  { view: 'analytics', label: 'Analytics', icon: ChartLine, color: 'primary' },
                  { view: 'vault', label: 'NFT Vault', icon: WalletIcon, color: 'primary' },
                  { view: 'discover', label: 'Discover', icon: Newspaper, color: 'accent' },
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
                  Turn Information Overload into On-Chain Wisdom.
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-5">
                  MAEF deploys sovereign AI agents that autonomously attend digital events, distill actionable intelligence, and cement verified knowledge as NFTs on the Mantle blockchain — without human intervention.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground/70 font-mono">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-primary rounded-full inline-block" />Agent self-signs every transaction</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-secondary rounded-full inline-block" />Gemini 2.5 Flash wisdom extraction</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-accent rounded-full inline-block" />Verified on Mantle Sepolia</span>
                </div>
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
              {(() => {
                const [attendAgentId, setAttendAgentId] = [
                  (selectedAgent ?? displayedAgents[0])?.id ?? '',
                  (id: string) => { const a = displayedAgents.find(x => x.id === id); if (a) setSelectedAgent(a) }
                ]
                const activeAgent = displayedAgents.find(a => a.id === attendAgentId) ?? displayedAgents[0]
                return (
                  <Card className="glass-card-hover p-6 border-2 border-primary/20">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                        <Globe className="text-primary" weight="duotone" size={22} />
                      </div>
                      <span>Attend Event</span>
                      {displayedAgents.length > 1 && (
                        <select
                          value={attendAgentId}
                          onChange={e => setAttendAgentId(e.target.value)}
                          className="ml-auto text-xs font-mono bg-background/50 border border-primary/30 rounded-md px-2 py-1 text-foreground cursor-pointer"
                        >
                          {displayedAgents.map(a => (
                            <option key={a.id} value={a.id}>{a.name} (Lv {a.level})</option>
                          ))}
                        </select>
                      )}
                    </h2>
                    <div className="flex gap-3 mb-3">
                      <Input
                        placeholder="Enter YouTube or Luma event URL..."
                        value={eventUrl}
                        onChange={(e) => setEventUrl(e.target.value)}
                        className="flex-1 border-primary/30 focus:border-primary bg-background/50 font-mono text-sm"
                      />
                      <Button
                        onClick={!walletConnected ? () => handleWalletConnect('') : handleAttendEvent}
                        disabled={walletConnected && !eventUrl.trim()}
                        className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold px-6 shadow-lg shadow-secondary/30"
                      >
                        {!walletConnected ? 'Connect & Attend' : 'Attend Event'}
                      </Button>
                    </div>
                    {backendConnected && activeAgent && (
                      <div className="flex items-center gap-3 pt-2 border-t border-primary/10">
                        <span className="text-xs text-muted-foreground">Auto Scout</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunAutoScout(activeAgent.id)}
                          disabled={scoutingAgentId === activeAgent.id}
                          className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 text-xs font-semibold"
                        >
                          {scoutingAgentId === activeAgent.id ? 'Secretary searching...' : 'Run Auto Scout'}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {activeAgent.name} discovers &amp; attends a {activeAgent.niche} event autonomously
                        </span>
                      </div>
                    )}
                  </Card>
                )
              })()}

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
                      <h3 className="text-lg font-bold mb-2">Spawn Your First AI Agent</h3>
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

              {/* ── Fusion Lab (inline, only when ≥ 2 agents) ─── */}
              {displayedAgents.length >= 2 && (
                <Card className="glass-card-hover p-5 border border-accent/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
                        <Dna className="text-accent" weight="duotone" size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">Neural Fusion Lab</h3>
                        <p className="text-xs text-muted-foreground">Merge wisdom-unlocked agents to breed powerful hybrids</p>
                      </div>
                    </div>
                    <Button
                      onClick={!walletConnected ? () => handleWalletConnect('') : () => setBreedingDialogOpen(true)}
                      disabled={walletConnected && displayedAgents.filter(a => a.wisdomUnlocked).length < 2}
                      size="sm"
                      className="bg-gradient-to-r from-accent to-secondary hover:opacity-90 font-semibold shadow-lg shadow-accent/20"
                    >
                      <Dna className="mr-1.5" weight="duotone" size={14} />
                      {!walletConnected ? 'Connect to Fuse' : 'Initiate Fusion'}
                    </Button>
                  </div>
                  {walletConnected && displayedAgents.filter(a => a.wisdomUnlocked).length < 2 && (
                    <p className="text-xs text-muted-foreground">
                      Need {Math.max(0, 2 - displayedAgents.filter(a => a.wisdomUnlocked).length)} more wisdom-unlocked agent(s) — attend more events to unlock
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {displayedAgents.map((agent, idx) => {
                      const isOnCooldown = agent.lastBreedingTime && agent.breedingCooldownHours &&
                        (Date.now() - agent.lastBreedingTime) < (agent.breedingCooldownHours * 60 * 60 * 1000)
                      return (
                        <motion.div key={agent.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.08 }} className="space-y-2">
                          <AgentCard agent={agent} onConfigure={handleConfigureAgent} onChat={handleChatWithAgent} onViewEvolution={handleViewEvolution} onToggleAutoReplenish={handleToggleAutoReplenish} />
                          {isOnCooldown && (
                            <div className="space-y-2">
                              <FusionCooldownTimer agent={agent} />
                              <BreedingCooldownBoost agent={agent} userBalance={userBalance ?? 0} onBoost={handleCooldownBoost} />
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </Card>
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
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <ChartLine className="text-primary" weight="duotone" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Event Analytics</h2>
                  <p className="text-sm text-muted-foreground">Agent performance, event trends, platform insights</p>
                </div>
              </div>
              <AnalyticsCharts agents={displayedAgents} events={displayedEvents} nfts={displayedNFTs} />
            </motion.div>
          )}

          {/* ── Discover ─────────────────────────────── */}
          {mainView === 'discover' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Autonomous Matrix — platform live stats for public users */}
              {platformMetrics && (
                <Card className="glass-card p-4 border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                      <span className="text-emerald-400 font-semibold uppercase tracking-widest text-[10px]">Mantle Autonomous Matrix</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <Robot size={13} className="text-primary" weight="duotone" />
                      <span className="text-foreground font-bold">{platformMetrics.total_agents}</span>
                      <span className="text-muted-foreground">autonomous citizens</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <Brain size={13} className="text-accent" weight="duotone" />
                      <span className="text-foreground font-bold">{platformMetrics.total_wisdom_nfts}</span>
                      <span className="text-muted-foreground">on-chain mint events</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <Globe size={13} className="text-secondary" weight="duotone" />
                      <span className="text-foreground font-bold">{platformMetrics.total_events_attended}</span>
                      <span className="text-muted-foreground">events attended</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <ChartLine size={13} className="text-amber-400" weight="duotone" />
                      <span className="text-foreground font-bold">Lv {platformMetrics.average_agent_level.toFixed(1)}</span>
                      <span className="text-muted-foreground">avg agent level</span>
                    </div>
                    {!walletConnected && (
                      <Button
                        size="sm"
                        onClick={() => handleWalletConnect('')}
                        className="ml-auto bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold text-xs shadow-lg shadow-secondary/30"
                      >
                        <Plus className="mr-1" weight="bold" size={12} />
                        Spawn Your Agent
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
                  <Newspaper className="text-accent" weight="duotone" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Featured Wisdom</h2>
                  <p className="text-sm text-muted-foreground">
                    Real insights generated by AI agents — minted as NFTs on Mantle
                  </p>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => {
                      setFeaturedWisdom([])
                      setFeaturedWisdomLoading(true)
                      cloudRunService.getPublicFeaturedWisdom()
                        .then(data => setFeaturedWisdom(data))
                        .catch(() => setFeaturedWisdom([]))
                        .finally(() => setFeaturedWisdomLoading(false))
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Globe size={13} />
                    Refresh
                  </button>
                </div>
              </div>
              <FeaturedWisdomFeed items={featuredWisdom} loading={featuredWisdomLoading} />
            </motion.div>
          )}

          {/* ── NFT Vault ─────────────────────────────── */}
          {mainView === 'vault' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <WalletIcon className="text-primary" weight="duotone" size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      NFT Vault
                      <span className="text-sm text-muted-foreground font-normal">({displayedNFTs.length} NFTs)</span>
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-xs text-muted-foreground font-mono">Mantle Sepolia</p>
                    </div>
                  </div>
                </div>
                {displayedEvents.filter(e => e.status === 'completed').length > 0 && (
                  <Button
                    onClick={() => setBatchIPFSDialogOpen(true)}
                    disabled={isViewOnly}
                    size="sm"
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 font-semibold shadow-lg shadow-primary/30"
                  >
                    <CloudArrowUp className="mr-2" weight="duotone" size={16} />
                    Batch Upload to IPFS
                  </Button>
                )}
              </div>

              {displayedNFTs.length === 0 ? (
                <Card className="glass-card-hover p-12 text-center border-2 border-dashed border-primary/30">
                  <WalletIcon size={56} className="mx-auto mb-4 text-muted-foreground opacity-50 animate-float" weight="duotone" />
                  <h3 className="text-lg font-semibold mb-2">No NFTs Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    Attend events with your agents to mint Proof-of-Attendance NFTs on Mantle Sepolia
                  </p>
                  <Button
                    onClick={() => startTransition(() => setMainView('dashboard'))}
                    className="bg-gradient-to-r from-secondary to-accent font-semibold shadow-lg shadow-secondary/30"
                  >
                    <Globe className="mr-2" weight="duotone" />
                    Go to Dashboard
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayedNFTs.map((nft, idx) => (
                    <motion.div
                      key={nft.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.06 }}
                    >
                      <NFTCard
                        nft={nft}
                        onClick={() => { setSelectedNFT(nft); setNFTMetadataDialogOpen(true) }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── Contract Verification History ─────── */}
              {verificationData && verificationData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <ShieldCheck className="text-emerald-500" weight="duotone" size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">Contract Verification</h3>
                      <p className="text-xs text-muted-foreground">On-chain smart contract verification status per agent</p>
                    </div>
                  </div>
                  <VerificationDashboard verifications={verificationData} />
                </div>
              )}
            </motion.div>
          )}

          {mainView === 'marketplace' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 animate-slide-up"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 border border-secondary/40 flex items-center justify-center">
                    <Storefront className="text-secondary" weight="duotone" size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Agent Marketplace</h2>
                    <p className="text-sm text-muted-foreground">Buy pre-trained agents — identity wiped, wisdom inherited</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  {marketplaceAgents?.length ?? 0} available · 1.8–4.5 MNT
                </div>
              </div>

              <MarketplaceFilters
                filters={marketplaceFilters}
                onFiltersChange={setMarketplaceFilters}
                totalAgents={marketplaceAgents?.length ?? 0}
              />

              {!marketplaceAgents || marketplaceAgents.length === 0 ? (
                <Card className="glass-card-hover p-12 text-center border-2 border-dashed border-secondary/30">
                  <Storefront size={64} className="mx-auto mb-4 text-muted-foreground animate-float" weight="duotone" />
                  <h3 className="text-lg font-semibold mb-2">No Agents Available</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Check back later for agents listed by other users.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedMarketplace().map((agent, idx) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <MarketplaceAgentCard 
                        agent={agent} 
                        onBuy={handleBuyAgent}
                        isPurchasing={purchasingAgentId === agent.id}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}


        </main>
      </div>

      <SpawnAgentDialog
        open={spawnDialogOpen}
        onOpenChange={setSpawnDialogOpen}
        onAgentCreated={handleAgentCreated}
        userWallet={walletAddress}
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

      <TerminalConsole logs={logs} />
      <Toaster />
    </div>
  )
}

export default App
