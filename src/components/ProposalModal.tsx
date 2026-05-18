import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Agent, BackendProposal } from '@/lib/types'
import { cloudRunService } from '@/services/cloudRunService'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Lightning,
  CheckCircle,
  XCircle,
  Clock,
  ArrowSquareOut,
  SpinnerGap,
  Lightbulb,
  TrendUp,
  GraduationCap,
  Users,
  Warning,
} from '@phosphor-icons/react'

interface ProposalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent
  onProposalCountChange?: (agentId: string, count: number) => void
}

const CATEGORY_CONFIG = {
  defi: {
    label: 'DeFi',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    Icon: TrendUp,
  },
  governance: {
    label: 'Governance',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    Icon: Lightning,
  },
  education: {
    label: 'Education',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    Icon: GraduationCap,
  },
  community: {
    label: 'Community',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    Icon: Users,
  },
} as const

function formatTTL(expiresAt: number): string {
  const remaining = Math.max(0, expiresAt - Date.now() / 1000)
  if (remaining <= 0) return 'Expired'
  const hours = Math.floor(remaining / 3600)
  const days = Math.floor(hours / 24)
  if (days >= 1) return `${days}d ${hours % 24}h left`
  return `${hours}h ${Math.floor((remaining % 3600) / 60)}m left`
}

function ProposalCard({
  proposal,
  onApprove,
  onReject,
  actioningId,
}: {
  proposal: BackendProposal
  onApprove: (p: BackendProposal) => void
  onReject: (p: BackendProposal) => void
  actioningId: string | null
}) {
  const cat = CATEGORY_CONFIG[proposal.category] ?? CATEGORY_CONFIG.community
  const CatIcon = cat.Icon
  const isActioning = actioningId === proposal.proposal_id
  const isApproved = proposal.status === 'approved'
  const isRejected = proposal.status === 'rejected'
  const isExpired = proposal.status === 'expired'
  const isPending = proposal.status === 'pending'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`rounded-xl border p-5 ${
        isApproved
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : isRejected
          ? 'border-red-500/20 bg-red-500/5'
          : isExpired
          ? 'border-border/40 bg-muted/10 opacity-60'
          : 'border-border/50 bg-card/60'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bg} ${cat.border} border`}>
          <CatIcon size={18} className={cat.color} weight="duotone" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={`text-[10px] font-bold px-2 py-0 border ${cat.bg} ${cat.color} ${cat.border}`}>
              {cat.label}
            </Badge>
            {isPending && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <Clock size={10} />
                {formatTTL(proposal.expires_at)}
              </span>
            )}
            {isApproved && (
              <Badge className="text-[10px] font-bold px-2 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                Approved
              </Badge>
            )}
            {isRejected && (
              <Badge className="text-[10px] font-bold px-2 py-0 bg-red-500/15 text-red-400 border-red-500/30">
                Rejected
              </Badge>
            )}
            {isExpired && (
              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 opacity-50">
                Expired
              </Badge>
            )}
          </div>
          <h3 className="font-bold text-sm leading-tight">{proposal.title}</h3>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        {proposal.description}
      </p>

      {isApproved && proposal.tx_hash && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Lightning size={14} className="text-emerald-400" weight="fill" />
            <span className="text-xs font-bold text-emerald-400">
              Heritage +{HERITAGE_XP} · Score: {proposal.heritage_score_after ?? '—'}
            </span>
          </div>
          <a
            href={`https://explorer.sepolia.mantle.xyz/tx/${proposal.tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            MantleScan
            <ArrowSquareOut size={10} />
          </a>
        </motion.div>
      )}

      {isPending && (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!!actioningId}
            onClick={() => onApprove(proposal)}
            className="flex-1 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isActioning ? (
              <SpinnerGap size={14} className="animate-spin" />
            ) : (
              <>
                <CheckCircle size={14} weight="fill" className="mr-1" />
                Approve
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!actioningId}
            onClick={() => onReject(proposal)}
            className="flex-1 h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400 font-semibold text-xs disabled:opacity-50"
          >
            {isActioning ? (
              <SpinnerGap size={14} className="animate-spin" />
            ) : (
              <>
                <XCircle size={14} weight="fill" className="mr-1" />
                Reject
              </>
            )}
          </Button>
        </div>
      )}
    </motion.div>
  )
}

const HERITAGE_XP = 5

export function ProposalModal({ open, onOpenChange, agent, onProposalCountChange }: ProposalModalProps) {
  const [proposals, setProposals] = useState<BackendProposal[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const pendingCount = proposals.filter(p => p.status === 'pending').length

  const notifyCount = useCallback((list: BackendProposal[]) => {
    onProposalCountChange?.(agent.id, list.filter(p => p.status === 'pending').length)
  }, [agent.id, onProposalCountChange])

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await cloudRunService.getAgentProposals(agent.id)
      setProposals(data)
      notifyCount(data)
    } catch {
      toast.error('Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }, [agent.id, notifyCount])

  useEffect(() => {
    if (open) fetchProposals()
    else setProposals([])
  }, [open, fetchProposals])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const newProposal = await cloudRunService.generateProposal(agent.id)
      const next = [newProposal, ...proposals]
      setProposals(next)
      notifyCount(next)
      toast.success('Strategic proposal generated', { description: newProposal.title })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      toast.error('Proposal generation failed', { description: msg })
    } finally {
      setGenerating(false)
    }
  }

  const handleApprove = async (proposal: BackendProposal) => {
    setActioningId(proposal.proposal_id)
    try {
      const updated = await cloudRunService.approveProposal(proposal.proposal_id)
      const next = proposals.map(p => p.proposal_id === updated.proposal_id ? updated : p)
      setProposals(next)
      notifyCount(next)
      toast.success('Proposal approved on-chain', {
        description: `Heritage Score +${HERITAGE_XP}`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed'
      toast.error('On-chain execution failed', { description: msg })
    } finally {
      setActioningId(null)
    }
  }

  const handleReject = async (proposal: BackendProposal) => {
    setActioningId(proposal.proposal_id)
    try {
      const updated = await cloudRunService.rejectProposal(proposal.proposal_id)
      const next = proposals.map(p => p.proposal_id === updated.proposal_id ? updated : p)
      setProposals(next)
      notifyCount(next)
      toast.info('Proposal rejected')
    } catch {
      toast.error('Failed to reject proposal')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-lg w-full max-h-[85vh] flex flex-col border-primary/30">
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-border/30">
          <DialogTitle className="flex items-center gap-3 text-lg font-bold">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/40 flex items-center justify-center">
              <Lightbulb size={18} className="text-amber-400" weight="duotone" />
            </div>
            <div>
              <div>Strategic Proposals</div>
              <div className="text-xs font-normal text-muted-foreground">{agent.name}</div>
            </div>
            {pendingCount > 0 && (
              <Badge className="ml-auto bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs font-bold">
                {pendingCount} pending
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <SpinnerGap size={32} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain size={32} className="text-muted-foreground/50" weight="duotone" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">No proposals yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Request a strategic consult — Gemini will analyse {agent.name}'s event history and generate an action proposal.
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {proposals.map(p => (
                <ProposalCard
                  key={p.proposal_id}
                  proposal={p}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  actioningId={actioningId}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t border-border/30 space-y-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || loading || !!actioningId}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {generating ? (
              <>
                <SpinnerGap size={16} className="animate-spin mr-2" />
                Consulting Gemini...
              </>
            ) : (
              <>
                <Lightbulb size={16} weight="duotone" className="mr-2" />
                Request Strategic Consult
              </>
            )}
          </Button>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 justify-center">
              <Warning size={11} className="text-amber-400" weight="fill" />
              <p className="text-[10px] text-muted-foreground">
                Approved proposals record on Mantle Sepolia and cost gas.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
