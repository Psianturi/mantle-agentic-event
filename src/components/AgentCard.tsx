import { Agent } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Robot, Lightning, TrendUp, Brain } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
}

const statusColors = {
  idle: 'bg-muted text-muted-foreground',
  active: 'bg-primary text-primary-foreground animate-glow-pulse',
  processing: 'bg-secondary text-secondary-foreground',
  error: 'bg-destructive text-destructive-foreground'
}

const personalityIcons = {
  Aggressive: Lightning,
  Analytical: TrendUp,
  Creative: Brain
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const PersonalityIcon = personalityIcons[agent.personality]
  const progress = (agent.eventsAttended / 5) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={cn(
        'glass-card p-6 relative overflow-hidden group',
        agent.status === 'active' && 'border-primary shadow-lg shadow-primary/20'
      )}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                'bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30'
              )}>
                <Robot size={24} className="text-primary" weight="duotone" />
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight">{agent.name}</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
                </p>
              </div>
            </div>
            <Badge className={statusColors[agent.status]}>
              {agent.status.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Niche</p>
              <p className="text-sm font-medium">{agent.niche}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Personality</p>
              <div className="flex items-center gap-1">
                <PersonalityIcon size={14} className="text-primary" />
                <p className="text-sm font-medium">{agent.personality}</p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Events Progress</span>
              <span className="font-mono">{agent.eventsAttended}/5</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-primary to-secondary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Level</span>
              <span className="font-bold text-primary">{agent.level}</span>
            </div>
            {agent.wisdomUnlocked && (
              <Badge className="bg-gradient-to-r from-secondary to-accent text-xs">
                🔓 Wisdom Unlocked
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border/50">
            {agent.subAgents.map((subAgent) => (
              <div
                key={subAgent.type}
                className={cn(
                  'w-2 h-2 rounded-full',
                  subAgent.status === 'active' ? 'bg-primary animate-pulse' :
                  subAgent.status === 'processing' ? 'bg-secondary animate-pulse' :
                  subAgent.status === 'error' ? 'bg-destructive' :
                  'bg-muted'
                )}
                title={subAgent.name}
              />
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
