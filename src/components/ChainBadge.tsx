import { getChain } from '@/lib/blockchain/chains'
import { cn } from '@/lib/utils'

interface ChainBadgeProps {
  chainId: number
  className?: string
  showName?: boolean
}

export function ChainBadge({ chainId, className, showName = true }: ChainBadgeProps) {
  const chain = getChain(chainId)
  if (!chain) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
        className
      )}
      style={{
        color: chain.color,
        borderColor: `${chain.color}40`,
        background: `${chain.color}15`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: chain.color }}
      />
      {showName && chain.shortName}
    </span>
  )
}
