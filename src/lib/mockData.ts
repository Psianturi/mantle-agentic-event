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
      wisdomUnlocked: false,
      mantleBalance: 25.487,
      gasSpent: 0.032
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
      wisdomUnlocked: true,
      mantleBalance: 42.156,
      gasSpent: 0.054
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
      wisdomUnlocked: false,
      mantleBalance: 18.923,
      gasSpent: 0.021
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
      wisdomUnlocked: false,
      mantleBalance: 33.712,
      gasSpent: 0.043
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
      wisdomUnlocked: false,
      mantleBalance: 15.234,
      gasSpent: 0.011
    }
  ]
}

export function getMockEvents(): Event[] {
  const now = Date.now()
  const dayInMs = 24 * 60 * 60 * 1000

  return [
    {
      id: 'event-001',
      agentId: 'agent-001',
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Mantle Network: Building the Future of Layer 2',
      platform: 'YouTube',
      date: now - 2 * dayInMs,
      summary: 'Comprehensive overview of Mantle Network architecture, gas optimization strategies, and the future of modular blockchain systems. Key insights into EigenDA integration and decentralized sequencer design.',
      status: 'completed'
    },
    {
      id: 'event-002',
      agentId: 'agent-001',
      url: 'https://lu.ma/defi-summit-2026',
      title: 'DeFi Summit 2026: Institutional Adoption',
      platform: 'Luma',
      date: now - 5 * dayInMs,
      summary: 'Discussion on institutional DeFi adoption trends, regulatory frameworks, and tokenization of real-world assets. Predictions for 2026-2027 market cycles.',
      status: 'completed'
    },
    {
      id: 'event-003',
      agentId: 'agent-002',
      url: 'https://youtube.com/watch?v=trading-signals',
      title: 'Algorithmic Trading Strategies for 2026',
      platform: 'YouTube',
      date: now - 1 * dayInMs,
      summary: 'Advanced quantitative trading strategies leveraging AI for market prediction, risk management frameworks, and portfolio optimization techniques.',
      status: 'completed'
    },
    {
      id: 'event-004',
      agentId: 'agent-003',
      url: 'https://lu.ma/ai-agents-conference',
      title: 'The Rise of Autonomous AI Agents',
      platform: 'Luma',
      date: now - 3 * dayInMs,
      summary: 'Exploring the future of autonomous AI agents in blockchain ecosystems, multi-agent coordination, and real-world applications.',
      status: 'completed'
    },
    {
      id: 'event-005',
      agentId: 'agent-001',
      url: 'https://youtube.com/watch?v=layer2-scaling',
      title: 'Scaling Ethereum with L2 Solutions',
      platform: 'YouTube',
      date: now - 4 * dayInMs,
      summary: 'Deep dive into Layer 2 scaling solutions, comparing rollups, validiums, and sidechains for different use cases.',
      status: 'completed'
    },
    {
      id: 'event-006',
      agentId: 'agent-004',
      url: 'https://eventbrite.com/crypto-investment-2026',
      title: 'Crypto Investment Strategies 2026',
      platform: 'Eventbrite',
      date: now - 6 * dayInMs,
      summary: 'Expert panel discussing portfolio diversification strategies, market analysis tools, and identifying emerging opportunities.',
      status: 'completed'
    },
    {
      id: 'event-007',
      agentId: 'agent-002',
      url: 'https://zoom.us/trading-webinar',
      title: 'Technical Analysis Masterclass',
      platform: 'Zoom',
      date: now - 3 * dayInMs,
      summary: 'Live webinar covering chart patterns, indicator strategies, and practical trading techniques for volatile markets.',
      status: 'completed'
    },
    {
      id: 'event-008',
      agentId: 'agent-003',
      url: 'https://youtube.com/watch?v=web3-development',
      title: 'Building dApps on Mantle Network',
      platform: 'YouTube',
      date: now - 1 * dayInMs,
      summary: 'Developer tutorial on building decentralized applications on Mantle, covering smart contracts, gas optimization, and frontend integration.',
      status: 'completed'
    },
    {
      id: 'event-009',
      agentId: 'agent-004',
      url: 'https://lu.ma/quant-trading-workshop',
      title: 'Quantitative Trading Workshop',
      platform: 'Luma',
      date: now - 2 * dayInMs,
      summary: 'Hands-on workshop exploring algorithmic trading strategies, backtesting frameworks, and risk management systems.',
      status: 'completed'
    },
    {
      id: 'event-010',
      agentId: 'agent-002',
      url: 'https://eventbrite.com/market-analysis-2026',
      title: 'Cryptocurrency Market Analysis 2026',
      platform: 'Eventbrite',
      date: now - 5 * dayInMs,
      summary: 'Comprehensive market analysis covering macro trends, on-chain metrics, and price action predictions for major cryptocurrencies.',
      status: 'completed'
    },
    {
      id: 'event-011',
      agentId: 'agent-005',
      url: 'https://youtube.com/watch?v=wellness-tech',
      title: 'Technology for Wellness: AI Health Monitoring',
      platform: 'YouTube',
      date: now - 6 * dayInMs,
      summary: 'Exploring how AI and blockchain are transforming personal health monitoring, data ownership, and preventive healthcare.',
      status: 'completed'
    },
    {
      id: 'event-012',
      agentId: 'agent-003',
      url: 'https://zoom.us/tech-talk-agents',
      title: 'The Future of Agent-Based Systems',
      platform: 'Zoom',
      date: now - 4 * dayInMs,
      summary: 'Technical discussion on multi-agent systems, coordination protocols, and emerging standards in the agent economy.',
      status: 'completed'
    }
  ]
}

export function getMockNFTs(): NFT[] {
  const now = Date.now()
  const dayInMs = 24 * 60 * 60 * 1000

  return [
    {
      id: 'nft-001',
      agentId: 'agent-001',
      eventId: 'event-001',
      eventTitle: 'Mantle Network: Building the Future of Layer 2',
      summary: 'Comprehensive overview of Mantle Network architecture, gas optimization strategies...',
      date: now - 2 * dayInMs,
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
      date: now - 5 * dayInMs,
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
      date: now - 1 * dayInMs,
      transactionHash: '0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      tokenId: '1003',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT'
    },
    {
      id: 'nft-004',
      agentId: 'agent-003',
      eventId: 'event-004',
      eventTitle: 'The Rise of Autonomous AI Agents',
      summary: 'Exploring the future of autonomous AI agents in blockchain ecosystems...',
      date: now - 3 * dayInMs,
      transactionHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8',
      tokenId: '1004',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/9d00ff?text=MAEF+NFT'
    },
    {
      id: 'nft-005',
      agentId: 'agent-001',
      eventId: 'event-005',
      eventTitle: 'Scaling Ethereum with L2 Solutions',
      summary: 'Deep dive into Layer 2 scaling solutions, comparing rollups, validiums...',
      date: now - 4 * dayInMs,
      transactionHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
      tokenId: '1005',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT'
    },
    {
      id: 'nft-006',
      agentId: 'agent-004',
      eventId: 'event-006',
      eventTitle: 'Crypto Investment Strategies 2026',
      summary: 'Expert panel discussing portfolio diversification strategies...',
      date: now - 6 * dayInMs,
      transactionHash: '0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
      tokenId: '1006',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/9d00ff?text=MAEF+NFT'
    },
    {
      id: 'nft-007',
      agentId: 'agent-002',
      eventId: 'event-007',
      eventTitle: 'Technical Analysis Masterclass',
      summary: 'Live webinar covering chart patterns, indicator strategies...',
      date: now - 3 * dayInMs,
      transactionHash: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6',
      tokenId: '1007',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT'
    },
    {
      id: 'nft-008',
      agentId: 'agent-003',
      eventId: 'event-008',
      eventTitle: 'Building dApps on Mantle Network',
      summary: 'Developer tutorial on building decentralized applications on Mantle...',
      date: now - 1 * dayInMs,
      transactionHash: '0x7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
      tokenId: '1008',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/9d00ff?text=MAEF+NFT'
    },
    {
      id: 'nft-009',
      agentId: 'agent-004',
      eventId: 'event-009',
      eventTitle: 'Quantitative Trading Workshop',
      summary: 'Hands-on workshop exploring algorithmic trading strategies...',
      date: now - 2 * dayInMs,
      transactionHash: '0x9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
      tokenId: '1009',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT'
    },
    {
      id: 'nft-010',
      agentId: 'agent-002',
      eventId: 'event-010',
      eventTitle: 'Cryptocurrency Market Analysis 2026',
      summary: 'Comprehensive market analysis covering macro trends, on-chain metrics...',
      date: now - 5 * dayInMs,
      transactionHash: '0x0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1',
      tokenId: '1010',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/9d00ff?text=MAEF+NFT'
    },
    {
      id: 'nft-011',
      agentId: 'agent-005',
      eventId: 'event-011',
      eventTitle: 'Technology for Wellness: AI Health Monitoring',
      summary: 'Exploring how AI and blockchain are transforming personal health monitoring...',
      date: now - 6 * dayInMs,
      transactionHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
      tokenId: '1011',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/00f3ff?text=MAEF+NFT'
    },
    {
      id: 'nft-012',
      agentId: 'agent-003',
      eventId: 'event-012',
      eventTitle: 'The Future of Agent-Based Systems',
      summary: 'Technical discussion on multi-agent systems, coordination protocols...',
      date: now - 4 * dayInMs,
      transactionHash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
      tokenId: '1012',
      imageUrl: 'https://placehold.co/400x400/1a1b3a/9d00ff?text=MAEF+NFT'
    }
  ]
}
