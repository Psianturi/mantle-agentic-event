export type Niche = 'Blockchain/DeFi' | 'Trading/Investment' | 'Technology' | 'Health/Wellness'
export type Personality = 'Aggressive' | 'Analytical' | 'Creative'
export type AgentStatus = 'idle' | 'active' | 'processing' | 'error'
export type SubAgentType = 'secretary' | 'scribe' | 'social-lite' | 'mint-master'

export interface SubAgent {
  type: SubAgentType
  name: string
  status: AgentStatus
  lastAction?: string
  description: string
}

export interface Agent {
  id: string
  name: string
  personality: Personality
  niche: Niche
  walletAddress: string
  eventsAttended: number
  level: number
  status: AgentStatus
  createdAt: number
  subAgents: SubAgent[]
  wisdomUnlocked: boolean
  customInstructions?: string
  mantleBalance?: number
  gasSpent?: number
}

export interface Event {
  id: string
  agentId: string
  url: string
  title: string
  platform: 'YouTube' | 'Luma' | 'Eventbrite' | 'Zoom'
  date: number
  summary: string
  status: 'pending' | 'completed' | 'failed'
}

export interface NFT {
  id: string
  agentId: string
  eventId: string
  eventTitle: string
  summary: string
  date: number
  transactionHash: string
  tokenId: string
  imageUrl?: string
}

export interface TerminalLog {
  id: string
  agentId: string
  subAgentType: SubAgentType
  message: string
  timestamp: number
  type: 'info' | 'success' | 'error' | 'warning'
}

export interface WisdomCard {
  id: string
  agentId: string
  niche: Niche
  events: string[]
  insights: string[]
  strategicTips: string[]
  generatedAt: number
}
