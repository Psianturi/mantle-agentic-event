import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Lock } from '@phosphor-icons/react'
import { getSupportedChains, getChain } from '@/lib/blockchain/chains'

interface ChainSelectorProps {
  selectedChainId: number
  onChainChange: (chainId: number) => void
  disabled?: boolean
}

export function ChainSelector({ selectedChainId, onChainChange, disabled }: ChainSelectorProps) {
  const chains = getSupportedChains()
  const current = getChain(selectedChainId)

  const trigger = (
    <SelectTrigger
      className="h-8 w-[148px] text-xs font-mono border-primary/20 bg-background/50"
      style={disabled ? { opacity: 0.55, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
    >
      <span className="flex items-center gap-1.5 flex-1 min-w-0">
        {current && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: current.color }}
          />
        )}
        <SelectValue />
      </span>
      {disabled && <Lock size={11} className="text-muted-foreground flex-shrink-0 ml-1" />}
    </SelectTrigger>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Select
              value={String(selectedChainId)}
              onValueChange={(v) => onChainChange(Number(v))}
              disabled={disabled}
            >
              {trigger}
              <SelectContent>
                {chains.map((chain) => (
                  <SelectItem key={chain.chainId} value={String(chain.chainId)}>
                    <span className="flex items-center gap-2 text-xs font-mono">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: chain.color }}
                      />
                      {chain.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent side="bottom" className="bg-card border-primary/30">
            <p className="text-xs text-muted-foreground">Connect wallet to switch network</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
