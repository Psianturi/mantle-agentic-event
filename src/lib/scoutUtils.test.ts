import { describe, expect, it } from 'vitest'
import { Agent, Event } from '@/lib/types'
import { buildScoutedOpportunities, computeScoutRelevance, tokenizeScoutText } from '@/lib/scoutUtils'

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    personality: 'Analytical',
    niche: 'Blockchain/DeFi',
    walletAddress: '0x0000000000000000000000000000000000dEaD',
    eventsAttended: 0,
    level: 1,
    status: 'idle',
    createdAt: 0,
    subAgents: [],
    wisdomUnlocked: false,
    ...overrides,
  }
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    agentId: 'agent-1',
    url: 'https://youtube.com/watch?v=abc',
    title: 'Untitled Event',
    platform: 'YouTube',
    date: Date.now(),
    summary: '',
    status: 'completed',
    ...overrides,
  }
}

describe('tokenizeScoutText', () => {
  it('lowercases and strips punctuation', () => {
    expect(tokenizeScoutText('Hello, World!')).toEqual(['hello', 'world'])
  })

  it('filters words shorter than 4 characters', () => {
    expect(tokenizeScoutText('a an the DeFi')).toEqual(['defi'])
  })

  it('keeps words exactly 4 characters long', () => {
    expect(tokenizeScoutText('gold')).toEqual(['gold'])
  })

  it('returns an empty array for empty input', () => {
    expect(tokenizeScoutText('')).toEqual([])
  })
})

describe('computeScoutRelevance', () => {
  it('scores higher when event content matches the agent niche', () => {
    const agent = makeAgent({ niche: 'Blockchain/DeFi' })
    const matching = makeEvent({ title: 'DeFi and blockchain summit', summary: 'on-chain finance' })
    const nonMatching = makeEvent({ title: 'Cooking basics', summary: 'kitchen tips' })

    expect(computeScoutRelevance(agent, matching)).toBeGreaterThan(
      computeScoutRelevance(agent, nonMatching)
    )
  })

  it('scores recent events higher than stale ones, all else equal', () => {
    const agent = makeAgent()
    const recent = makeEvent({ date: Date.now(), title: '', summary: '' })
    const stale = makeEvent({ date: Date.now() - 60 * 24 * 60 * 60 * 1000, title: '', summary: '' })

    expect(computeScoutRelevance(agent, recent)).toBeGreaterThan(
      computeScoutRelevance(agent, stale)
    )
  })

  it('never exceeds the 98 cap even with many keyword hits', () => {
    const agent = makeAgent({ niche: 'Blockchain/DeFi', customAgenda: 'blockchain defi mantle layer 2 rollup smart contract on-chain' })
    const event = makeEvent({
      title: 'blockchain defi mantle layer 2 rollup smart contract on-chain',
      summary: 'blockchain defi mantle layer 2 rollup smart contract on-chain',
      platform: 'YouTube',
      date: Date.now(),
    })

    expect(computeScoutRelevance(agent, event)).toBeLessThanOrEqual(98)
  })
})

describe('buildScoutedOpportunities', () => {
  it('excludes events the agent has already attended', () => {
    const agent = makeAgent({ id: 'agent-1' })
    const pool = [
      makeEvent({ id: 'e1', agentId: 'agent-1', url: 'https://youtube.com/a' }),
      makeEvent({ id: 'e2', agentId: 'other-agent', url: 'https://youtube.com/b' }),
    ]

    const result = buildScoutedOpportunities(agent, pool)

    expect(result.map((r) => r.url)).not.toContain('https://youtube.com/a')
    expect(result.map((r) => r.url)).toContain('https://youtube.com/b')
  })

  it('deduplicates candidates by URL, keeping the most recent', () => {
    const agent = makeAgent({ id: 'agent-1' })
    const pool = [
      makeEvent({ id: 'e1', agentId: 'other', url: 'https://youtube.com/dup', date: 1000, title: 'Old' }),
      makeEvent({ id: 'e2', agentId: 'other', url: 'https://youtube.com/dup', date: 2000, title: 'New' }),
    ]

    const result = buildScoutedOpportunities(agent, pool)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('New')
  })

  it('caps results at 5, sorted by relevance descending', () => {
    const agent = makeAgent({ id: 'agent-1', niche: 'Blockchain/DeFi' })
    const pool = Array.from({ length: 8 }, (_, i) =>
      makeEvent({
        id: `e${i}`,
        agentId: 'other',
        url: `https://youtube.com/${i}`,
        title: i === 0 ? 'blockchain defi mantle' : 'unrelated content',
        summary: '',
      })
    )

    const result = buildScoutedOpportunities(agent, pool)

    expect(result.length).toBeLessThanOrEqual(5)
    expect(result[0].url).toBe('https://youtube.com/0') // most relevant first
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].relevanceScore).toBeGreaterThanOrEqual(result[i].relevanceScore)
    }
  })

  it('marks every scouted opportunity as not yet approved', () => {
    const agent = makeAgent({ id: 'agent-1' })
    const pool = [makeEvent({ id: 'e1', agentId: 'other', url: 'https://youtube.com/x' })]

    const result = buildScoutedOpportunities(agent, pool)

    expect(result[0].approved).toBe(false)
  })
})
