import { Agent, EvolutionLevel } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { CheckCircle, Lock, Sparkle, Brain, Robot, Trophy } from '@phosphor-icons/react'

interface AgentEvolutionPathProps {
  agent: Agent
}

const getEvolutionLevels = (agent: Agent): EvolutionLevel[] => {
  return [
    {
      level: 1,
      title: 'Event Summarization & NFT Minting',
      description: 'Basic autonomous event attendance and proof-of-knowledge NFT creation',
      eventsRequired: 0,
      unlocked: agent.level >= 1,
      features: [
        'Attend digital events automatically',
        'Generate AI-powered summaries',
        'Mint Proof-of-Attendance NFTs',
        'Basic sub-agent coordination'
      ]
    },
    {
      level: 2,
      title: 'Multi-Platform Integration',
      description: 'Enhanced cross-platform event monitoring and engagement',
      eventsRequired: 2,
      unlocked: agent.level >= 2,
      features: [
        'Monitor multiple event platforms',
        'Community sentiment analysis',
        'Enhanced transcript processing',
        'Gas fee optimization'
      ]
    },
    {
      level: 3,
      title: 'Cross-Event Pattern Recognition',
      description: 'Advanced analytical capabilities across multiple events',
      eventsRequired: 4,
      unlocked: agent.level >= 3,
      features: [
        'Identify trends across events',
        'Pattern recognition algorithms',
        'Strategic insight generation',
        'Predictive event recommendations'
      ]
    },
    {
      level: 4,
      title: 'Strategic Decision Making',
      description: 'Generate actionable strategic proposals based on accumulated knowledge',
      eventsRequired: 6,
      unlocked: agent.level >= 4,
      features: [
        'Generate strategic proposals',
        'Risk assessment capabilities',
        'Multi-event consensus building',
        'Value opportunity identification'
      ]
    },
    {
      level: 5,
      title: 'Semi-Autonomous Action Execution',
      description: 'Propose and execute complex actions with user approval',
      eventsRequired: 8,
      unlocked: agent.level >= 5,
      features: [
        'Autonomous proposal generation',
        'Transaction execution capability',
        'Advanced risk management',
        'Full strategic autonomy mode'
      ]
    }
  ]
}

const getLevelIcon = (level: number) => {
  switch (level) {
    case 1:
      return Robot
    case 2:
      return Sparkle
    case 3:
      return Brain
    case 4:
      return Trophy
    case 5:
      return Trophy
    default:
      return Robot
  }
}

export function AgentEvolutionPath({ agent }: AgentEvolutionPathProps) {
  const levels = getEvolutionLevels(agent)

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Evolution Path
        </h3>
        <p className="text-muted-foreground">
          Progress: Level {agent.level} ({agent.eventsAttended} events attended)
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-accent/20 to-secondary/20" />

        <div className="space-y-6">
          {levels.map((evolutionLevel, index) => {
            const LevelIcon = getLevelIcon(evolutionLevel.level)
            const isUnlocked = evolutionLevel.unlocked
            const isCurrent = agent.level === evolutionLevel.level

            return (
              <motion.div
                key={evolutionLevel.level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-20"
              >
                <div
                  className={`absolute left-0 w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-primary/30 to-accent/30 border-primary shadow-lg shadow-primary/30 animate-glow-pulse'
                      : 'bg-muted/20 border-muted-foreground/20'
                  }`}
                >
                  {isUnlocked ? (
                    <LevelIcon
                      size={32}
                      weight="duotone"
                      className="text-primary"
                    />
                  ) : (
                    <Lock size={32} weight="duotone" className="text-muted-foreground/40" />
                  )}
                </div>

                <Card
                  className={`p-6 transition-all duration-500 ${
                    isUnlocked
                      ? 'glass-card-hover border-primary/30 shadow-lg shadow-primary/10'
                      : 'bg-muted/5 border-muted/20 opacity-60'
                  } ${isCurrent ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono font-bold text-muted-foreground">
                          Level {evolutionLevel.level}
                        </span>
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/20 border border-green-500/30 text-green-500 text-xs font-semibold">
                            <CheckCircle size={14} weight="fill" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/20 border border-muted/30 text-muted-foreground text-xs font-semibold">
                            <Lock size={14} weight="fill" />
                            Locked
                          </span>
                        )}
                      </div>
                      <h4
                        className={`text-lg font-bold mb-2 ${
                          isUnlocked
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {evolutionLevel.title}
                      </h4>
                      <p
                        className={`text-sm mb-4 ${
                          isUnlocked
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/60'
                        }`}
                      >
                        {evolutionLevel.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {evolutionLevel.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 text-sm ${
                          isUnlocked
                            ? 'text-foreground/90'
                            : 'text-muted-foreground/50'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            isUnlocked ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {!isUnlocked && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Requires {evolutionLevel.eventsRequired} events attended •{' '}
                        {Math.max(0, evolutionLevel.eventsRequired - agent.eventsAttended)}{' '}
                        events remaining
                      </p>
                    </div>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
