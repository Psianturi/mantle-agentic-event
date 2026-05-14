import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Niche, Personality, Agent, SubAgent } from '@/lib/types'
import { Sparkle, Lightning, CheckCircle, XCircle } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cloudRunService } from '@/services/cloudRunService'
import { mantleService } from '@/lib/blockchain/mantleService'
import { toast } from 'sonner'

interface SpawnAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentCreated: (agent: Agent) => void
  userWallet?: string  // Connected MetaMask address, forwarded to backend
}

const niches: Niche[] = ['Blockchain/DeFi', 'Trading/Investment', 'Technology', 'Health/Wellness']
const personalities: Personality[] = ['Aggressive', 'Analytical', 'Creative']

type SpawnPhase = 'form' | 'spawning' | 'deploying' | 'success' | 'error'

export function SpawnAgentDialog({ open, onOpenChange, onAgentCreated, userWallet }: SpawnAgentDialogProps) {
  const [name, setName] = useState('')
  const [personality, setPersonality] = useState<Personality>('Analytical')
  const [niche, setNiche] = useState<Niche>('Blockchain/DeFi')
  const [phase, setPhase] = useState<SpawnPhase>('form')
  const [deploymentSteps, setDeploymentSteps] = useState<{step: string, status: 'pending' | 'active' | 'complete' | 'error'}[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [deployedAgent, setDeployedAgent] = useState<Agent | null>(null)

  const handleSpawn = async () => {
    if (!name.trim()) return
    if (!userWallet) {
      toast.error('Wallet is not connected', {
        description: 'Connect your wallet before spawning an agent.'
      })
      return
    }

    setPhase('spawning')
    setErrorMessage('')
    
    const steps = [
      { step: 'Generating deterministic wallet...', status: 'pending' as const },
      { step: 'Provisioning gas reserves (0.5 MNT)...', status: 'pending' as const },
      { step: 'Finalizing agent identity...', status: 'pending' as const },
    ]
    setDeploymentSteps(steps)

    try {
      for (let i = 0; i < steps.length; i++) {
        setDeploymentSteps(prev => 
          prev.map((s, idx) => idx === i ? { ...s, status: 'active' } : s)
        )
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      setPhase('deploying')

      const response = await cloudRunService.spawnAgent({
        name: name.trim(),
        niche,
        personality,
        userWallet,
      })

      if (response.success) {
        const fundingTx = response.needsFunding
          ? await mantleService.spawnAgent(response.mantleAddress)
          : {
              success: true,
              contractAddress: mantleService.getContractAddress(),
              provisionAmount: '0.5',
            }

        if (!fundingTx.success) {
          throw new Error(fundingTx.error || 'Agent funding transaction failed')
        }

        if (response.needsFunding) {
          await cloudRunService.markAgentFunded(response.agentId)
        }

        setDeploymentSteps(prev => prev.map(s => ({ ...s, status: 'complete' })))

        const subAgents: SubAgent[] = [
          {
            type: 'secretary',
            name: 'Secretary',
            status: 'idle',
            description: 'Handles event registration and access management',
          },
          {
            type: 'scribe',
            name: 'Scribe',
            status: 'idle',
            description: 'Transcribes and summarizes event content',
          },
          {
            type: 'social-lite',
            name: 'Social-Lite',
            status: 'idle',
            description: 'Monitors community sentiment and engagement',
          },
          {
            type: 'mint-master',
            name: 'Mint-Master',
            status: 'idle',
            description: 'Manages gas optimization and NFT minting',
          },
        ]

        const newAgent: Agent = {
          id: response.agentId,
          name: name.trim(),
          personality,
          niche,
          walletAddress: response.mantleAddress,
          eventsAttended: 0,
          level: 1,
          status: 'idle',
          createdAt: Date.now(),
          subAgents,
          wisdomUnlocked: false,
          mantleBalance: Number(fundingTx.provisionAmount ?? response.initialBalance),
          gasSpent: fundingTx.gasUsed ? Number(fundingTx.gasUsed) : 0,
          agentGasBalance: Number(fundingTx.provisionAmount ?? 0.5),
          contractAddress: fundingTx.contractAddress,
          deploymentTxHash: fundingTx.transactionHash,
          needsFunding: false,
        }

        setDeployedAgent(newAgent)
        setPhase('success')

        toast.success('Agent deployed successfully!', {
          description: fundingTx.transactionHash
            ? 'Agent registered and funded on Mantle Network'
            : 'Agent already registered on Mantle Network'
        })

        setTimeout(() => {
          onAgentCreated(newAgent)
          handleClose()
        }, 2500)
      } else {
        throw new Error(response.error || 'Failed to spawn agent')
      }
    } catch (error) {
      console.error('Agent spawn error:', error)
      setPhase('error')
      setDeploymentSteps(prev => prev.map(s => 
        s.status === 'active' ? { ...s, status: 'error' } : s
      ))
      
      let errorMsg = 'Failed to spawn agent'
      if (error instanceof Error) {
        errorMsg = error.message
      }
      
      setErrorMessage(errorMsg)
      toast.error('Deployment failed', {
        description: errorMsg
      })
    }
  }

  const handleClose = () => {
    setName('')
    setPhase('form')
    setDeploymentSteps([])
    setErrorMessage('')
    setDeployedAgent(null)
    onOpenChange(false)
  }

  const handleRetry = () => {
    setPhase('form')
    setErrorMessage('')
    setDeploymentSteps([])
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] glass-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkle className="text-primary" weight="fill" />
            Spawn New Agent
          </DialogTitle>
          <DialogDescription>
            Create an autonomous AI agent with an on-chain wallet identity on Mantle
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {phase === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  placeholder="e.g., Alpha Genesis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality">Personality</Label>
                <Select value={personality} onValueChange={(v) => setPersonality(v as Personality)}>
                  <SelectTrigger id="personality" className="border-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {personalities.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {personality === 'Aggressive' && 'Fast-acting, prioritizes speed over precision'}
                  {personality === 'Analytical' && 'Methodical, focuses on detailed analysis'}
                  {personality === 'Creative' && 'Innovative, explores unconventional insights'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="niche">Information Niche</Label>
                <Select value={niche} onValueChange={(v) => setNiche(v as Niche)}>
                  <SelectTrigger id="niche" className="border-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {niches.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSpawn}
                disabled={!name.trim()}
                className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90 transition-opacity"
              >
                <Lightning className="mr-2" weight="fill" />
                Register Agent On-chain
              </Button>
            </motion.div>
          ) : (phase === 'spawning' || phase === 'deploying') ? (
            <motion.div
              key="deploying"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-8"
            >
              <div className="flex flex-col items-center mb-8">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mb-4 shadow-lg shadow-primary/50"
                >
                  <Sparkle size={32} className="text-background" weight="fill" />
                </motion.div>
                <h3 className="text-xl font-bold mb-2">Registering Agent on Mantle Network</h3>
                <p className="text-sm text-muted-foreground">Initializing agentic wallet and gas reserves...</p>
              </div>

              <div className="space-y-3">
                {deploymentSteps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border"
                  >
                    {step.status === 'complete' && (
                      <CheckCircle size={20} className="text-green-500 flex-shrink-0" weight="fill" />
                    )}
                    {step.status === 'active' && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full flex-shrink-0"
                      />
                    )}
                    {step.status === 'pending' && (
                      <div className="w-5 h-5 border-2 border-muted rounded-full flex-shrink-0" />
                    )}
                    {step.status === 'error' && (
                      <XCircle size={20} className="text-destructive flex-shrink-0" weight="fill" />
                    )}
                    <span className={`text-sm ${step.status === 'complete' ? 'text-foreground' : step.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {step.step}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : phase === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mb-4 shadow-2xl shadow-green-500/50"
              >
                <CheckCircle size={40} className="text-white" weight="fill" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-2 text-green-500">Registration Successful!</h3>
              {deployedAgent && (
                <div className="text-center space-y-2 mt-4">
                  <p className="text-sm text-muted-foreground">Agent registered and funded on Mantle Network</p>
                  <p className="text-xs font-mono bg-card px-3 py-2 rounded border border-border">
                    {deployedAgent.walletAddress}
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-8"
            >
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-destructive to-red-600 flex items-center justify-center mb-4 shadow-2xl shadow-destructive/50">
                  <XCircle size={40} className="text-white" weight="fill" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-destructive">Deployment Failed</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {errorMessage}
                </p>
              </div>

              {deploymentSteps.length > 0 && (
                <div className="space-y-2 mb-6">
                  {deploymentSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-lg bg-card/50 border border-border text-sm"
                    >
                      {step.status === 'error' ? (
                        <XCircle size={18} className="text-destructive flex-shrink-0" weight="fill" />
                      ) : step.status === 'complete' ? (
                        <CheckCircle size={18} className="text-green-500 flex-shrink-0" weight="fill" />
                      ) : (
                        <div className="w-[18px] h-[18px] border-2 border-muted rounded-full flex-shrink-0" />
                      )}
                      <span className="text-muted-foreground">{step.step}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1 bg-gradient-to-r from-secondary to-accent"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
