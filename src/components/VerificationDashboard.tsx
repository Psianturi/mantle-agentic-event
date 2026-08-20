import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  SpinnerGap,
  ArrowSquareOut,
  FunnelSimple,
  MagnifyingGlass
} from '@phosphor-icons/react'
import { ContractVerificationData, VerificationStatus, verificationService } from '@/lib/blockchain/verificationService'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'

interface VerificationDashboardProps {
  verifications: ContractVerificationData[]
}

export function VerificationDashboard({ verifications }: VerificationDashboardProps) {
  const [filterStatus, setFilterStatus] = useState<VerificationStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredVerifications = verifications.filter(verification => {
    const matchesStatus = filterStatus === 'all' || verification.verificationStatus === filterStatus
    const matchesSearch = 
      verification.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      verification.contractAddress.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  const statusCounts = {
    all: verifications.length,
    verified: verifications.filter(v => v.verificationStatus === 'verified').length,
    verifying: verifications.filter(v => v.verificationStatus === 'verifying').length,
    pending: verifications.filter(v => v.verificationStatus === 'pending').length,
    failed: verifications.filter(v => v.verificationStatus === 'failed').length
  }

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return <CheckCircle size={16} weight="fill" className="text-green-500" />
      case 'failed':
        return <XCircle size={16} weight="fill" className="text-destructive" />
      case 'verifying':
        return <SpinnerGap size={16} weight="bold" className="text-primary animate-spin" />
      case 'pending':
      default:
        return <Clock size={16} weight="bold" className="text-amber-500" />
    }
  }

  const getStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return 'bg-green-500/20 text-green-500 border-green-500/30'
      case 'failed':
        return 'bg-destructive/20 text-destructive border-destructive/30'
      case 'verifying':
        return 'bg-primary/20 text-primary border-primary/30'
      case 'pending':
      default:
        return 'bg-amber-500/20 text-amber-500 border-amber-500/30'
    }
  }

  if (verifications.length === 0) {
    return (
      <Card className="glass-card-hover p-6 text-center border-2 border-dashed border-primary/30">
        <ShieldCheck size={40} className="mx-auto mb-3 text-muted-foreground animate-float" weight="duotone" />
        <h3 className="text-sm font-semibold mb-1">No Verifications Yet</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Contract verifications will appear here once agents deploy their smart contracts
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card className="glass-card-hover p-4 border-2 border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center">
              <ShieldCheck className="text-primary" weight="duotone" size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold">Contract Verification Dashboard</h2>
              <p className="text-xs text-muted-foreground">Track all agent contract verifications</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-3">
          {(['all', 'verified', 'verifying', 'pending', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`p-2 rounded-lg border transition-all ${
                filterStatus === status
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-wide font-semibold text-muted-foreground">
                  {status}
                </span>
                {status !== 'all' && getStatusIcon(status as VerificationStatus)}
              </div>
              <p className="text-base font-bold">{statusCounts[status]}</p>
            </button>
          ))}
        </div>

        <div className="relative">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            weight="bold"
          />
          <Input
            placeholder="Search by agent name or contract address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs border-primary/30"
          />
        </div>
      </Card>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {filteredVerifications.length === 0 ? (
            <Card className="glass-card-hover p-4 text-center">
              <FunnelSimple size={32} className="mx-auto mb-2 text-muted-foreground" weight="duotone" />
              <p className="text-xs text-muted-foreground">No verifications match your filters</p>
            </Card>
          ) : (
            filteredVerifications.map((verification, idx) => (
              <motion.div
                key={`${verification.agentId}-${verification.contractAddress}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="glass-card-hover p-3 border border-primary/20 hover:border-primary/40 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        {getStatusIcon(verification.verificationStatus)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs mb-0.5">{verification.agentName}</h3>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {verification.contractAddress}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(verification.verificationStatus)}>
                      {verification.verificationStatus}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="p-1.5 rounded bg-background/50 border border-border">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Attempts</p>
                      <p className="text-xs font-mono font-semibold">
                        {verification.verificationAttempts}/20
                      </p>
                    </div>
                    <div className="p-1.5 rounded bg-background/50 border border-border">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Last Check</p>
                      <p className="text-xs font-mono font-semibold">
                        {verification.lastAttemptTimestamp
                          ? new Date(verification.lastAttemptTimestamp).toLocaleTimeString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  {verification.verificationStatus === 'verified' && verification.verificationTimestamp && (
                    <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/20 mb-2">
                      <p className="text-[10px] text-green-500 font-semibold flex items-center gap-1.5">
                        <CheckCircle size={12} weight="fill" />
                        Verified at {new Date(verification.verificationTimestamp).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {verification.verificationStatus === 'failed' && verification.errorMessage && (
                    <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20 mb-2">
                      <p className="text-[10px] text-destructive font-semibold flex items-center gap-1.5 mb-0.5">
                        <XCircle size={12} weight="fill" />
                        Verification Failed
                      </p>
                      <p className="text-[10px] text-muted-foreground">{verification.errorMessage}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(verification.explorerUrl, '_blank')}
                      className="flex-1 h-7 text-xs border-primary/30 hover:border-primary/50"
                    >
                      <ArrowSquareOut size={12} className="mr-1" weight="duotone" />
                      View Contract
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(
                        verificationService.getExplorerTxUrl(verification.deploymentTxHash, verification.chainId),
                        '_blank'
                      )}
                      className="flex-1 h-7 text-xs border-primary/30 hover:border-primary/50"
                    >
                      View Deployment
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
