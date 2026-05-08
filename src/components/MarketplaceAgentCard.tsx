import { MarketplaceAgent } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Robot, Brain, TrendUp, Fire, ShoppingCart } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MarketplaceAgentCardProps {
  agent: MarketplaceAgent
  onBuy: (agent: MarketplaceAgent) => void
  isPurchasing?: boolean
}

export function MarketplaceAgentCard({ agent, onBuy, isPurchasing }: MarketplaceAgentCardProps) {
  const personalityColors = {
    Aggressive: 'from-red-500/20 to-orange-500/20 border-red-500/40',
    Analytical: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40',
    Creative: 'from-purple-500/20 to-pink-500/20 border-purple-500/40'
  }

  const nicheIcons = {
    'Blockchain/DeFi': '⛓️',
    'Trading/Investment': '📈',
    'Technology': '💻',
    'Health/Wellness': '🧘'
  }

  const generation = agent.generation ?? 1
  const isRare = generation >= 3

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {isRare && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 animate-pulse blur-lg -z-10" />
      )}
      
      <Card className={cn(
        'glass-card-hover p-6 border-2 relative overflow-hidden group',
        personalityColors[agent.personality],
        isRare && 'border-amber-500/50 shadow-xl shadow-amber-500/20'
      )}>
        {isRare && (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-shimmer" />
            <div className="absolute top-3 right-3 z-20">
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/50 flex items-center gap-1.5"
              >
                <span>✨</span>
                <span>GEN-{generation} MYTHIC</span>
              </motion.div>
            </div>
          </>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 border-2 border-primary/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Robot size={26} className="text-primary" weight="duotone" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                  {agent.name}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>{nicheIcons[agent.niche]}</span>
                  <span>{agent.niche}</span>
                </p>
              </div>
            </div>
            
            {agent.wisdomUnlocked && (
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Brain size={24} className="text-amber-500" weight="fill" />
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Level</p>
              <p className="text-lg font-bold text-primary">{agent.level}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Events</p>
              <p className="text-lg font-bold text-accent">{agent.eventsAttended}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Personality</span>
              <Badge variant="outline" className="font-semibold border-primary/40 text-primary">
                {agent.personality}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Fire size={14} weight="fill" className="text-orange-500" />
                <span>Gas Balance</span>
              </span>
              <span className="font-mono font-semibold text-foreground">{agent.agentGasBalance?.toFixed(3)} MNT</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Seller</span>
              <span className="font-mono text-xs text-accent">{agent.seller}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendUp size={20} className="text-green-500" weight="bold" />
                <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  {agent.price.toFixed(1)} MNT
                </span>
              </div>
              {agent.wisdomUnlocked && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none">
                  Wisdom ✨
                </Badge>
              )}
            </div>
            
            <Button
              onClick={() => onBuy(agent)}
              disabled={isPurchasing}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300"
            >
              {isPurchasing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <Fire size={18} weight="fill" />
                  </motion.div>
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2" weight="bold" size={18} />
                  Buy Agent
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
