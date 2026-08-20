import { motion } from 'framer-motion'
import { Dna } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AgentCard } from '@/components/AgentCard'
import { FusionCooldownTimer } from '@/components/FusionCooldownTimer'
import { BreedingCooldownBoost } from '@/components/BreedingCooldownBoost'
import { Agent } from '@/lib/types'

interface NeuralFusionLabProps {
  agents: Agent[]
  walletConnected: boolean
  userBalance: number
  proposalCounts: Record<string, number>
  onConnectWallet: () => void
  onInitiateFusion: () => void
  onConfigureAgent: (agent: Agent) => void
  onChatWithAgent: (agent: Agent) => void
  onViewEvolution: (agent: Agent) => void
  onToggleAutoReplenish: (agent: Agent, enabled: boolean) => void
  onOpenProposals: (agent: Agent) => void
  onDeleteAgent: (agent: Agent) => void
  onRetrySpawn: (agent: Agent) => void
  onCooldownBoost: (agentId: string) => void
}

export function NeuralFusionLab({
  agents,
  walletConnected,
  userBalance,
  proposalCounts,
  onConnectWallet,
  onInitiateFusion,
  onConfigureAgent,
  onChatWithAgent,
  onViewEvolution,
  onToggleAutoReplenish,
  onOpenProposals,
  onDeleteAgent,
  onRetrySpawn,
  onCooldownBoost,
}: NeuralFusionLabProps) {
  const wisdomUnlockedCount = agents.filter(a => a.wisdomUnlocked).length

  return (
    <Card className="glass-card-hover p-5 border border-accent/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Dna className="text-accent" weight="duotone" size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold">Neural Fusion Lab</h3>
            <p className="text-xs text-muted-foreground">Merge wisdom-unlocked agents to breed powerful hybrids</p>
          </div>
        </div>
        <Button
          onClick={!walletConnected ? onConnectWallet : onInitiateFusion}
          disabled={walletConnected && wisdomUnlockedCount < 2}
          size="sm"
          className="bg-gradient-to-r from-accent to-secondary hover:opacity-90 font-semibold shadow-lg shadow-accent/20"
        >
          <Dna className="mr-1.5" weight="duotone" size={14} />
          {!walletConnected ? 'Connect to Fuse' : 'Initiate Fusion'}
        </Button>
      </div>
      {walletConnected && wisdomUnlockedCount < 2 && (
        <p className="text-xs text-muted-foreground">
          Need {Math.max(0, 2 - wisdomUnlockedCount)} more wisdom-unlocked agent(s) — attend more events to unlock
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {agents.map((agent, idx) => {
          const isOnCooldown = agent.lastBreedingTime && agent.breedingCooldownHours &&
            (Date.now() - agent.lastBreedingTime) < (agent.breedingCooldownHours * 60 * 60 * 1000)
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.08 }}
              className="space-y-2"
            >
              <AgentCard
                agent={agent}
                onConfigure={onConfigureAgent}
                onChat={onChatWithAgent}
                onViewEvolution={onViewEvolution}
                onToggleAutoReplenish={onToggleAutoReplenish}
                pendingProposalCount={proposalCounts[agent.id] ?? 0}
                onOpenProposals={onOpenProposals}
                onDeleteAgent={onDeleteAgent}
                onRetrySpawn={onRetrySpawn}
              />
              {isOnCooldown && (
                <div className="space-y-2">
                  <FusionCooldownTimer agent={agent} />
                  <BreedingCooldownBoost agent={agent} userBalance={userBalance} onBoost={onCooldownBoost} />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}
