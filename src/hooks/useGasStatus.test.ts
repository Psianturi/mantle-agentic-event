import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { monitoringService } from '@/services/monitoringService'
import { subscribeGasStatus, _resetGasStatusCacheForTests } from './useGasStatus'

const WALLET = '0xAbC0000000000000000000000000000000dEaD'

beforeEach(() => {
  vi.useFakeTimers()
  _resetGasStatusCacheForTests()
})

afterEach(() => {
  _resetGasStatusCacheForTests()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('subscribeGasStatus (shared cache)', () => {
  it('dedupes: two subscribers to the same wallet trigger only one fetch', async () => {
    const spy = vi.spyOn(monitoringService, 'getAgentGasStatus').mockResolvedValue({
      status: 'healthy',
    } as never)

    subscribeGasStatus(WALLET, 5003, () => {})
    subscribeGasStatus(WALLET, 5003, () => {})
    await vi.advanceTimersByTimeAsync(0)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('polling stops once the last subscriber unsubscribes', async () => {
    const spy = vi.spyOn(monitoringService, 'getAgentGasStatus').mockResolvedValue({
      status: 'healthy',
    } as never)

    const unsubscribe = subscribeGasStatus(WALLET, 5003, () => {})
    await vi.advanceTimersByTimeAsync(0)
    expect(spy).toHaveBeenCalledTimes(1)

    unsubscribe()
    await vi.advanceTimersByTimeAsync(60_000)

    // No subscribers left — the 30s interval should have been cleared, not fired.
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('still-subscribed wallet keeps polling every 30s', async () => {
    const spy = vi.spyOn(monitoringService, 'getAgentGasStatus').mockResolvedValue({
      status: 'healthy',
    } as never)

    subscribeGasStatus(WALLET, 5003, () => {})
    await vi.advanceTimersByTimeAsync(0)
    expect(spy).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('different wallets get independent fetches', async () => {
    const spy = vi.spyOn(monitoringService, 'getAgentGasStatus').mockResolvedValue({
      status: 'healthy',
    } as never)

    subscribeGasStatus(WALLET, 5003, () => {})
    subscribeGasStatus('0x1111111111111111111111111111111111111', 5003, () => {})
    await vi.advanceTimersByTimeAsync(0)

    expect(spy).toHaveBeenCalledTimes(2)
  })
})
