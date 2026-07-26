import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Warning, CheckCircle, XCircle } from '@phosphor-icons/react'
import { monitoringService, GasStatusResponse } from '@/services/monitoringService'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface GasStatusBadgeProps {
  agentWallet: string
  className?: string
  showLabel?: boolean
}

export function GasStatusBadge({ agentWallet, className, showLabel = true }: GasStatusBadgeProps) {
  const [gasStatus, setGasStatus] = useState<GasStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchGasStatus = async () => {
      try {
        setLoading(true)
        setError(false)
        const status = await monitoringService.getAgentGasStatus(agentWallet)
        setGasStatus(status)
      } catch (err) {
        console.error('Failed to fetch gas status:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchGasStatus()
    
    // Poll every 30 seconds
    const interval = setInterval(fetchGasStatus, 30000)
    
    return () => clearInterval(interval)
  }, [agentWallet])

  if (loading) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 bg-muted-foreground/50 rounded-full"
        />
        {showLabel && <span className="text-xs text-muted-foreground">Loading...</span>}
      </div>
    )
  }

  if (error || !gasStatus) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1.5 cursor-help', className)}>
              <XCircle size={14} className="text-muted-foreground" weight="fill" />
              {showLabel && <span className="text-xs text-muted-foreground">Unavailable</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-card border-border">
            <p className="text-xs text-muted-foreground">Unable to fetch gas status</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const getStatusIcon = () => {
    switch (gasStatus.status) {
      case 'healthy':
        return <CheckCircle size={14} className="text-green-500" weight="fill" />
      case 'warning':
        return <Warning size={14} className="text-yellow-500" weight="fill" />
      case 'critical':
        return <Warning size={14} className="text-orange-500" weight="fill" />
      case 'depleted':
        return <XCircle size={14} className="text-red-500" weight="fill" />
      default:
        return <div className="w-2 h-2 bg-muted-foreground/50 rounded-full" />
    }
  }

  const getStatusColor = () => {
    switch (gasStatus.status) {
      case 'healthy':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'critical':
        return 'text-orange-500'
      case 'depleted':
        return 'text-red-500'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn('flex items-center gap-1.5 cursor-help', className)}
          >
            {monitoringService.isGasLow(gasStatus.status) && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {getStatusIcon()}
              </motion.div>
            )}
            {!monitoringService.isGasLow(gasStatus.status) && getStatusIcon()}
            
            {showLabel && (
              <span className={cn('text-xs font-semibold', getStatusColor())}>
                {monitoringService.getStatusLabel(gasStatus.status)}
              </span>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-card border-primary/30">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Gas Balance:</span>
              <span className="text-xs font-bold font-mono text-foreground">
                {parseFloat(gasStatus.gas_balance_mnt).toFixed(4)} MNT
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Status:</span>
              <span className={cn('text-xs font-bold uppercase', getStatusColor())}>
                {gasStatus.status}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Can Mint:</span>
              <span className={cn(
                'text-xs font-bold',
                gasStatus.can_mint ? 'text-green-500' : 'text-red-500'
              )}>
                {gasStatus.can_mint ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Est. Mints Left:</span>
              <span className="text-xs font-bold font-mono text-foreground">
                ~{gasStatus.estimated_mints_remaining}
              </span>
            </div>
            <div className="pt-1.5 mt-1.5 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground/70">
                Auto-updates every 30 seconds
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
