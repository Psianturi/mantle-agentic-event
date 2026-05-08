import { Agent } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Dna, ArrowDown } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface AgentLineageTreeProps {
  agent: Agent
  allAgents: Agent[]
}

export function AgentLineageTree({ agent, allAgents }: AgentLineageTreeProps) {
  if (!agent.parentIds || agent.parentIds.length === 0) {
    return (
      <div className="text-center py-8">
        <Dna size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" weight="duotone" />
        <p className="text-sm text-muted-foreground">
          {agent.isGenesis ? 'Genesis Agent - No Lineage' : 'First Generation Agent'}
        </p>
      </div>
    )
  }

  const parent1 = allAgents.find(a => a.id === agent.parentIds?.[0])
  const parent2 = allAgents.find(a => a.id === agent.parentIds?.[1])

  const getGenerationLabel = (gen?: number) => {
    if (!gen) return 'Gen-1'
    if (gen === 1) return 'Gen-1 (Genesis)'
    if (gen === 2) return 'Gen-2'
    if (gen >= 3) return `Gen-${gen}`
    return `Gen-${gen}`
  }

  const getGenerationColor = (gen?: number) => {
    if (!gen || gen === 1) return 'from-primary/30 to-primary/10'
    if (gen === 2) return 'from-secondary/30 to-secondary/10'
    if (gen >= 3) return 'from-accent/30 to-accent/10'
    return 'from-muted/30 to-muted/10'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Dna size={24} className="text-primary" weight="duotone" />
        <h4 className="font-semibold text-lg">Genetic Lineage</h4>
      </div>

      <div className="relative">
        <div className="flex justify-center gap-8 mb-8">
          {parent1 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className={`p-4 bg-gradient-to-br ${getGenerationColor(parent1.generation)} border-primary/30 relative overflow-hidden`}>
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-mono font-bold text-primary/70">
                    {getGenerationLabel(parent1.generation)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Dna size={20} className="text-primary" weight="duotone" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{parent1.name}</p>
                    <p className="text-xs text-muted-foreground">{parent1.niche}</p>
                    <p className="text-xs text-primary mt-1">Events: {parent1.eventsAttended}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-primary/20">
                  <p className="text-[10px] text-muted-foreground">Parent A</p>
                </div>
              </Card>
            </motion.div>
          )}

          {parent2 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className={`p-4 bg-gradient-to-br ${getGenerationColor(parent2.generation)} border-secondary/30 relative overflow-hidden`}>
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-mono font-bold text-secondary/70">
                    {getGenerationLabel(parent2.generation)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 border border-secondary/40 flex items-center justify-center">
                    <Dna size={20} className="text-secondary" weight="duotone" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{parent2.name}</p>
                    <p className="text-xs text-muted-foreground">{parent2.niche}</p>
                    <p className="text-xs text-secondary mt-1">Events: {parent2.eventsAttended}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-secondary/20">
                  <p className="text-[10px] text-muted-foreground">Parent B</p>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="flex justify-center mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center border-2 border-background shadow-xl">
              <ArrowDown size={24} className="text-background" weight="bold" />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <Card className={`p-5 bg-gradient-to-br ${getGenerationColor(agent.generation)} border-2 border-accent/50 relative overflow-hidden max-w-sm w-full`}>
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10" />
            <div className="absolute top-2 right-2">
              <span className="text-xs font-mono font-bold text-accent bg-accent/20 px-2 py-1 rounded-md border border-accent/40">
                {getGenerationLabel(agent.generation)}
              </span>
            </div>
            <div className="relative flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/30 to-primary/30 border-2 border-accent/50 flex items-center justify-center animate-glow-pulse">
                <Dna size={24} className="text-accent" weight="fill" />
              </div>
              <div>
                <p className="font-bold text-base">{agent.name}</p>
                <p className="text-sm text-muted-foreground">{agent.niche}</p>
              </div>
            </div>
            <div className="relative grid grid-cols-2 gap-2 pt-3 border-t border-accent/20">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Events</p>
                <p className="text-lg font-bold text-accent">{agent.eventsAttended}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Level</p>
                <p className="text-lg font-bold text-primary">{agent.level}</p>
              </div>
            </div>
            {agent.geneticTraits && agent.geneticTraits.length > 0 && (
              <div className="relative mt-3 pt-3 border-t border-accent/20">
                <p className="text-[10px] text-muted-foreground uppercase mb-2">Genetic Bonuses</p>
                <div className="flex flex-wrap gap-1">
                  {agent.geneticTraits.map((trait, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/30"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="relative mt-3 pt-3 border-t border-accent/20">
              <p className="text-[10px] text-muted-foreground text-center">Offspring (Current Agent)</p>
            </div>
          </Card>
        </motion.div>
      </div>

      {agent.generation && agent.generation >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <p className="text-sm text-amber-500 font-semibold">
              Elite Lineage: Gen-{agent.generation}+ agents inherit enhanced capabilities from multiple generations
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
