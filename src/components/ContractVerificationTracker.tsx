import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowSquareOut, 
  SpinnerGap,
  FileCode,
  ShieldCheck
} from '@phosphor-icons/react'
import { ContractVerificationData, verificationService } from '@/lib/blockchain/verificationService'
import { motion, AnimatePresence } from 'framer-motion'

interface ContractVerificationTrackerProps {
  contractAddress: string
  agentId: string
  agentName: string
  deploymentTxHash: string
  onVerificationComplete?: (data: ContractVerificationData) => void
}

export function ContractVerificationTracker({
  contractAddress,
  agentId,
  agentName,
  deploymentTxHash,
  onVerificationComplete
}: ContractVerificationTrackerProps) {
  const [verificationData, setVerificationData] = useState<ContractVerificationData | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    const startTracking = async () => {
      await verificationService.trackContractVerification(
        contractAddress,
        agentId,
        agentName,
        deploymentTxHash,
        (data) => {
          setVerificationData(data)
          
          if (data.verificationStatus === 'verified' && onVerificationComplete) {
            onVerificationComplete(data)
          }
        }
      )
    }

    startTracking()

    return () => {
      verificationService.stopTracking(contractAddress)
    }
  }, [contractAddress, agentId, agentName, deploymentTxHash, onVerificationComplete])

  if (!verificationData) {
    return null
  }

  const getStatusIcon = () => {
    switch (verificationData.verificationStatus) {
      case 'verified':
        return <CheckCircle size={20} weight="fill" className="text-green-500" />
      case 'failed':
        return <XCircle size={20} weight="fill" className="text-destructive" />
      case 'verifying':
        return <SpinnerGap size={20} weight="bold" className="text-primary animate-spin" />
      case 'pending':
      default:
        return <Clock size={20} weight="bold" className="text-amber-500" />
    }
  }

  const getStatusBadge = () => {
    switch (verificationData.verificationStatus) {
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Verified</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'verifying':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Verifying...</Badge>
      case 'pending':
      default:
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Pending</Badge>
    }
  }

  const getProgressValue = () => {
    if (verificationData.verificationStatus === 'verified') return 100
    if (verificationData.verificationStatus === 'failed') return 0
    return Math.min((verificationData.verificationAttempts / 20) * 100, 95)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card-hover border-primary/30 overflow-hidden">
        <div className="p-5">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center">
                <ShieldCheck className="text-primary" weight="duotone" size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  Contract Verification Status
                  {getStatusIcon()}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(verificationData.explorerUrl, '_blank')
                }}
                className="text-primary hover:text-primary/80"
              >
                <ArrowSquareOut size={18} weight="bold" />
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Verification Progress</span>
                      <span className="text-xs font-mono text-primary">
                        {verificationData.verificationAttempts}/20 attempts
                      </span>
                    </div>
                    <Progress 
                      value={getProgressValue()} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-background/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Agent</p>
                      <p className="font-mono text-sm font-semibold">{verificationData.agentName}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="font-mono text-sm font-semibold capitalize">
                        {verificationData.verificationStatus}
                      </p>
                    </div>
                  </div>

                  {verificationData.verificationStatus === 'verifying' && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <SpinnerGap size={16} className="text-primary animate-spin" weight="bold" />
                        <p className="text-xs text-primary font-medium">
                          Checking verification status on Mantle Explorer...
                        </p>
                      </div>
                    </div>
                  )}

                  {verificationData.verificationStatus === 'verified' && verificationData.verificationTimestamp && (
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="text-green-500" weight="fill" />
                        <p className="text-xs text-green-500 font-semibold">
                          Contract Verified Successfully!
                        </p>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Verified at: {new Date(verificationData.verificationTimestamp).toLocaleString()}</p>
                        {verificationData.compilerVersion && (
                          <p className="font-mono">Compiler: {verificationData.compilerVersion}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {verificationData.verificationStatus === 'failed' && (
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle size={16} className="text-destructive" weight="fill" />
                        <p className="text-xs text-destructive font-semibold">
                          Verification Failed
                        </p>
                      </div>
                      {verificationData.errorMessage && (
                        <p className="text-xs text-muted-foreground">
                          {verificationData.errorMessage}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(verificationData.explorerUrl, '_blank')}
                      className="flex-1 border-primary/30 hover:border-primary/50"
                    >
                      <FileCode size={16} className="mr-2" weight="duotone" />
                      View Contract
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(
                        verificationService.getExplorerTxUrl(verificationData.deploymentTxHash),
                        '_blank'
                      )}
                      className="flex-1 border-primary/30 hover:border-primary/50"
                    >
                      <ArrowSquareOut size={16} className="mr-2" weight="duotone" />
                      View Deployment
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}
