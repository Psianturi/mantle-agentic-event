import { Agent } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GitBranch, Robot, Dna, Sparkle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AgentLineageTreeProps {
  agent: Agent
  allAgents: Agent[]
  className?: string
}

export function AgentLineageTree({ agent, allAgents, className }: AgentLineageTreeProps) {
  if (!agent.parentIds || agent.parentIds.length === 0) {
    return null
  }

  const parent1 = allAgents.find(a => a.id === agent.parentIds?.[0])
  const parent2 = allAgents.find(a => a.id === agent.parentIds?.[1])

  if (!parent1 && !parent2) {
    return null
  }

  return (
    <Card className={cn(
      "glass-card p-6 border-2 border-accent/30 relative overflow-hidden",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-secondary/5" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
            <GitBranch size={20} className="text-accent" weight="duotone" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-lg">Genetic Lineage</h4>
            <p className="text-xs text-muted-foreground">Neural fusion history of this agent</p>
          </div>
          <Badge variant="outline" className="border-accent/40 text-accent">
            Gen-{agent.generation || 1}
          </Badge>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parent1 && (
              <div className="glass-card p-4 border border-primary/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                    <Robot size={20} className="text-primary" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground">PARENT A</span>
                      {parent1.generation && parent1.generation >= 2 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-500">
                          Gen-{parent1.generation}
                        </Badge>
                      )}
                    </div>
                    <h5 className="font-bold text-sm truncate">{parent1.name}</h5>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">
                        {parent1.niche}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Lv.{parent1.level}
                      </span>
                      {parent1.wisdomUnlocked && (
                        <Sparkle size={12} className="text-amber-500" weight="fill" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {parent2 && (
              <div className="glass-card p-4 border border-secondary/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 border border-secondary/40 flex items-center justify-center flex-shrink-0">
                    <Robot size={20} className="text-secondary" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground">PARENT B</span>
                      {parent2.generation && parent2.generation >= 2 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-500">
                          Gen-{parent2.generation}
                        </Badge>
                      )}
                    </div>
                    <h5 className="font-bold text-sm truncate">{parent2.name}</h5>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">
                        {parent2.niche}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Lv.{parent2.level}
                      </span>
                      {parent2.wisdomUnlocked && (
                        <Sparkle size={12} className="text-amber-500" weight="fill" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center py-4">
            <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            <div className="relative bg-background px-4">
              <div className="flex items-center gap-2">
                <Dna size={20} className="text-accent" weight="duotone" />
                <span className="text-xs font-semibold text-accent">NEURAL FUSION</span>
                <Dna size={20} className="text-accent" weight="duotone" />
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-2 border-accent/40 rounded-lg bg-gradient-to-br from-accent/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/30 to-secondary/30 border-2 border-accent/40 flex items-center justify-center flex-shrink-0">
                <Robot size={24} className="text-accent" weight="duotone" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-accent">OFFSPRING (HYBRID)</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-accent/40 text-accent">
                    Gen-{agent.generation}
                  </Badge>
                </div>
                <h5 className="font-bold text-base">{agent.name}</h5>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-accent/40">
                    {agent.niche}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Level {agent.level}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {agent.eventsAttended} Events
                  </span>
                  {agent.wisdomUnlocked && (
                    <div className="flex items-center gap-1">
                      <Sparkle size={14} className="text-amber-500" weight="fill" />
                      <span className="text-xs font-semibold text-amber-500">Wisdom</span>
                    </div>
                  )}
                </div>
                {agent.geneticTraits && agent.geneticTraits.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Inherited Traits</p>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.geneticTraits.map((trait, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[9px] px-2 py-0.5 h-5">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
