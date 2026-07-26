import { Warning } from '@phosphor-icons/react'
import { getChain } from '@/lib/blockchain/chains'
import { Button } from '@/components/ui/button'

interface NetworkMismatchAlertProps {
  walletChainId: number | undefined
  selectedChainId: number
  onSwitch: () => void
}

export function NetworkMismatchAlert({ walletChainId, selectedChainId, onSwitch }: NetworkMismatchAlertProps) {
  if (!walletChainId || walletChainId === selectedChainId) return null

  const target = getChain(selectedChainId)
  const wallet = getChain(walletChainId)
  if (!target) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/30 text-amber-400 text-xs font-mono">
      <Warning size={14} weight="fill" className="flex-shrink-0" />
      <span className="flex-1">
        Wallet is on <span className="font-bold">{wallet?.name || `chain ${walletChainId}`}</span> — switch to{' '}
        <span className="font-bold" style={{ color: target.color }}>{target.name}</span> to spawn agents on this network.
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={onSwitch}
        className="h-6 px-2 text-[10px] border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
      >
        Switch Network
      </Button>
    </div>
  )
}
