import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { Agent, NFT, TerminalLog, Event, SubAgentType } from '@/lib/types'
import { getMockAgents, getMockNFTs, getMockEvents } from '@/lib/mockData'
import { AgentCard } from '@/components/AgentCard'
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
import { NeuralNetworkBackground } from '@/components/NeuralNetworkBackground'
import { BackendHealthModal } from '@/components/BackendHealthModal'
import { ArchitectureFlow } from '@/components/ArchitectureFlow'
import { SubAgentDelegation } from '@/components/SubAgentDelegation'
import { ContractDeploymentProgress } from '@/components/ContractDeploymentProgress'
import { ContractVerificationTracker } from '@/components/ContractVerificationTracker'
import { VerificationDashboard } from '@/components/VerificationDashboard'
import { Sparkle, Robot, Wallet as WalletIcon, ChartLine, Globe, Plus, Brain, CloudArrowUp, FlowArrow, ShieldCheck } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useBlockchain } from '@/hooks/useBlockchain'
import { ipfsService } from '@/lib/ipfs/ipfsService'
import { useSubAgentTasks } from '@/hooks/useSubAgentTasks'
import { cloudRunService } from '@/services/cloudRunService'
import { ContractVerificationData, verificationService } from '@/lib/blockchain/verificationService'

const simulationMessages = [
  { type: 'secretary', messages: ['Scanning Luma events...', 'Registering for DeFi Summit 2026...', 'Checking Eventbrite for new conferences...', 'Joining Web3 Workshop...'] },
  { type: 'scribe', messages: ['Transcribing YouTube podcast...', 'Extracting key insights from video...', 'Analyzing speaker sentiment...', 'Processing audio content...'] },
  { type: 'social-lite', messages: ['Monitoring Telegram channel...', 'Checking Discord notifications...', 'Analyzing community sentiment...', 'Engaging with community members...'] },
  { type: 'mint-master', messages: ['Estimating Mantle gas fees...', 'Optimizing transaction parameters...', 'Preparing NFT metadata...', 'Calculating optimal mint timing...'] }
]

function App() {
  const [agents, setAgents] = useKV<Agent[]>('maef-agents', getMockAgents())
  const [nfts, setNFTs] = useKV<NFT[]>('maef-nfts', getMockNFTs())
  const [events, setEvents] = useKV<Event[]>('maef-events', getMockEvents())
  const [logs, setLogs] = useState<TerminalLog[]>([])
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>()
  const blockchain = useBlockchain()
  
  useEffect(() => {
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
  }, [agents])
  
  const [spawnDialogOpen, setSpawnDialogOpen] = useState(false)
  const [wisdomDialogOpen, setWisdomDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [chatDialogOpen, setChatDialogOpen] = useState(false)
  const [nftMetadataDialogOpen, setNFTMetadataDialogOpen] = useState(false)
  const [batchIPFSDialogOpen, setBatchIPFSDialogOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null)
  const [selectedTab, setSelectedTab] = useState('dashboard')
  const [eventUrl, setEventUrl] = useState('')
  const [isProcessingEvent, setIsProcessingEvent] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [healthCheckOpen, setHealthCheckOpen] = useState(true)
  const [backendConnected, setBackendConnected] = useState(false)
  const [deployingAgentId, setDeployingAgentId] = useState<string | null>(null)
  const [verificationData, setVerificationData] = useKV<ContractVerificationData[]>('maef-verifications', [])
  const [activeVerifications, setActiveVerifications] = useState<Set<string>>(new Set())
  
  const { tasks, startWorkflow, clearTasks } = useSubAgentTasks(activeAgentId, isProcessingEvent)

  const handleHealthConfirmed = () => {
    setBackendConnected(true)
  }

  const handleWalletConnect = async (address: string) => {
    try {
      const connectedAddress = await blockchain.connectWallet()
      setWalletConnected(true)
      setWalletAddress(connectedAddress)
      toast.success('Wallet connected successfully!', {
        description: `Connected to Mantle Network`
      })
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
    toast.info('Wallet disconnected')
  }

  const handleAgentCreated = (newAgent: Agent) => {
    setAgents((current) => [...(current ?? []), newAgent])
    setDeployingAgentId(newAgent.id)
    
    toast.success(`Agent "${newAgent.name}" spawned successfully!`, {
      description: `Wallet: ${newAgent.walletAddress.slice(0, 10)}...`
    })
    
    addLog(newAgent.id, 'secretary', `[${newAgent.name} - secretary] Agent initialization complete`, 'success')
    
    addLog(newAgent.id, 'secretary', `[${newAgent.name} - secretary] Deploying smart contract on Mantle Network...`, 'info')
    
    const mockContractAddress = `0x${Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`
    
    const mockDeploymentTx = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`

    setActiveVerifications((current) => new Set([...current, mockContractAddress]))

    verificationService.trackContractVerification(
      mockContractAddress,
      newAgent.id,
      newAgent.name,
      mockDeploymentTx,
      (verificationData) => {
        setVerificationData((current) => {
          const existing = (current ?? []).filter(v => v.contractAddress !== mockContractAddress)
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
            next.delete(mockContractAddress)
            return next
          })
        } else if (verificationData.verificationStatus === 'failed') {
          toast.error(`Contract verification failed for ${newAgent.name}`, {
            description: verificationData.errorMessage
          })
          setActiveVerifications((current) => {
            const next = new Set(current)
            next.delete(mockContractAddress)
            return next
          })
        }
      }
    )
    
    setTimeout(() => {
      setDeployingAgentId(null)
    }, 12000)
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

  const handleAttendEvent = async () => {
    if (!walletConnected) {
      toast.error('Please connect your wallet first!')
      return
    }

    if (!eventUrl.trim()) {
      toast.error('Please enter an event URL')
      return
    }

    if (!agents || agents.length === 0) {
      toast.error('No agents available. Spawn an agent first!')
      return
    }
    const agent = agents[0]

    setIsProcessingEvent(true)
    setActiveAgentId(agent.id)
    startWorkflow()

    toast.info('Initiating event attendance workflow...')
    
    addLog(agent.id, 'secretary', `[${agent.name} - Secretary] Joining event: ${eventUrl}`, 'info')
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    addLog(agent.id, 'secretary', `[${agent.name} - Secretary] Registration successful`, 'success')
    await new Promise(resolve => setTimeout(resolve, 800))
    
    addLog(agent.id, 'scribe', `[${agent.name} - Scribe] Extracting event content...`, 'info')
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    addLog(agent.id, 'scribe', `[${agent.name} - Scribe] Generating summary with AI...`, 'info')
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    addLog(agent.id, 'scribe', `[${agent.name} - Scribe] Summary generated successfully`, 'success')
    await new Promise(resolve => setTimeout(resolve, 500))

    const newEvent: Event = {
      id: `event-${Date.now()}`,
      agentId: agent.id,
      url: eventUrl,
      title: 'New Event Attended',
      platform: 'YouTube',
      date: Date.now(),
      summary: 'Event summary generated by AI agent.',
      status: 'completed'
    }

    try {
      const gasEstimate = await blockchain.estimateGas({
        agentWallet: agent.walletAddress,
        eventTitle: newEvent.title,
        eventUrl: newEvent.url,
        platform: newEvent.platform,
        agentName: agent.name,
        summary: newEvent.summary
      })

      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Estimating Mantle gas fees... ${gasEstimate} MNT`, 'info')
      await new Promise(resolve => setTimeout(resolve, 800))
      
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Uploading metadata to IPFS...`, 'info')
      
      let ipfsMetadataCID: string | undefined
      let ipfsImageCID: string | undefined
      let ipfsMetadataURI: string | undefined
      
      try {
        const tokenIdNumber = 1000 + (nfts?.length ?? 0) + 1
        const newEventsAttended = agent.eventsAttended + 1
        const newAgentLevel = Math.floor(newEventsAttended / 2) + 1
        
        let evolutionStage: 'standard' | 'advanced' | 'elite' | 'wisdom' = 'standard'
        if (newEventsAttended >= 5) {
          evolutionStage = 'wisdom'
        } else if (newAgentLevel >= 5) {
          evolutionStage = 'elite'
        } else if (newAgentLevel >= 3) {
          evolutionStage = 'advanced'
        }
        
        const { metadataCID, imageCID, metadata } = await ipfsService.createNFTMetadata({
          eventTitle: newEvent.title,
          eventUrl: newEvent.url,
          summary: newEvent.summary,
          agentName: agent.name,
          agentId: agent.id,
          platform: newEvent.platform,
          date: newEvent.date,
          tokenId: `${tokenIdNumber}`,
          niche: agent.niche,
          agentLevel: newAgentLevel,
          evolutionStage
        })
        
        ipfsMetadataCID = metadataCID
        ipfsImageCID = imageCID
        ipfsMetadataURI = ipfsService.getGatewayUrl(metadataCID)
        
        addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Metadata uploaded to IPFS: ${metadataCID}`, 'success')
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (ipfsError) {
        console.error('IPFS upload failed:', ipfsError)
        addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Warning: IPFS upload failed, continuing with on-chain mint...`, 'warning')
      }
      
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] Minting NFT on Mantle Network...`, 'info')
      
      const mintResult = await blockchain.mintNFT({
        agentWallet: agent.walletAddress,
        eventTitle: newEvent.title,
        eventUrl: newEvent.url,
        platform: newEvent.platform,
        agentName: agent.name,
        summary: newEvent.summary,
        metadataURI: ipfsMetadataURI
      })

      if (!mintResult.success) {
        throw new Error(mintResult.error || 'Failed to mint NFT')
      }

      const gasUsedAmount = parseFloat(mintResult.gasUsed || gasEstimate)
      
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] NFT minted successfully! Gas spent: ${gasUsedAmount.toFixed(6)} MNT 🎉`, 'success')

      const newNFT: NFT = {
        id: `nft-${Date.now()}`,
        agentId: agent.id,
        eventId: newEvent.id,
        eventTitle: newEvent.title,
        summary: newEvent.summary,
        date: Date.now(),
        transactionHash: mintResult.transactionHash || `0x${Math.random().toString(16).slice(2)}`,
        tokenId: mintResult.tokenId || `${1000 + (nfts?.length ?? 0) + 1}`,
        imageUrl: ipfsImageCID ? ipfsService.getGatewayUrl(ipfsImageCID) : 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT',
        metadataCID: ipfsMetadataCID,
        imageCID: ipfsImageCID,
        metadataURI: ipfsMetadataURI
      }

      const newEventsAttended = agent.eventsAttended + 1

      setEvents((current) => [...(current ?? []), newEvent])
      setNFTs((current) => [...(current ?? []), newNFT])
      setAgents((current) =>
        (current ?? []).map((a) =>
          a.id === agent.id
            ? { 
                ...a, 
                eventsAttended: newEventsAttended, 
                level: Math.floor(newEventsAttended / 2) + 1, 
                wisdomUnlocked: newEventsAttended >= 5,
                gasSpent: (a.gasSpent || 0) + gasUsedAmount,
                mantleBalance: (a.mantleBalance || 0) - gasUsedAmount
              }
            : a
        )
      )

      await blockchain.refreshBalance()

      setEventUrl('')
      setIsProcessingEvent(false)
      setActiveAgentId(null)
      clearTasks()
      
      toast.success('Event attendance complete! NFT minted on Mantle.', {
        description: `Transaction: ${newNFT.transactionHash.slice(0, 10)}...`,
        action: {
          label: 'View on Explorer',
          onClick: () => window.open(blockchain.getExplorerUrl(newNFT.transactionHash), '_blank')
        }
      })

      if (newEventsAttended === 5) {
        setTimeout(() => {
          toast.success('🎉 Wisdom Unlocked!', {
            description: 'Generate your Wisdom Report now!',
            duration: 5000
          })
        }, 1000)
      }
    } catch (error) {
      console.error('NFT minting error:', error)
      addLog(agent.id, 'mint-master', `[${agent.name} - Mint-Master] NFT minting failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      toast.error('Failed to mint NFT', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
      setIsProcessingEvent(false)
      setActiveAgentId(null)
      clearTasks()
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

  const handleSaveAgentConfig = (agentId: string, instructions: string) => {
    setAgents((current) =>
      (current ?? []).map((a) =>
        a.id === agentId ? { ...a, customInstructions: instructions } : a
      )
    )
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

  const stats = [
    { label: 'Active Agents', value: agents?.length ?? 0, icon: Robot, color: 'text-primary' },
    { label: 'NFTs Minted', value: nfts?.length ?? 0, icon: WalletIcon, color: 'text-secondary' },
    { label: 'Events Attended', value: events?.length ?? 0, icon: Globe, color: 'text-primary' },
    { label: 'Wisdom Unlocked', value: agents?.filter(a => a.wisdomUnlocked).length ?? 0, icon: ChartLine, color: 'text-secondary' }
  ]

  const isViewOnly = !walletConnected

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <NeuralNetworkBackground />
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
          <div className="container mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center animate-glow-pulse shadow-lg shadow-primary/50">
                    <Sparkle size={26} className="text-background" weight="fill" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-secondary blur-xl opacity-50 -z-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">MAEF</h1>
                  <p className="text-xs text-muted-foreground font-mono">Mantle Agentic Event Factory</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isViewOnly && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <p className="text-sm text-amber-500 font-semibold">View Only Mode</p>
                  </div>
                )}
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

        <main className="container mx-auto px-6 py-8 pb-72">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="glass-card-hover p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl group-hover:from-primary/20 transition-all duration-500" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">{stat.label}</p>
                      <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">{stat.value}</p>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300">
                      <stat.icon size={28} className={stat.color} weight="duotone" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="glass-card mb-8 p-1.5 border border-primary/20">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary transition-all duration-300">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="architecture" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary transition-all duration-300">
                How It Works
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary transition-all duration-300">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="factory" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary transition-all duration-300">
                Factory
              </TabsTrigger>
              <TabsTrigger value="vault" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary transition-all duration-300">
                NFT Vault
              </TabsTrigger>
              <TabsTrigger value="verification" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary transition-all duration-300">
                Contract Verification
              </TabsTrigger>
              <TabsTrigger value="community" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary transition-all duration-300">
                Community Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6 animate-slide-up">
              <Card className="glass-card-hover p-6 border-2 border-primary/20">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Globe className="text-primary" weight="duotone" size={22} />
                  </div>
                  <span>Attend Event</span>
                </h2>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter YouTube or Luma event URL..."
                    value={eventUrl}
                    onChange={(e) => setEventUrl(e.target.value)}
                    disabled={isViewOnly}
                    className="flex-1 border-primary/30 focus:border-primary bg-background/50 font-mono text-sm"
                  />
                  <Button
                    onClick={handleAttendEvent}
                    disabled={!eventUrl.trim() || isViewOnly}
                    className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold px-6 shadow-lg shadow-secondary/30"
                  >
                    Attend Event
                  </Button>
                </div>
                {isViewOnly && (
                  <p className="text-xs text-amber-500 mt-3">Connect your wallet to attend events</p>
                )}
              </Card>

              {agents && agents.length > 0 && (
                <SubAgentDelegation
                  agents={agents}
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

              <div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span>Your Agents</span>
                  <span className="text-sm text-muted-foreground font-normal">({agents?.length ?? 0} active)</span>
                </h2>
                {!agents || agents.length === 0 ? (
                  <Card className="glass-card-hover p-12 text-center border-2 border-dashed border-primary/30">
                    <Robot size={64} className="mx-auto mb-4 text-muted-foreground animate-float" weight="duotone" />
                    <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">Spawn your first AI agent to start attending events and minting NFTs</p>
                    <Button 
                      onClick={() => setSpawnDialogOpen(true)} 
                      disabled={isViewOnly}
                      className="bg-gradient-to-r from-secondary to-accent font-semibold shadow-lg shadow-secondary/30"
                    >
                      <Plus className="mr-2" weight="bold" />
                      Spawn Agent
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((agent, idx) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <div className="space-y-3">
                          <AgentCard agent={agent} onClick={() => agent.wisdomUnlocked && handleOpenWisdomReport(agent)} onConfigure={handleConfigureAgent} onChat={handleChatWithAgent} />
                          {agent.wisdomUnlocked && (
                            <Button
                              onClick={() => handleOpenWisdomReport(agent)}
                              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold shadow-2xl shadow-amber-500/30"
                            >
                              <Brain className="mr-2" weight="duotone" />
                              Generate Wisdom Report
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="architecture" className="space-y-6 animate-slide-up">
              <ArchitectureFlow currentPhase={agents && agents.length > 0 ? (agents[0].eventsAttended >= 5 ? 4 : Math.min(Math.floor(agents[0].eventsAttended / 1.5) + 1, 3)) : 0} />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center">
                      <ChartLine className="text-primary" weight="duotone" size={26} />
                    </div>
                    <span>Event Analytics Dashboard</span>
                  </h2>
                  <p className="text-muted-foreground">Track agent performance, event trends, and platform insights</p>
                </div>
              </div>
              
              <AnalyticsCharts agents={agents} events={events} nfts={nfts} />
            </TabsContent>

            <TabsContent value="factory" className="space-y-6 animate-slide-up">
              <Card className="glass-card-hover p-10 text-center border-2 border-primary/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
                <div className="relative">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/30 border-2 border-primary/40 flex items-center justify-center animate-glow-pulse shadow-2xl shadow-primary/30">
                    <Sparkle size={40} className="text-primary" weight="fill" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Agent Factory</h2>
                  <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-base">
                    Create autonomous AI agents tailored to your information needs. Each agent comes with 4 specialized sub-agents.
                  </p>
                  <Button
                    onClick={() => setSpawnDialogOpen(true)}
                    disabled={isViewOnly}
                    size="lg"
                    className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold px-8 shadow-lg shadow-secondary/30"
                  >
                    <Plus className="mr-2" weight="bold" size={20} />
                    Spawn New Agent
                  </Button>
                  {isViewOnly && (
                    <p className="text-xs text-amber-500 mt-4">Connect your wallet to spawn agents</p>
                  )}
                </div>
              </Card>

              <div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span>All Agents</span>
                  <span className="text-sm text-muted-foreground font-normal">({agents?.length ?? 0} total)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {agents?.map((agent, idx) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <AgentCard agent={agent} onConfigure={handleConfigureAgent} onChat={handleChatWithAgent} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vault" className="space-y-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>NFT Vault</span>
                    <span className="text-sm text-muted-foreground font-normal">({nfts?.length ?? 0} NFTs)</span>
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card border-primary/20">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-sm text-muted-foreground font-mono">Mantle Network</p>
                  </div>
                  {events && events.filter(e => e.status === 'completed').length > 0 && (
                    <Button
                      onClick={() => setBatchIPFSDialogOpen(true)}
                      disabled={isViewOnly}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90 font-semibold shadow-lg shadow-primary/30"
                    >
                      <CloudArrowUp className="mr-2" weight="duotone" />
                      Batch Upload to IPFS
                    </Button>
                  )}
                </div>
              </div>
              
              {!nfts || nfts.length === 0 ? (
                <Card className="glass-card-hover p-12 text-center border-2 border-dashed border-primary/30">
                  <WalletIcon size={64} className="mx-auto mb-4 text-muted-foreground animate-float" weight="duotone" />
                  <h3 className="text-lg font-semibold mb-2">No NFTs Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Attend events with your agents to mint Proof-of-Attendance NFTs on Mantle Network
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {nfts?.map((nft, idx) => (
                    <motion.div
                      key={nft.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.08 }}
                    >
                      <NFTCard 
                        nft={nft} 
                        onClick={() => {
                          setSelectedNFT(nft)
                          setNFTMetadataDialogOpen(true)
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="verification" className="space-y-6 animate-slide-up">
              <VerificationDashboard verifications={verificationData ?? []} />
            </TabsContent>

            <TabsContent value="community" className="space-y-6 animate-slide-up">
              <Card className="glass-card-hover p-10 text-center border-2 border-primary/30">
                <Globe size={64} className="mx-auto mb-4 text-primary animate-float" weight="duotone" />
                <h3 className="text-2xl font-bold mb-3">Community Insights</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Explore the latest NFTs minted by agents across the MAEF ecosystem. See what events the community is attending.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                  {nfts?.slice(0, 6).map((nft, idx) => (
                    <motion.div
                      key={nft.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <NFTCard 
                        nft={nft} 
                        onClick={() => {
                          setSelectedNFT(nft)
                          setNFTMetadataDialogOpen(true)
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <SpawnAgentDialog
        open={spawnDialogOpen}
        onOpenChange={setSpawnDialogOpen}
        onAgentCreated={handleAgentCreated}
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

      <TerminalConsole logs={logs} />
      <Toaster />
    </div>
  )
}

export default App
