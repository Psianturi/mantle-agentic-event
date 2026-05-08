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
      <Card className="glass-card-hover p-12 text-center border-2 border-dashed border-primary/30">
        <ShieldCheck size={64} className="mx-auto mb-4 text-muted-foreground animate-float" weight="duotone" />
        <h3 className="text-lg font-semibold mb-2">No Verifications Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Contract verifications will appear here once agents deploy their smart contracts
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card-hover p-6 border-2 border-primary/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center">
              <ShieldCheck className="text-primary" weight="duotone" size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Contract Verification Dashboard</h2>
              <p className="text-sm text-muted-foreground">Track all agent contract verifications</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {(['all', 'verified', 'verifying', 'pending', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`p-3 rounded-lg border transition-all ${
                filterStatus === status
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                  {status}
                </span>
                {status !== 'all' && getStatusIcon(status as VerificationStatus)}
              </div>
              <p className="text-2xl font-bold">{statusCounts[status]}</p>
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <MagnifyingGlass 
            size={18} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
            weight="bold"
          />
          <Input
            placeholder="Search by agent name or contract address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-primary/30"
          />
        </div>
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {filteredVerifications.length === 0 ? (
            <Card className="glass-card-hover p-8 text-center">
              <FunnelSimple size={48} className="mx-auto mb-3 text-muted-foreground" weight="duotone" />
              <p className="text-sm text-muted-foreground">No verifications match your filters</p>
            </Card>
          ) : (
            filteredVerifications.map((verification, idx) => (
              <motion.div
                key={verification.contractAddress}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="glass-card-hover p-5 border border-primary/20 hover:border-primary/40 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        {getStatusIcon(verification.verificationStatus)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">{verification.agentName}</h3>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {verification.contractAddress}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(verification.verificationStatus)}>
                      {verification.verificationStatus}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-2 rounded bg-background/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Attempts</p>
                      <p className="text-sm font-mono font-semibold">
                        {verification.verificationAttempts}/20
                      </p>
                    </div>
                    <div className="p-2 rounded bg-background/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Last Check</p>
                      <p className="text-sm font-mono font-semibold">
                        {verification.lastAttemptTimestamp 
                          ? new Date(verification.lastAttemptTimestamp).toLocaleTimeString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  {verification.verificationStatus === 'verified' && verification.verificationTimestamp && (
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 mb-3">
                      <p className="text-xs text-green-500 font-semibold flex items-center gap-2">
                        <CheckCircle size={14} weight="fill" />
                        Verified at {new Date(verification.verificationTimestamp).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {verification.verificationStatus === 'failed' && verification.errorMessage && (
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 mb-3">
                      <p className="text-xs text-destructive font-semibold flex items-center gap-2 mb-1">
                        <XCircle size={14} weight="fill" />
                        Verification Failed
                      </p>
                      <p className="text-xs text-muted-foreground">{verification.errorMessage}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(verification.explorerUrl, '_blank')}
                      className="flex-1 border-primary/30 hover:border-primary/50"
                    >
                      <ArrowSquareOut size={16} className="mr-2" weight="duotone" />
                      View Contract
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(
                        verificationService.getExplorerTxUrl(verification.deploymentTxHash),
                        '_blank'
                      )}
                      className="flex-1 border-primary/30 hover:border-primary/50"
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
