import { useState, useEffect, useCallback, useRef } from 'react'
import { cloudRunService, MissionStatusResponse, SubAgentLog } from '@/services/cloudRunService'

const POLLING_INTERVAL = 3000
const MAX_POLL_ATTEMPTS = 200

interface UseMissionPollingOptions {
  onComplete?: (result: MissionStatusResponse['result']) => void
  onError?: (error: string) => void
  onLog?: (log: SubAgentLog) => void
}

export function useMissionPolling(taskId: string | null, options: UseMissionPollingOptions = {}) {
  const [status, setStatus] = useState<MissionStatusResponse | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollAttempts = useRef(0)
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastLogCount = useRef(0)

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current)
      pollingInterval.current = null
    }
    setIsPolling(false)
  }, [])

  const poll = useCallback(async () => {
    if (!taskId) return

    try {
      pollAttempts.current += 1

      if (pollAttempts.current > MAX_POLL_ATTEMPTS) {
        stopPolling()
        const timeoutError = 'Mission timeout - agent may still be processing in background'
        setError(timeoutError)
        options.onError?.(timeoutError)
        return
      }

      const response = await cloudRunService.pollMissionStatus(taskId)
      setStatus(response)

      if (response.logs && response.logs.length > lastLogCount.current) {
        const newLogs = response.logs.slice(lastLogCount.current)
        newLogs.forEach(log => options.onLog?.(log))
        lastLogCount.current = response.logs.length
      }

      if (response.status === 'completed') {
        stopPolling()
        if (response.result) {
          options.onComplete?.(response.result)
        }
      } else if (response.status === 'failed') {
        stopPolling()
        const failError = response.error || 'Mission failed'
        setError(failError)
        options.onError?.(failError)
      }
    } catch (err) {
      console.error('Polling error:', err)
      
      if (pollAttempts.current > 3) {
        stopPolling()
        const pollError = err instanceof Error ? err.message : 'Failed to poll mission status'
        setError(pollError)
        options.onError?.(pollError)
      }
    }
  }, [taskId, options, stopPolling])

  const startPolling = useCallback(() => {
    if (!taskId || isPolling) return

    pollAttempts.current = 0
    lastLogCount.current = 0
    setError(null)
    setIsPolling(true)

    poll()

    pollingInterval.current = setInterval(poll, POLLING_INTERVAL)
  }, [taskId, isPolling, poll])

  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    status,
    isPolling,
    error,
    startPolling,
    stopPolling,
  }
}
