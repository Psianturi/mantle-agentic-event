import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupportedChains } from '@/lib/blockchain/chains'

interface ChainSelectorProps {
  selectedChainId: number
  onChainChange: (chainId: number) => void
  disabled?: boolean
}

export function ChainSelector({ selectedChainId, onChainChange, disabled }: ChainSelectorProps) {
  const chains = getSupportedChains()

  return (
    <Select
      value={String(selectedChainId)}
      onValueChange={(v) => onChainChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 w-[140px] text-xs font-mono border-primary/20 bg-background/50">
        <SelectValue />
      </SelectTrigger>
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
  )
}
