import { Agent, SubAgent, Event, NFT, Niche, Personality } from './types'

const niches: Niche[] = ['Blockchain/DeFi', 'Trading/Investment', 'Technology', 'Health/Wellness']
const personalities: Personality[] = ['Aggressive', 'Analytical', 'Creative']

export function generateWalletAddress(): string {
  const chars = '0123456789abcdef'
  let address = '0x'
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)]
  }
  return address
}

export function createSubAgents(): SubAgent[] {
  return [
    {
      type: 'secretary',
      name: 'The Secretary',
      status: 'idle',
      description: 'Handles autonomous registration on platforms'
    },
    {
      type: 'scribe',
      name: 'The Scribe',
      status: 'idle',
      description: 'Captures and summarizes event content'
    },
    {
      type: 'social-lite',
      name: 'The Social-Lite',
      status: 'idle',
      description: 'Manages community presence and engagement'
    },
    {
      type: 'mint-master',
      name: 'The Mint-Master',
      status: 'idle',
      description: 'Handles NFT minting and gas optimization'
    }
  ]
}

export function createMockAgent(name: string, personality: Personality, niche: Niche): Agent {
  return {
    id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    personality,
    niche,
    walletAddress: generateWalletAddress(),
    eventsAttended: 0,
    level: 1,
    status: 'idle',
    createdAt: Date.now(),
    subAgents: createSubAgents(),
    wisdomUnlocked: false
  }
}

function createSubAgentsWithStatus(statuses: Agent['status'][]): SubAgent[] {
  const baseAgents = createSubAgents()
  return baseAgents.map((agent, index) => ({
    ...agent,
    status: statuses[index] || 'idle'
  }))
}

export function getMockAgents(): Agent[] {
  return [
    {
      id: 'agent-001',
      name: 'Alpha Genesis',
      personality: 'Aggressive',
      niche: 'Blockchain/DeFi',
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
      eventsAttended: 3,
      level: 2,
      status: 'active',
      createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      subAgents: createSubAgentsWithStatus(['active', 'processing', 'idle', 'idle']),
      wisdomUnlocked: false
    },
    {
      id: 'agent-002',
      name: 'Sigma Analyst',
      personality: 'Analytical',
      niche: 'Trading/Investment',
      walletAddress: '0x8ba1f109551bd432803012645ac136ddd64dba72',
      eventsAttended: 5,
      level: 3,
      status: 'idle',
      createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
      subAgents: createSubAgentsWithStatus(['idle', 'idle', 'idle', 'idle']),
      wisdomUnlocked: true
    },
    {
      id: 'agent-003',
      name: 'Nova Creative',
      personality: 'Creative',
      niche: 'Technology',
      walletAddress: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      eventsAttended: 2,
      level: 1,
      status: 'processing',
      createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      subAgents: createSubAgentsWithStatus(['idle', 'active', 'idle', 'processing']),
      wisdomUnlocked: false
    },
    {
      id: 'agent-004',
      name: 'Quantum Trader',
      personality: 'Analytical',
      niche: 'Trading/Investment',
      walletAddress: '0x9c5A8f5C0e3b7D1d4A2F6B8C3E9D7A5B1C4F6E8D',
      eventsAttended: 4,
      level: 2,
      status: 'idle',
      createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      subAgents: createSubAgentsWithStatus(['idle', 'idle', 'active', 'idle']),
      wisdomUnlocked: false
    },
    {
      id: 'agent-005',
      name: 'Zen Wellness',
      personality: 'Creative',
      niche: 'Health/Wellness',
      walletAddress: '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B',
      eventsAttended: 1,
      level: 1,
      status: 'idle',
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      subAgents: createSubAgentsWithStatus(['idle', 'idle', 'idle', 'idle']),
      wisdomUnlocked: false
    }
  ]
}

export function getMockEvents(): Event[] {
  return [
    {
      id: 'event-001',
      agentId: 'agent-001',
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Mantle Network: Building the Future of Layer 2',
      platform: 'YouTube',
      date: Date.now() - 2 * 24 * 60 * 60 * 1000,
      summary: 'Comprehensive overview of Mantle Network architecture, gas optimization strategies, and the future of modular blockchain systems. Key insights into EigenDA integration and decentralized sequencer design.',
      status: 'completed'
    },
    {
      id: 'event-002',
      agentId: 'agent-001',
      url: 'https://lu.ma/defi-summit-2026',
      title: 'DeFi Summit 2026: Institutional Adoption',
      platform: 'Luma',
      date: Date.now() - 5 * 24 * 60 * 60 * 1000,
      summary: 'Discussion on institutional DeFi adoption trends, regulatory frameworks, and tokenization of real-world assets. Predictions for 2026-2027 market cycles.',
      status: 'completed'
    },
    {
      id: 'event-003',
      agentId: 'agent-002',
      url: 'https://youtube.com/watch?v=trading-signals',
      title: 'Algorithmic Trading Strategies for 2026',
      platform: 'YouTube',
      date: Date.now() - 1 * 24 * 60 * 60 * 1000,
      summary: 'Advanced quantitative trading strategies leveraging AI for market prediction, risk management frameworks, and portfolio optimization techniques.',
      status: 'completed'
    }
  ]
}

export function getMockNFTs(): NFT[] {
  return [
    {
      id: 'nft-001',
      agentId: 'agent-001',
      eventId: 'event-001',
      eventTitle: 'Mantle Network: Building the Future of Layer 2',
      summary: 'Comprehensive overview of Mantle Network architecture, gas optimization strategies...',
      date: Date.now() - 2 * 24 * 60 * 60 * 1000,
      transactionHash: '0x4e5b3b4c9f0d1a2e3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
      tokenId: '1001',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT'
    },
    {
      id: 'nft-002',
      agentId: 'agent-001',
      eventId: 'event-002',
      eventTitle: 'DeFi Summit 2026: Institutional Adoption',
      summary: 'Discussion on institutional DeFi adoption trends, regulatory frameworks...',
      date: Date.now() - 5 * 24 * 60 * 60 * 1000,
      transactionHash: '0x7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
      tokenId: '1002',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/9d00ff?text=MAEF+NFT'
    },
    {
      id: 'nft-003',
      agentId: 'agent-002',
      eventId: 'event-003',
      eventTitle: 'Algorithmic Trading Strategies for 2026',
      summary: 'Advanced quantitative trading strategies leveraging AI for market prediction...',
      date: Date.now() - 1 * 24 * 60 * 60 * 1000,
      transactionHash: '0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      tokenId: '1003',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT'
    }
  ]
}
