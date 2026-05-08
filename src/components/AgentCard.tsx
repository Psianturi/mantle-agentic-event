import { Agent } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Robot, Lightning, TrendUp, Brain, UserCircle, PencilSimple, ChatCircle, Coins, GearSix, CurrencyCircleDollar } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
  onConfigure?: (agent: Agent) => void
  onChat?: (agent: Agent) => void
}

const statusColors = {
  idle: 'bg-muted/50 text-muted-foreground border-muted',
  active: 'bg-primary/20 text-primary border-primary animate-glow-pulse',
  processing: 'bg-secondary/20 text-secondary border-secondary animate-glow-pulse-purple',
  error: 'bg-destructive/20 text-destructive border-destructive'
}

const personalityIcons = {
  Aggressive: Lightning,
  Analytical: TrendUp,
  Creative: Brain
}

const subAgentIcons = {
  secretary: UserCircle,
  scribe: PencilSimple,
  'social-lite': ChatCircle,
  'mint-master': Coins
}

const subAgentLabels = {
  secretary: 'Secretary',
  scribe: 'Scribe',
  'social-lite': 'Social-Lite',
  'mint-master': 'Mint-Master'
}

export function AgentCard({ agent, onClick, onConfigure, onChat }: AgentCardProps) {
  const PersonalityIcon = personalityIcons[agent.personality]
  const progress = (agent.eventsAttended / 5) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer"
    >
      <Card className={cn(
        'glass-card-hover p-6 relative overflow-hidden group transition-all duration-300',
        agent.status === 'active' && 'neon-border-cyan',
        agent.status === 'processing' && 'neon-border-purple'
      )}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/15 transition-all duration-500" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -ml-16 -mb-16 group-hover:bg-secondary/15 transition-all duration-500" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3" onClick={onClick}>
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center relative',
                'bg-gradient-to-br from-primary/30 to-secondary/30 border-2',
                agent.status === 'active' ? 'border-primary' : 'border-primary/20'
              )}>
                <Robot size={24} className="text-primary" weight="duotone" />
                {agent.status === 'active' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight">{agent.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
                </p>
              </div>
            </div>
            <Badge className={cn('text-xs font-mono', statusColors[agent.status])}>
              {agent.status.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5" onClick={onClick}>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Niche</p>
              <p className="text-sm font-semibold">{agent.niche}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Personality</p>
              <div className="flex items-center gap-1.5">
                <PersonalityIcon size={16} className="text-primary" weight="duotone" />
                <p className="text-sm font-semibold">{agent.personality}</p>
              </div>
            </div>
          </div>

          <div className="mb-5 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20" onClick={onClick}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CurrencyCircleDollar size={18} className="text-primary" weight="duotone" />
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Mantle Balance</span>
              </div>
              <span className="text-sm font-bold font-mono text-primary">{agent.mantleBalance?.toFixed(3) || '0.000'} MNT</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Gas Spent:</span>
              <span className="text-xs font-mono text-muted-foreground">{agent.gasSpent?.toFixed(4) || '0.0000'} MNT</span>
            </div>
          </div>

          <div className="mb-5" onClick={onClick}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">Wisdom Progress</span>
              <span className="font-mono font-bold text-primary">{agent.eventsAttended}/5</span>
            </div>
            <div className="relative h-2.5 bg-muted/50 rounded-full overflow-hidden border border-border/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={cn(
                  'h-full rounded-full',
                  agent.wisdomUnlocked 
                    ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 animate-glow-pulse-gold' 
                    : 'bg-gradient-to-r from-primary via-accent to-secondary'
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-5" onClick={onClick}>
            <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-muted-foreground">Level</span>
              <span className="font-bold text-primary">{agent.level}</span>
            </div>
            {agent.wisdomUnlocked && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold animate-glow-pulse-gold border-0">
                ✨ Wisdom Unlocked
              </Badge>
            )}
          </div>

          <div className="pt-5 border-t border-border/30 mb-5" onClick={onClick}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Sub-Agent Status</p>
            <TooltipProvider>
              <div className="grid grid-cols-4 gap-3">
                {agent.subAgents.map((subAgent) => {
                  const Icon = subAgentIcons[subAgent.type]
                  return (
                    <Tooltip key={subAgent.type}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30 hover:border-primary/40 transition-all group/sub">
                          <div className="relative">
                            <Icon 
                              size={20} 
                              className={cn(
                                'transition-colors',
                                subAgent.status === 'active' ? 'text-primary' :
                                subAgent.status === 'processing' ? 'text-secondary' :
                                subAgent.status === 'error' ? 'text-destructive' :
                                'text-muted-foreground'
                              )}
                              weight={subAgent.status === 'idle' ? 'regular' : 'duotone'}
                            />
                            <div 
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background',
                                subAgent.status === 'active' ? 'bg-green-500 animate-pulse' :
                                subAgent.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                                subAgent.status === 'error' ? 'bg-red-500' :
                                'bg-gray-500'
                              )}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="glass-card border-primary/30">
                        <div className="space-y-1">
                          <p className="font-semibold text-xs">{subAgentLabels[subAgent.type]}</p>
                          <p className="text-xs text-muted-foreground">{subAgent.description}</p>
                          <p className={cn(
                            'text-xs font-mono font-bold',
                            subAgent.status === 'active' ? 'text-green-500' :
                            subAgent.status === 'processing' ? 'text-yellow-500' :
                            subAgent.status === 'error' ? 'text-red-500' :
                            'text-gray-500'
                          )}>
                            {subAgent.status.toUpperCase()}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {onChat && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onChat(agent)
                }}
                variant="outline"
                size="sm"
                className="border-accent/30 hover:bg-accent/10 hover:border-accent/50 transition-all"
              >
                <ChatCircle className="mr-1.5" weight="duotone" size={16} />
                Chat
              </Button>
            )}
            {onConfigure && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onConfigure(agent)
                }}
                variant="outline"
                size="sm"
                className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
              >
                <GearSix className="mr-1.5" weight="duotone" size={16} />
                Config
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
