import { useState, useCallback } from 'react'

/**
 * useLocalStorage — drop-in replacement for useKV from @github/spark/hooks.
 * Persists state to localStorage so data survives page refreshes on any host
 * (Vercel, GitHub Spark, etc.).
 *
 * API matches useKV: returns [value, setter] where setter accepts either a
 * new value OR an updater function (prev => next), matching React setState
 * conventions used throughout the app.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (updater: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        return JSON.parse(stored) as T
      }
    } catch {
      // corrupted JSON or localStorage unavailable — fall back to default
    }
    return defaultValue
  })

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: T) => T)(prev)
            : updater
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // storage full or private-browsing restriction — silently continue
        }
        return next
      })
    },
    [key]
  )

  return [state, setValue]
}
