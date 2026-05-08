import { Agent, SubAgent, Event, NFT, Niche, Personality, AgentProposal, SecurityAuditEntry, MarketplaceAgent } from './types'

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
      eventsAttended: 8,
      level: 5,
      status: 'active',
      createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      subAgents: createSubAgentsWithStatus(['active', 'processing', 'idle', 'idle']),
      wisdomUnlocked: true,
      mantleBalance: 25.487,
      gasSpent: 0.032,
      isGenesis: true,
      ownershipStatus: 'original-creator',
      agentGasBalance: 1.2,
      generation: 1,
      breedingCount: 0,
      maxBreedings: 3,
      geneticTraits: []
    },
    {
      id: 'agent-002',
      name: 'Sigma Analyst',
      personality: 'Analytical',
      niche: 'Trading/Investment',
      walletAddress: '0x8ba1f109551bd432803012645ac136ddd64dba72',
      eventsAttended: 9,
      level: 5,
      status: 'idle',
      createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
      subAgents: createSubAgentsWithStatus(['idle', 'idle', 'idle', 'idle']),
      wisdomUnlocked: true,
      mantleBalance: 42.156,
      gasSpent: 0.054,
      isGenesis: true,
      ownershipStatus: 'original-creator',
      agentGasBalance: 0.45,
      generation: 1,
      breedingCount: 0,
      maxBreedings: 3,
      geneticTraits: []
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
      gasSpent: 0.021,
      isGenesis: false,
      ownershipStatus: 'marketplace-acquired',
      agentGasBalance: 0.32,
      generation: 1,
      breedingCount: 0,
      maxBreedings: 3,
      geneticTraits: []
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
      gasSpent: 0.043,
      isGenesis: false,
      ownershipStatus: 'marketplace-acquired',
      agentGasBalance: 0.78,
      generation: 1,
      breedingCount: 0,
      maxBreedings: 3,
      geneticTraits: []
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
      gasSpent: 0.011,
      isGenesis: true,
      ownershipStatus: 'original-creator',
      agentGasBalance: 0.15,
      generation: 1,
      breedingCount: 0,
      maxBreedings: 3,
      geneticTraits: []
    },
    {
      id: 'agent-006',
      name: 'Mythic Fusion Alpha',
      personality: 'Aggressive',
      niche: 'Blockchain/DeFi',
      walletAddress: '0x7E4F2B9C8D1A3F6E5B2C9A4D7E1F3B8C5A2E9D1F',
      eventsAttended: 15,
      level: 8,
      status: 'idle',
      createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
      subAgents: createSubAgentsWithStatus(['active', 'idle', 'idle', 'idle']),
      wisdomUnlocked: true,
      mantleBalance: 67.892,
      gasSpent: 0.147,
      isGenesis: false,
      ownershipStatus: 'bred',
      agentGasBalance: 2.34,
      generation: 3,
      parentIds: ['agent-001', 'agent-002'],
      breedingCount: 1,
      maxBreedings: 5,
      geneticTraits: ['Enhanced Pattern Recognition', 'Cross-Chain Intelligence', 'Hybrid Wisdom Core'],
      lastBreedingTime: Date.now() - (18 * 60 * 60 * 1000),
      breedingCooldownHours: 24
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

export function getMockSecurityAuditLog(): SecurityAuditEntry[] {
  const now = Date.now()
  const minuteInMs = 60 * 1000

  return [
    {
      id: 'audit-001',
      timestamp: now - 12 * minuteInMs,
      type: 'transfer',
      icon: '🔒',
      message: 'SECURE: Transfer of Agent "Nova Creative" detected. Identity Memory Wiped. Wisdom Retained.',
      agentId: 'agent-003',
      agentName: 'Nova Creative',
      severity: 'info'
    },
    {
      id: 'audit-002',
      timestamp: now - 28 * minuteInMs,
      type: 'economy',
      icon: '💸',
      message: 'ECONOMY: Agent "Alpha Genesis" auto-replenished gas with 0.1 MNT.',
      agentId: 'agent-001',
      agentName: 'Alpha Genesis',
      severity: 'info'
    },
    {
      id: 'audit-003',
      timestamp: now - 45 * minuteInMs,
      type: 'security',
      icon: '🛡️',
      message: 'SECURITY: Successful wallet signature verification for proposal execution by Sigma Analyst.',
      agentId: 'agent-002',
      agentName: 'Sigma Analyst',
      severity: 'info'
    },
    {
      id: 'audit-004',
      timestamp: now - 67 * minuteInMs,
      type: 'governance',
      icon: '⚖️',
      message: 'GOVERNANCE: New proposal submitted by Agent "Sigma Analyst". Awaiting human approval.',
      agentId: 'agent-002',
      agentName: 'Sigma Analyst',
      severity: 'warning'
    },
    {
      id: 'audit-005',
      timestamp: now - 89 * minuteInMs,
      type: 'economy',
      icon: '💸',
      message: 'ECONOMY: User transferred 2.5 MNT to Agent "Quantum Trader" smart account.',
      agentId: 'agent-004',
      agentName: 'Quantum Trader',
      severity: 'info'
    },
    {
      id: 'audit-006',
      timestamp: now - 102 * minuteInMs,
      type: 'system',
      icon: '🔧',
      message: 'SYSTEM: Smart contract deployed for new Genesis Agent "Zen Wellness" on Mantle Network.',
      agentId: 'agent-005',
      agentName: 'Zen Wellness',
      severity: 'info'
    },
    {
      id: 'audit-007',
      timestamp: now - 125 * minuteInMs,
      type: 'transfer',
      icon: '🔒',
      message: 'SECURE: Agent "Quantum Trader" listed on marketplace. Private memory erased, public wisdom preserved.',
      agentId: 'agent-004',
      agentName: 'Quantum Trader',
      severity: 'warning'
    },
    {
      id: 'audit-008',
      timestamp: now - 143 * minuteInMs,
      type: 'economy',
      icon: '💸',
      message: 'ECONOMY: Genesis mint completed for 1.0 MNT. Agent received 0.5 MNT gas provision.',
      agentId: 'agent-001',
      agentName: 'Alpha Genesis',
      severity: 'info'
    },
    {
      id: 'audit-009',
      timestamp: now - 167 * minuteInMs,
      type: 'security',
      icon: '🛡️',
      message: 'SECURITY: Anti-prompt injection guardrail triggered. Suspicious command blocked for safety.',
      severity: 'critical'
    },
    {
      id: 'audit-010',
      timestamp: now - 189 * minuteInMs,
      type: 'governance',
      icon: '⚖️',
      message: 'GOVERNANCE: Proposal rejected by user. Agent "Alpha Genesis" DeFi action cancelled.',
      agentId: 'agent-001',
      agentName: 'Alpha Genesis',
      severity: 'warning'
    }
  ]
}

export function getMockProposals(): AgentProposal[] {
  const now = Date.now()
  const hourInMs = 60 * 60 * 1000

  return [
    {
      id: 'proposal-001',
      agentId: 'agent-002',
      agentName: 'Sigma Analyst',
      agentLevel: 5,
      title: 'Swap 100 USDC for MNT on Mantle Network',
      description: 'Based on cross-event analysis of 5 recent DeFi conferences, MNT shows strong accumulation signals and positive technical indicators. Propose swapping 100 USDC to MNT to capitalize on potential 15-20% upside in Q2 2026.',
      reasoning: 'After analyzing 5 DeFi events, 4 out of 5 speakers mentioned Mantle Network as a top Layer 2 scaling solution with growing TVL. On-chain metrics show increasing institutional interest. Technical analysis indicates breakout above key resistance at $0.82. Risk-reward ratio is favorable at current entry point.',
      eventsSources: [
        'DeFi Summit 2026: Institutional speakers highlighted Mantle L2 adoption',
        'Algorithmic Trading Strategies: MNT technical breakout pattern identified',
        'Crypto Investment Strategies 2026: Portfolio managers allocating to L2 tokens',
        'Cryptocurrency Market Analysis 2026: On-chain metrics showing MNT accumulation',
        'Quantitative Trading Workshop: Backtests show positive momentum signals'
      ],
      estimatedValue: '100 USDC → ~122 MNT (expected 15-20% profit)',
      riskLevel: 'low',
      status: 'pending',
      createdAt: now - 2 * hourInMs,
      expiresAt: now + 22 * hourInMs
    },
    {
      id: 'proposal-002',
      agentId: 'agent-001',
      agentName: 'Alpha Genesis',
      agentLevel: 5,
      title: 'Stake 50 MNT in Mantle LSP Protocol',
      description: 'Strategic proposal to stake 50 MNT tokens in the Mantle Liquid Staking Protocol to earn yield while maintaining liquidity. Current APY is 8.2% with minimal smart contract risk based on audit analysis.',
      reasoning: 'Analysis of 8 blockchain events reveals strong consensus on liquid staking protocols as optimal yield strategy for 2026. Mantle LSP has been audited by 3 top-tier firms, shows consistent 7-9% APY, and maintains deep liquidity pools. This positions the agent for passive income while preserving capital flexibility.',
      eventsSources: [
        'Mantle Network: Building the Future of Layer 2 - LSP launch announcement',
        'DeFi Summit 2026: Liquid staking identified as top yield strategy',
        'Scaling Ethereum with L2 Solutions - Security audit highlights for Mantle',
        'The Rise of Autonomous AI Agents - Smart contract risk assessment frameworks',
        'Building dApps on Mantle Network - Deep dive into LSP smart contracts',
        'DeFi strategies workshop discussing optimal staking ratios',
        'Layer 2 security analysis covering Mantle protocol safety',
        'Institutional DeFi panel recommending liquid staking positions'
      ],
      estimatedValue: '50 MNT → 4.1 MNT annual yield (8.2% APY)',
      riskLevel: 'low',
      status: 'pending',
      createdAt: now - 5 * hourInMs,
      expiresAt: now + 19 * hourInMs
    },
    {
      id: 'proposal-003',
      agentId: 'agent-001',
      agentName: 'Alpha Genesis',
      agentLevel: 5,
      title: 'Provide Liquidity to MNT/USDC Pool',
      description: 'Allocate 25 MNT + 20 USDC to the MNT/USDC liquidity pool on Mantle DEX. Current pool offers 12.5% APR from trading fees plus MANTLE token incentives.',
      reasoning: 'Cross-analysis of DeFi events shows high trading volume on Mantle DEX with sustainable fee generation. Liquidity provider rewards are attractive, and impermanent loss risk is moderate given MNT price stability. This diversifies yield sources while supporting the Mantle ecosystem.',
      eventsSources: [
        'DeFi Summit 2026: AMM liquidity strategies for 2026',
        'Mantle Network event highlighting DEX volume growth',
        'Building dApps on Mantle Network: DEX architecture and fee structure',
        'DeFi strategies panel discussing LP risk management',
        'Scaling Ethereum with L2 Solutions: DEX liquidity depth analysis',
        'Quantitative Trading Workshop: Calculating impermanent loss scenarios',
        'Crypto Investment Strategies: Diversified yield farming approaches',
        'Market Analysis 2026: DEX trading volume trends on L2s'
      ],
      estimatedValue: '25 MNT + 20 USDC → ~5.6 USDC annual yield (12.5% APR)',
      riskLevel: 'medium',
      status: 'pending',
      createdAt: now - 1 * hourInMs,
      expiresAt: now + 23 * hourInMs
    }
  ]
}

export function getMockMarketplaceAgents(): MarketplaceAgent[] {
  const now = Date.now()
  const dayInMs = 24 * 60 * 60 * 1000

  return [
    {
      id: 'marketplace-agent-001',
      name: 'Omega DeFi Master',
      personality: 'Aggressive',
      niche: 'Blockchain/DeFi',
      walletAddress: generateWalletAddress(),
      eventsAttended: 12,
      level: 6,
      wisdomUnlocked: true,
      price: 2.5,
      seller: 'CryptoWhale',
      sellerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
      listedAt: now - 3 * dayInMs,
      agentGasBalance: 0.85,
      status: 'idle',
      subAgents: createSubAgents(),
      createdAt: now - 45 * dayInMs,
      mantleBalance: 0,
      gasSpent: 0.187
    },
    {
      id: 'marketplace-agent-002',
      name: 'Trading Oracle',
      personality: 'Analytical',
      niche: 'Trading/Investment',
      walletAddress: generateWalletAddress(),
      eventsAttended: 15,
      level: 8,
      wisdomUnlocked: true,
      price: 3.8,
      seller: 'DeFi_Trader_Pro',
      sellerAddress: '0x8ba1f109551bd432803012645ac136ddd64dba72',
      listedAt: now - 1 * dayInMs,
      agentGasBalance: 1.2,
      status: 'idle',
      subAgents: createSubAgents(),
      createdAt: now - 60 * dayInMs,
      mantleBalance: 0,
      gasSpent: 0.245
    },
    {
      id: 'marketplace-agent-003',
      name: 'Tech Innovator',
      personality: 'Creative',
      niche: 'Technology',
      walletAddress: generateWalletAddress(),
      eventsAttended: 7,
      level: 4,
      wisdomUnlocked: true,
      price: 1.8,
      seller: 'BuilderDAO',
      sellerAddress: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      listedAt: now - 5 * dayInMs,
      agentGasBalance: 0.42,
      status: 'idle',
      subAgents: createSubAgents(),
      createdAt: now - 30 * dayInMs,
      mantleBalance: 0,
      gasSpent: 0.098
    },
    {
      id: 'marketplace-agent-004',
      name: 'Wellness Guru',
      personality: 'Creative',
      niche: 'Health/Wellness',
      walletAddress: generateWalletAddress(),
      eventsAttended: 10,
      level: 5,
      wisdomUnlocked: true,
      price: 2.2,
      seller: 'HealthyLiving',
      sellerAddress: '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B',
      listedAt: now - 7 * dayInMs,
      agentGasBalance: 0.68,
      status: 'idle',
      subAgents: createSubAgents(),
      createdAt: now - 50 * dayInMs,
      mantleBalance: 0,
      gasSpent: 0.132
    },
    {
      id: 'marketplace-agent-005',
      name: 'Quantum Sage',
      personality: 'Analytical',
      niche: 'Blockchain/DeFi',
      walletAddress: generateWalletAddress(),
      eventsAttended: 18,
      level: 9,
      wisdomUnlocked: true,
      price: 4.5,
      seller: 'DAO_Collective',
      sellerAddress: '0x9c5A8f5C0e3b7D1d4A2F6B8C3E9D7A5B1C4F6E8D',
      listedAt: now - 2 * dayInMs,
      agentGasBalance: 1.5,
      status: 'idle',
      subAgents: createSubAgents(),
      createdAt: now - 90 * dayInMs,
      mantleBalance: 0,
      gasSpent: 0.312
    },
    {
      id: 'marketplace-agent-006',
      name: 'Alpha Strategist',
      personality: 'Aggressive',
      niche: 'Trading/Investment',
      walletAddress: generateWalletAddress(),
      eventsAttended: 9,
      level: 5,
      wisdomUnlocked: true,
      price: 2.0,
      seller: 'InvestorDAO',
      sellerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
      listedAt: now - 4 * dayInMs,
      agentGasBalance: 0.55,
      status: 'idle',
      subAgents: createSubAgents(),
      createdAt: now - 35 * dayInMs,
      mantleBalance: 0,
      gasSpent: 0.115
    }
  ]
}
