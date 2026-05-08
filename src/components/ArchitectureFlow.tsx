import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Factory, Robot, FileText, Lightbulb, CheckCircle } from '@phosphor-icons/react'

interface ArchitectureFlowProps {
  currentPhase?: number
}

export function ArchitectureFlow({ currentPhase = 0 }: ArchitectureFlowProps) {
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
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-muted-foreground">
            From agent creation to strategic wisdom generation
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent opacity-30 hidden md:block" />

        <div className="space-y-8">
          {phases.map((phase, index) => {
            const isActive = currentPhase === phase.id
            const isCompleted = currentPhase > phase.id
            
            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
              >
                <Card className={`glass-card-hover p-6 relative ${isActive ? 'border-2 border-primary/50 shadow-2xl shadow-primary/20' : ''}`}>
                  <div className="flex gap-6">
                    {/* Phase Number Circle */}
                    <div className="hidden md:flex flex-col items-center relative z-10">
                      <motion.div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                          isCompleted 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400'
                            : isActive
                            ? `bg-gradient-to-br ${phase.color} border-primary animate-glow-pulse`
                            : 'bg-card/50 border-border'
                        }`}
                        whileHover={{ scale: 1.1 }}
                      >
                        {isCompleted ? (
                          <CheckCircle size={32} className="text-white" weight="fill" />
                        ) : (
                          <phase.icon 
                            size={32} 
                            className={isActive ? 'text-white' : 'text-muted-foreground'} 
                            weight="duotone" 
                          />
                        )}
                      </motion.div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${phase.color} text-white`}>
                              PHASE {phase.number}
                            </span>
                            <h3 className="text-xl font-bold">{phase.title}</h3>
                          </div>
                          <p className="text-sm text-primary font-semibold mb-2">{phase.subtitle}</p>
                          <p className="text-muted-foreground">{phase.description}</p>
                        </div>
                      </div>

                      {/* Key Metrics or Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {phase.details.map((detail, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (index * 0.15) + (idx * 0.1) }}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${phase.color}`} />
                            <span className="text-muted-foreground">{detail}</span>
                          </motion.div>
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
      <Card className="glass-card-hover p-8 border-2 border-primary/20">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Robot className="text-primary" weight="duotone" size={22} />
          </div>
          <span>Live Pipeline</span>
        </h3>
        
        <div className="flex items-center justify-between gap-4">
          <PipelineStage title="Agent" subtitle="Spawn" active={currentPhase >= 1} />
          <PipelineArrow active={currentPhase >= 1} />
          <PipelineStage title="Delegate" subtitle="Sub-Agents" active={currentPhase >= 2} />
          <PipelineArrow active={currentPhase >= 2} />
          <PipelineStage title="Execute" subtitle="On-Chain" active={currentPhase >= 3} />
          <PipelineArrow active={currentPhase >= 3} />
          <PipelineStage title="Wisdom" subtitle="Insights" active={currentPhase >= 4} />
        </div>
      </Card>
    </div>
  )
}

function PipelineStage({ title, subtitle, active }: { title: string; subtitle: string; active: boolean }) {
  return (
    <motion.div
      className={`flex flex-col items-center gap-2 transition-all duration-500 ${
        active ? 'opacity-100' : 'opacity-40'
      }`}
      animate={active ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className={`w-16 h-16 rounded-xl flex items-center justify-center border-2 transition-all ${
        active 
          ? 'bg-gradient-to-br from-primary/30 to-secondary/30 border-primary/60 shadow-lg shadow-primary/30' 
          : 'bg-card/30 border-border'
      }`}>
        <div className={`w-3 h-3 rounded-full ${active ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
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
