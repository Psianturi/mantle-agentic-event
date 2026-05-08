import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, ArrowRight, Clock, Cube, Lightning } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Agent } from '@/lib/types'

interface DeploymentStep {
  id: string
  label: string
  status: 'pending' | 'in-progress' | 'complete' | 'error'
  timestamp?: number
  transactionHash?: string
  gasUsed?: string
  details?: string
}

interface ContractDeploymentProgressProps {
  agent: Agent
  isDeploying: boolean
  onComplete?: () => void
}

export function ContractDeploymentProgress({ agent, isDeploying, onComplete }: ContractDeploymentProgressProps) {
  const [steps, setSteps] = useState<DeploymentStep[]>([
    { id: 'wallet', label: 'Generating Mantle wallet', status: 'pending' },
    { id: 'contract', label: 'Compiling smart contract', status: 'pending' },
    { id: 'deploy', label: 'Deploying to Mantle Network', status: 'pending' },
    { id: 'verify', label: 'Verifying contract on Explorer', status: 'pending' },
    { id: 'init', label: 'Initializing agent parameters', status: 'pending' },
    { id: 'fund', label: 'Funding wallet with MNT', status: 'pending' },
  ])

  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [overallProgress, setOverallProgress] = useState(0)

  useEffect(() => {
    if (!isDeploying) {
      setCurrentStepIndex(-1)
      setOverallProgress(0)
      setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })))
      return
    }

    let stepIndex = 0
    const totalSteps = steps.length

    const processNextStep = () => {
      if (stepIndex >= totalSteps) {
        setOverallProgress(100)
        setTimeout(() => {
          onComplete?.()
        }, 1000)
        return
      }

      setSteps(prev => prev.map((s, idx) => 
        idx === stepIndex 
          ? { ...s, status: 'in-progress' as const, timestamp: Date.now() }
          : s
      ))
      setCurrentStepIndex(stepIndex)

      const stepDuration = Math.random() * 1500 + 1000

      setTimeout(() => {
        const mockGas = (Math.random() * 0.002 + 0.001).toFixed(6)
        const mockTxHash = `0x${Math.random().toString(16).slice(2, 18)}...`

        setSteps(prev => prev.map((s, idx) => 
          idx === stepIndex 
            ? { 
                ...s, 
                status: 'complete' as const,
                gasUsed: stepIndex === 2 || stepIndex === 5 ? mockGas : undefined,
                transactionHash: stepIndex === 2 ? mockTxHash : undefined,
              }
            : s
        ))

        const progress = ((stepIndex + 1) / totalSteps) * 100
        setOverallProgress(progress)

        stepIndex++
        setTimeout(processNextStep, 500)
      }, stepDuration)
    }

    processNextStep()
  }, [isDeploying, onComplete])

  const completedSteps = steps.filter(s => s.status === 'complete').length
  const hasErrors = steps.some(s => s.status === 'error')

  return (
    <Card className="glass-card-hover p-6 border-2 border-primary/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
      
      <div className="relative space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center">
                <Cube className="text-primary" weight="duotone" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Contract Deployment</h3>
                <p className="text-xs text-muted-foreground">Agent: {agent.name}</p>
              </div>
            </div>
          </div>
          
          <Badge 
            variant={hasErrors ? 'destructive' : isDeploying ? 'default' : 'secondary'}
            className="font-semibold"
          >
            {hasErrors ? 'Failed' : isDeploying ? 'Deploying' : completedSteps === steps.length ? 'Complete' : 'Pending'}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-mono font-semibold">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedSteps} of {steps.length} steps complete</span>
            {isDeploying && (
              <span className="flex items-center gap-1">
                <Clock size={12} weight="fill" />
                ~{(steps.length - completedSteps) * 2}s remaining
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {steps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border transition-all duration-300
                  ${step.status === 'complete' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : step.status === 'in-progress'
                    ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/20'
                    : step.status === 'error'
                    ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-card/30 border-border/50'
                  }
                `}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === 'complete' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <CheckCircle size={20} className="text-green-500" weight="fill" />
                    </motion.div>
                  )}
                  {step.status === 'in-progress' && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                    />
                  )}
                  {step.status === 'pending' && (
                    <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded-full" />
                  )}
                  {step.status === 'error' && (
                    <XCircle size={20} className="text-destructive" weight="fill" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${
                      step.status === 'complete' ? 'text-green-500' :
                      step.status === 'in-progress' ? 'text-primary' :
                      step.status === 'error' ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>
                      {step.label}
                    </p>
                    {step.status === 'in-progress' && (
                      <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                        Processing
                      </Badge>
                    )}
                  </div>

                  {step.details && (
                    <p className="text-xs text-muted-foreground mt-1">{step.details}</p>
                  )}

                  {step.transactionHash && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs font-mono hover:bg-primary/10"
                        onClick={() => window.open(`https://explorer.mantle.xyz/tx/${step.transactionHash}`, '_blank')}
                      >
                        <span className="truncate max-w-[200px]">{step.transactionHash}</span>
                        <ArrowRight size={12} className="ml-1 flex-shrink-0" />
                      </Button>
                    </div>
                  )}

                  {step.gasUsed && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Lightning size={12} weight="fill" className="text-amber-500" />
                      <span>Gas: {step.gasUsed} MNT</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {completedSteps === steps.length && !isDeploying && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 border-t border-border"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-500" weight="fill" />
                <span className="text-sm font-semibold text-green-500">Deployment Complete</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => window.open(`https://explorer.mantle.xyz/address/${agent.walletAddress}`, '_blank')}
              >
                View on Explorer
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  )
}
