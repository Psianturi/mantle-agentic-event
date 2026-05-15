import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Agent } from '@/lib/types'
import { ArrowRight, Wallet, Lightning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface TopUpGasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent
  userBalance: number
  onTopUp: (agentId: string, amount: number) => Promise<void>
}

export function TopUpGasDialog({ open, onOpenChange, agent, userBalance, onTopUp }: TopUpGasDialogProps) {
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleTopUp = async () => {
    const numAmount = parseFloat(amount)
    
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Invalid amount', {
        description: 'Please enter a valid amount greater than 0'
      })
      return
    }

    if (numAmount > userBalance) {
      toast.error('Insufficient balance', {
        description: `You only have ${userBalance.toFixed(4)} MNT available`
      })
      return
    }

    setIsProcessing(true)
    toast.info('Waiting for wallet signature...', {
      description: 'Please approve the transaction in your wallet'
    })

    try {
      await onTopUp(agent.id, numAmount)

      toast.success('Gas top-up successful!', {
        description: `Transferred ${numAmount.toFixed(4)} MNT to ${agent.name}'s wallet`
      })

      setAmount('')
      onOpenChange(false)
    } catch (error) {
      toast.error('Top-up failed', {
        description: error instanceof Error ? error.message : 'Failed to top up agent gas'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMaxClick = () => {
    setAmount(Math.max(0, userBalance).toFixed(4))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-2 border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Lightning className="text-primary" weight="fill" size={28} />
            <span>Top-Up Agent Gas</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Transfer MNT from your wallet to {agent.name}'s autonomous smart account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="glass-card p-4 border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">From: User Wallet</p>
                <p className="text-sm font-mono text-foreground/90">{userBalance.toFixed(4)} MNT</p>
              </div>
              <ArrowRight className="text-primary" weight="bold" size={24} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">To: Agent Wallet</p>
                <p className="text-sm font-mono text-foreground/90">{(agent.agentGasBalance ?? 0).toFixed(4)} MNT</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Transfer Amount (MNT)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.0001"
                min="0"
                max={userBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0000"
                className="flex-1 border-primary/30 focus:border-primary bg-background/50 font-mono"
                disabled={isProcessing}
              />
              <Button
                onClick={handleMaxClick}
                variant="outline"
                className="px-4 border-primary/30 hover:border-primary/50"
                disabled={isProcessing}
              >
                MAX
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Available balance: {userBalance.toFixed(4)} MNT
            </p>
          </div>

          <div className="glass-card p-4 border border-amber-500/30 bg-amber-500/5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Transaction Details</p>
            </div>
            <div className="space-y-1 text-xs text-foreground/80">
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="font-mono">Mantle Network</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Gas:</span>
                <span className="font-mono">~0.0001 MNT</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>Total Cost:</span>
                <span className="font-mono">{amount ? (parseFloat(amount) + 0.0001).toFixed(4) : '0.0001'} MNT</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 border-border/50 hover:border-border"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTopUp}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > userBalance || isProcessing}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 font-semibold shadow-lg shadow-primary/30"
            >
              {isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Wallet className="mr-2" weight="duotone" />
                </motion.div>
              ) : (
                <Wallet className="mr-2" weight="duotone" />
              )}
              {isProcessing ? 'Processing...' : 'Confirm Top-Up'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
