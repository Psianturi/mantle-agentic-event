import { useEffect, useState } from 'react'
import { Agent } from '@/lib/types'
import { Clock, Warning } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface FusionCooldownTimerProps {
  agent: Agent
  compact?: boolean
}

export function FusionCooldownTimer({ agent, compact = false }: FusionCooldownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number
    minutes: number
    seconds: number
    totalMs: number
  } | null>(null)

  useEffect(() => {
    if (!agent.lastBreedingTime || !agent.breedingCooldownHours) {
      setTimeRemaining(null)
      return
    }

    const calculateTimeRemaining = () => {
      const cooldownMs = agent.breedingCooldownHours! * 60 * 60 * 1000
      const elapsedMs = Date.now() - agent.lastBreedingTime!
      const remainingMs = Math.max(0, cooldownMs - elapsedMs)

      if (remainingMs === 0) {
        setTimeRemaining(null)
        return
      }

      const hours = Math.floor(remainingMs / (1000 * 60 * 60))
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000)

      setTimeRemaining({ hours, minutes, seconds, totalMs: remainingMs })
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [agent.lastBreedingTime, agent.breedingCooldownHours])

  if (!timeRemaining || timeRemaining.totalMs === 0) {
    return null
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30"
      >
        <Clock size={14} className="text-amber-500 animate-pulse" weight="bold" />
        <span className="text-xs font-mono text-amber-500 font-semibold">
          {timeRemaining.hours}h {timeRemaining.minutes}m
        </span>
      </motion.div>
    )
  }

  const progress = ((agent.breedingCooldownHours! * 60 * 60 * 1000 - timeRemaining.totalMs) / (agent.breedingCooldownHours! * 60 * 60 * 1000)) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5" />
      
      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Clock size={22} className="text-amber-500 animate-pulse" weight="duotone" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-amber-500 flex items-center gap-2">
              Neural Cooldown Active
              <Warning size={16} className="text-amber-500 animate-pulse" weight="fill" />
            </h4>
            <p className="text-xs text-muted-foreground">Agent is recovering from fusion process</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Time Remaining</span>
            <span className="font-mono font-bold text-amber-500">
              {timeRemaining.hours.toString().padStart(2, '0')}:
              {timeRemaining.minutes.toString().padStart(2, '0')}:
              {timeRemaining.seconds.toString().padStart(2, '0')}
            </span>
          </div>

          <div className="relative h-2 bg-amber-500/10 rounded-full overflow-hidden border border-amber-500/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>

        <div className="pt-2 border-t border-amber-500/20">
          <p className="text-xs text-amber-500/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            This agent cannot be used for fusion until cooldown completes
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export function isAgentOnCooldown(agent: Agent): boolean {
  if (!agent.lastBreedingTime || !agent.breedingCooldownHours) {
    return false
  }

  const cooldownMs = agent.breedingCooldownHours * 60 * 60 * 1000
  const elapsedMs = Date.now() - agent.lastBreedingTime
  return elapsedMs < cooldownMs
}

export function getRemainingCooldownMs(agent: Agent): number {
  if (!agent.lastBreedingTime || !agent.breedingCooldownHours) {
    return 0
  }

  const cooldownMs = agent.breedingCooldownHours * 60 * 60 * 1000
  const elapsedMs = Date.now() - agent.lastBreedingTime
  return Math.max(0, cooldownMs - elapsedMs)
}
