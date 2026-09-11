import { useEffect, useState } from 'react'
import { monitoringService, GasStatusResponse } from '@/services/monitoringService'

// Module-level cache shared by every GasStatusBadge instance. Without this,
// each badge polled independently — if the same agent renders in N places
// on screen, that was N redundant backend/RPC calls every 30s instead of 1.
const POLL_INTERVAL_MS = 30000

interface CacheEntry {
  data: GasStatusResponse | null
  error: boolean
  loading: boolean
  subscribers: Set<() => void>
  intervalId: ReturnType<typeof setInterval> | null
}

const cache = new Map<string, CacheEntry>()

/** Test-only: clear all cached entries/timers between test cases. */
export function _resetGasStatusCacheForTests() {
  cache.forEach(e => { if (e.intervalId) clearInterval(e.intervalId) })
  cache.clear()
}

function cacheKey(agentWallet: string, chainId: number): string {
  return `${agentWallet.toLowerCase()}:${chainId}`
}

async function fetchAndUpdate(key: string, agentWallet: string, chainId: number) {
  const entry = cache.get(key)
  if (!entry) return
  try {
    entry.data = await monitoringService.getAgentGasStatus(agentWallet, chainId)
    entry.error = false
  } catch (err) {
    console.error('Failed to fetch gas status:', err)
    entry.error = true
  } finally {
    entry.loading = false
    entry.subscribers.forEach(cb => cb())
  }
}

/** Exported for testing dedup/polling logic without rendering React. */
export function subscribeGasStatus(agentWallet: string, chainId: number, onChange: () => void): () => void {
  const key = cacheKey(agentWallet, chainId)
  let entry = cache.get(key)

  if (!entry) {
    entry = { data: null, error: false, loading: true, subscribers: new Set(), intervalId: null }
    cache.set(key, entry)
    fetchAndUpdate(key, agentWallet, chainId)
    entry.intervalId = setInterval(() => fetchAndUpdate(key, agentWallet, chainId), POLL_INTERVAL_MS)
  }

  entry.subscribers.add(onChange)

  // Polling stops once the last viewer of this wallet unmounts — no point
  // refreshing gas data for a badge nobody's looking at.
  return () => {
    const e = cache.get(key)
    if (!e) return
    e.subscribers.delete(onChange)
    if (e.subscribers.size === 0) {
      if (e.intervalId) clearInterval(e.intervalId)
      cache.delete(key)
    }
  }
}

export function useGasStatus(agentWallet: string, chainId = 5003) {
  const key = cacheKey(agentWallet, chainId)
  const [, setTick] = useState(0)

  useEffect(() => {
    return subscribeGasStatus(agentWallet, chainId, () => setTick(t => t + 1))
  }, [agentWallet, chainId])

  const entry = cache.get(key)
  return {
    gasStatus: entry?.data ?? null,
    loading: entry?.loading ?? true,
    error: entry?.error ?? false,
  }
}
