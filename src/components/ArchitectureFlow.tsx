import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Factory, Robot, FileText, Lightbulb, CheckCircle } from '@phosphor-icons/react'

interface ArchitectureFlowProps {
  currentPhase?: number
}

export function ArchitectureFlow({ currentPhase = 0 }: ArchitectureFlowProps) {
  const isIdle = currentPhase === 0
  const [demoPhase, setDemoPhase] = useState(1)

  useEffect(() => {
    if (!isIdle) return
    const interval = setInterval(() => {
      setDemoPhase(p => (p >= 4 ? 1 : p + 1))
    }, 1200)
    return () => clearInterval(interval)
  }, [isIdle])

  const activePipeline = isIdle ? demoPhase : currentPhase
  const phases = [
    {
      id: 1,
      number: '01',
      title: 'Initiation',
      subtitle: 'Agent Factory',
      description: 'User spawns an AI agent with unique identity, personality, and niche. Each agent receives a dedicated Mantle wallet and memory file.',
      icon: Factory,
      color: 'from-primary to-primary/50',
      details: [
        'Smart Account generation on Mantle',
        'Personality & niche configuration',
        'Sub-agent squad initialization'
      ]
    },
    {
      id: 2,
      number: '02',
      title: 'Delegation',
      subtitle: 'Mission Control',
      description: 'Agent receives event URL and delegates tasks to specialized sub-agents. Each sub-agent handles specific responsibilities autonomously.',
      icon: Robot,
      color: 'from-secondary to-secondary/50',
      details: [
        'Secretary: Event registration',
        'Scribe: Content extraction',
        'Social-Lite: Community monitoring',
        'Mint-Master: Gas optimization'
      ]
    },
    {
      id: 3,
      number: '03',
      title: 'Execution',
      subtitle: 'On-Chain Action',
      description: 'Sub-agents complete their tasks and parent agent consolidates results. NFT is minted on Mantle Network with AI-generated summary.',
      icon: FileText,
      color: 'from-accent to-accent/50',
      details: [
        'AI summarization of event',
        'IPFS metadata upload',
        'NFT minting on Mantle',
        'Transaction confirmation'
      ]
    },
    {
      id: 4,
      number: '04',
      title: 'Wisdom',
      subtitle: 'Strategic Insights',
      description: 'After 5 events, agent performs cross-analysis and generates strategic insights specific to user\'s niche.',
      icon: Lightbulb,
      color: 'from-amber-400 to-orange-500',
      details: [
        'Cross-event pattern analysis',
        'Niche-specific recommendations',
        'Strategic trend identification',
        'Actionable insights report'
      ]
    }
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-xs text-muted-foreground">
            From agent creation to strategic wisdom generation
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent opacity-30 hidden md:block" />

        <div className="space-y-3">
          {phases.map((phase, index) => {
            const isActive = currentPhase === phase.id
            const isCompleted = currentPhase > phase.id

            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <Card className={`glass-card-hover p-4 relative ${isActive ? 'border-2 border-primary/50 shadow-xl shadow-primary/20' : ''}`}>
                  <div className="flex gap-4">
                    {/* Phase Icon */}
                    <div className="hidden md:flex flex-col items-center relative z-10">
                      <motion.div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all duration-500 flex-shrink-0 ${
                          isCompleted
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400'
                            : isActive
                            ? `bg-gradient-to-br ${phase.color} border-primary animate-glow-pulse`
                            : 'bg-card/50 border-border'
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        {isCompleted ? (
                          <CheckCircle size={20} className="text-white" weight="fill" />
                        ) : (
                          <phase.icon
                            size={20}
                            className={isActive ? 'text-white' : 'text-muted-foreground'}
                            weight="duotone"
                          />
                        )}
                      </motion.div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${phase.color} text-white flex-shrink-0`}>
                          PHASE {phase.number}
                        </span>
                        <h3 className="text-sm font-bold">{phase.title}</h3>
                        <span className="text-xs text-primary font-semibold hidden sm:block">· {phase.subtitle}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{phase.description}</p>

                      <div className="grid grid-cols-2 gap-1">
                        {phase.details.map((detail, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs">
                            <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${phase.color} flex-shrink-0`} />
                            <span className="text-muted-foreground truncate">{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Live Pipeline Visualization */}
      <Card className="glass-card-hover p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Robot className="text-primary" weight="duotone" size={15} />
            </div>
            <span>Live Pipeline</span>
          </h3>
          {isIdle && (
            <span className="text-[9px] font-mono text-primary/60 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full animate-pulse">
              Preview Mode
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <PipelineStage title="Agent" subtitle="Spawn" active={activePipeline >= 1} highlight={isIdle && demoPhase === 1} />
          <PipelineArrow active={activePipeline >= 2} />
          <PipelineStage title="Delegate" subtitle="Sub-Agents" active={activePipeline >= 2} highlight={isIdle && demoPhase === 2} />
          <PipelineArrow active={activePipeline >= 3} />
          <PipelineStage title="Execute" subtitle="On-Chain" active={activePipeline >= 3} highlight={isIdle && demoPhase === 3} />
          <PipelineArrow active={activePipeline >= 4} />
          <PipelineStage title="Wisdom" subtitle="Insights" active={activePipeline >= 4} highlight={isIdle && demoPhase === 4} />
        </div>

        {isIdle && (
          <p className="text-[9px] text-muted-foreground/50 font-mono text-center mt-3">
            Connect wallet to track your agent's live pipeline status
          </p>
        )}
      </Card>
    </div>
  )
}

function PipelineStage({ title, subtitle, active, highlight }: { title: string; subtitle: string; active: boolean; highlight?: boolean }) {
  return (
    <motion.div
      className={`flex flex-col items-center gap-2 transition-all duration-500 ${
        active ? 'opacity-100' : 'opacity-40'
      }`}
      animate={active ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-300 ${
        highlight
          ? 'bg-gradient-to-br from-primary/50 to-secondary/50 border-primary shadow-lg shadow-primary/40 scale-110'
          : active
          ? 'bg-gradient-to-br from-primary/30 to-secondary/30 border-primary/60 shadow-md shadow-primary/20'
          : 'bg-card/30 border-border'
      }`}>
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold">{title}</p>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
    </motion.div>
  )
}

function PipelineArrow({ active }: { active: boolean }) {
  return (
    <motion.div
      className="flex-1 h-0.5 relative"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: active ? 1 : 0 }}
      transition={{ duration: 0.5 }}
      style={{ originX: 0 }}
    >
      <div className={`h-full ${active ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-border'}`} />
      {active && (
        <motion.div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full"
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}
