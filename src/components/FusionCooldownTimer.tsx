import { useEffect, useState } from 'react'
import { Agent } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Clock, Snowflake } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface FusionCooldownTimerProps {
  agent: Agent
  className?: string
}

export function FusionCooldownTimer({ agent, className }: FusionCooldownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState('')
  const [isOnCooldown, setIsOnCooldown] = useState(false)

  useEffect(() => {
    if (!agent.lastBreedingTime || !agent.breedingCooldownHours) {
      setIsOnCooldown(false)
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const cooldownEnd = agent.lastBreedingTime! + (agent.breedingCooldownHours! * 60 * 60 * 1000)
      const remaining = cooldownEnd - now

      if (remaining <= 0) {
        setIsOnCooldown(false)
        setTimeRemaining('')
        return
      }

      setIsOnCooldown(true)

      const hours = Math.floor(remaining / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [agent.lastBreedingTime, agent.breedingCooldownHours])

  if (!isOnCooldown) {
    return null
  }

  return (
    <Card className={cn(
      "glass-card p-4 border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 relative overflow-hidden",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 animate-pulse" />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
          <Snowflake size={24} className="text-amber-500 animate-spin" weight="duotone" style={{ animationDuration: '3s' }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-amber-500" weight="duotone" />
            <h4 className="font-bold text-amber-500 text-sm">Breeding Cooldown Active</h4>
          </div>
          <p className="text-xs text-foreground/80">
            This agent needs to rest before another fusion
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-amber-500">{timeRemaining}</div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</p>
        </div>
      </div>
    </Card>
  )
}
