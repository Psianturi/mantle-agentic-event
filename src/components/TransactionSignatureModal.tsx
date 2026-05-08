import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Warning,
  Coins,
  Clock
} from '@phosphor-icons/react'
import { AgentProposal } from '@/lib/types'

interface TransactionSignatureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: AgentProposal | null
  onConfirm: (proposalId: string) => void
  onCancel: () => void
  walletAddress?: string
}

export function TransactionSignatureModal({
  open,
  onOpenChange,
  proposal,
  onConfirm,
  onCancel,
  walletAddress
}: TransactionSignatureModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'review' | 'signing' | 'success'>('review')

  useEffect(() => {
    if (!open) {
      setStep('review')
      setIsProcessing(false)
    }
  }, [open])

  if (!proposal) return null

  const handleSign = async () => {
    setIsProcessing(true)
    setStep('signing')
    
    await new Promise(resolve => setTimeout(resolve, 2500))
    
    setStep('success')
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    onConfirm(proposal.id)
    setIsProcessing(false)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl glass-card border-2 border-primary/30">
        <AnimatePresence mode="wait">
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center">
                    <Wallet size={26} weight="duotone" className="text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">Signature Request</DialogTitle>
                    <DialogDescription>Review and approve this transaction</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-6">
                <Card className="p-4 bg-amber-500/10 border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <Warning size={24} weight="duotone" className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-500 mb-1">Human-in-the-Loop Active</h4>
                      <p className="text-sm text-muted-foreground">
                        This action requires your explicit signature. Your agent cannot execute trades without your approval.
                      </p>
                    </div>
                  </div>
                </Card>

                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">TRANSACTION DETAILS</h4>
                  <Card className="p-4 space-y-3 border-border/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Proposal Title</p>
                        <p className="font-semibold">{proposal.title}</p>
                      </div>
                      <Badge className={`
                        ${proposal.riskLevel === 'low' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}
                        ${proposal.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : ''}
                        ${proposal.riskLevel === 'high' ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}
                      `}>
                        {proposal.riskLevel.toUpperCase()} RISK
                      </Badge>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Proposed By</p>
                      <p className="text-sm font-medium">{proposal.agentName} (Level {proposal.agentLevel})</p>
                    </div>

                    {proposal.estimatedValue && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-2">
                          <Coins size={18} weight="duotone" className="text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Estimated Value</p>
                            <p className="text-sm font-semibold text-primary">{proposal.estimatedValue}</p>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Description</p>
                      <p className="text-sm text-foreground/90">{proposal.description}</p>
                    </div>
                  </Card>
                </div>

                {walletAddress && (
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">SIGNING WALLET</h4>
                    <Card className="p-3 bg-muted/20 border-border/30">
                      <p className="text-sm font-mono text-foreground/80">{walletAddress}</p>
                    </Card>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSign}
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-green-500/30"
                    size="lg"
                  >
                    <ShieldCheck size={20} weight="fill" className="mr-2" />
                    Sign & Execute
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={isProcessing}
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500 font-semibold"
                    size="lg"
                  >
                    <XCircle size={20} weight="fill" className="mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'signing' && (
            <motion.div
              key="signing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12"
            >
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-primary/40 flex items-center justify-center animate-glow-pulse"
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    <Wallet size={40} weight="duotone" className="text-primary" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Processing Signature...</h3>
                  <p className="text-muted-foreground">
                    Please confirm the transaction in your wallet
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Clock size={16} className="text-primary animate-pulse" />
                  <p className="text-sm text-primary font-medium">Waiting for confirmation</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="py-12"
            >
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-2 border-green-500/40 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <CheckCircle size={40} weight="fill" className="text-green-500" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-green-500">Transaction Approved!</h3>
                  <p className="text-muted-foreground">
                    Your agent will now execute the proposal
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
