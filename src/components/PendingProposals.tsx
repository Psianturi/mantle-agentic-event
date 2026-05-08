import { useState } from 'react'
import { AgentProposal, Agent } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  Brain,
  TrendUp,
  Lightbulb,
  Clock,
  ShieldWarning,
  ArrowRight,
  Coins
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface PendingProposalsProps {
  proposals: AgentProposal[]
  agents: Agent[]
  onApprove: (proposalId: string) => void
  onReject: (proposalId: string) => void
}

const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'low':
      return 'text-green-500 bg-green-500/20 border-green-500/30'
    case 'medium':
      return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30'
    case 'high':
      return 'text-red-500 bg-red-500/20 border-red-500/30'
  }
}

const getRiskIcon = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'low':
      return 'bg-green-500/10'
    case 'medium':
      return 'bg-yellow-500/10'
    case 'high':
      return 'bg-red-500/10'
  }
}

export function PendingProposals({
  proposals,
  agents,
  onApprove,
  onReject
}: PendingProposalsProps) {
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null)

  const pendingProposals = proposals.filter(p => p.status === 'pending')

  if (pendingProposals.length === 0) {
    return (
      <Card className="glass-card-hover p-10 text-center border-2 border-dashed border-primary/20">
        <Brain size={64} className="mx-auto mb-4 text-muted-foreground/50 animate-float" weight="duotone" />
        <h3 className="text-lg font-semibold mb-2">No Pending Proposals</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          High-level agents will generate strategic proposals once they reach Level 4 or higher
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/40 flex items-center justify-center animate-glow-pulse-gold">
              <Lightbulb className="text-amber-500" weight="duotone" size={26} />
            </div>
            <span>Pending Proposals</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve strategic actions proposed by your advanced agents
          </p>
        </div>
        <Badge variant="secondary" className="text-base px-4 py-2">
          {pendingProposals.length} Pending
        </Badge>
      </div>

      <AnimatePresence mode="popLayout">
        {pendingProposals.map((proposal, index) => {
          const agent = agents.find(a => a.id === proposal.agentId)
          const isExpanded = expandedProposal === proposal.id
          const timeLeft = proposal.expiresAt
            ? Math.max(0, Math.floor((proposal.expiresAt - Date.now()) / (1000 * 60 * 60)))
            : null

          return (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card-hover border-2 border-amber-500/30 shadow-lg shadow-amber-500/10 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${getRiskIcon(proposal.riskLevel)}`}>
                      <TrendUp size={32} weight="duotone" className="text-amber-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{proposal.title}</h3>
                            <Badge className={`${getRiskColor(proposal.riskLevel)} font-semibold`}>
                              {proposal.riskLevel.toUpperCase()} RISK
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Brain size={16} weight="duotone" />
                              {proposal.agentName} (Level {proposal.agentLevel})
                            </span>
                            {timeLeft !== null && (
                              <span className="flex items-center gap-1.5 text-amber-500">
                                <Clock size={16} weight="duotone" />
                                Expires in {timeLeft}h
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-muted-foreground mb-4">{proposal.description}</p>

                      {proposal.estimatedValue && (
                        <div className="flex items-center gap-2 mb-4">
                          <Coins size={20} weight="duotone" className="text-primary" />
                          <span className="text-sm font-semibold text-primary">
                            Estimated Value: {proposal.estimatedValue}
                          </span>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                        className="mb-4 text-primary hover:text-primary"
                      >
                        {isExpanded ? 'Hide Details' : 'View Details'}
                        <ArrowRight
                          size={16}
                          className={`ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </Button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <Separator className="my-4" />

                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                  <Brain size={18} weight="duotone" className="text-accent" />
                                  AI Reasoning
                                </h4>
                                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                                  {proposal.reasoning}
                                </p>
                              </div>

                              <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                  <ShieldWarning size={18} weight="duotone" className="text-secondary" />
                                  Based on Events
                                </h4>
                                <div className="space-y-2">
                                  {proposal.eventsSources.map((source, idx) => (
                                    <div
                                      key={idx}
                                      className="text-sm text-muted-foreground bg-muted/20 p-2 rounded border border-border/30 flex items-start gap-2"
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                      <span className="flex-1">{source}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Separator className="my-4" />

                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            onApprove(proposal.id)
                            toast.success('Proposal Approved', {
                              description: `${proposal.agentName} will execute the action`
                            })
                          }}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-green-500/30"
                          size="lg"
                        >
                          <CheckCircle size={20} weight="fill" className="mr-2" />
                          Approve Transaction
                        </Button>
                        <Button
                          onClick={() => {
                            onReject(proposal.id)
                            toast.info('Proposal Rejected', {
                              description: 'The proposal has been declined'
                            })
                          }}
                          variant="outline"
                          className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500 font-semibold"
                          size="lg"
                        >
                          <XCircle size={20} weight="fill" className="mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
