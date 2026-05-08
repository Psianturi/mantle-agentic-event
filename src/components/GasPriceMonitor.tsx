import { useState, useEffect } from 'react'
import { Fire } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { GasPriceInfo } from '@/lib/types'

export function GasPriceMonitor() {
  const [gasPrice, setGasPrice] = useState<GasPriceInfo>({
    current: 0.00095,
    status: 'low',
    timestamp: Date.now()
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const basePrice = 0.0009
      const variation = (Math.random() - 0.5) * 0.0004
      const newPrice = basePrice + variation
      
      let status: 'low' | 'medium' | 'high' = 'low'
      if (newPrice > 0.0011) status = 'high'
      else if (newPrice > 0.00095) status = 'medium'
      
      setGasPrice({
        current: newPrice,
        status,
        timestamp: Date.now()
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const statusColors = {
    low: {
      text: 'text-green-500',
      bg: 'bg-green-500/20',
      border: 'border-green-500/40',
      glow: 'shadow-green-500/50',
      fireColor: 'text-green-500'
    },
    medium: {
      text: 'text-yellow-500',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/40',
      glow: 'shadow-yellow-500/50',
      fireColor: 'text-yellow-500'
    },
    high: {
      text: 'text-red-500',
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      glow: 'shadow-red-500/50',
      fireColor: 'text-red-500'
    }
  }

  const colors = statusColors[gasPrice.status]

  const statusText = {
    low: 'Network is quiet - Great time to transact!',
    medium: 'Network is moderately busy',
    high: 'Network is congested - Consider waiting'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.bg} border ${colors.border} ${colors.glow} shadow-lg cursor-pointer hover:scale-105 transition-all duration-300`}
            whileHover={{ y: -2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={gasPrice.status}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <Fire size={18} weight="fill" className={colors.fireColor} />
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Gas Price</span>
              <motion.span
                key={gasPrice.current}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-sm font-bold font-mono ${colors.text}`}
              >
                ~{gasPrice.current.toFixed(5)} MNT
              </motion.span>
            </div>
            <motion.div
              className={`w-2 h-2 rounded-full ${colors.bg} ${colors.border} border-2`}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-card border-primary/30">
          <div className="space-y-2">
            <p className="font-semibold text-sm">{statusText[gasPrice.status]}</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">High</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              Last updated: {new Date(gasPrice.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
