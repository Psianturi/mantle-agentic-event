import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupportedChains, getChain } from '@/lib/blockchain/chains'

interface ChainSelectorProps {
  selectedChainId: number
  onChainChange: (chainId: number) => void
}

export function ChainSelector({ selectedChainId, onChainChange }: ChainSelectorProps) {
  const chains = getSupportedChains()
  const current = getChain(selectedChainId)

  return (
    <Select
      value={String(selectedChainId)}
      onValueChange={(v) => onChainChange(Number(v))}
    >
      <SelectTrigger className="h-8 w-[148px] text-xs font-mono border-primary/20 bg-background/50">
        <span className="flex items-center gap-1.5 flex-1 min-w-0">
          {current && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: current.color }}
            />
          )}
          <SelectValue />
        </span>
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
