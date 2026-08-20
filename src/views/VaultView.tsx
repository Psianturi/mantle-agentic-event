import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet as WalletIcon, Binoculars, Globe, CloudArrowUp, ShieldCheck } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NFTCard } from '@/components/NFTCard'
import { ScoutingBriefCard } from '@/components/ScoutingBriefCard'
import { VerificationDashboard } from '@/components/VerificationDashboard'
import { Agent, Event, NFT } from '@/lib/types'
import { cn } from '@/lib/utils'
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/blockchain/chains'
import type { ContractVerificationData } from '@/lib/blockchain/verificationService'

interface VaultViewProps {
  displayedAgents: Agent[]
  displayedEvents: Event[]
  displayedNFTs: NFT[]
  selectedChainId: number
  verificationData: ContractVerificationData[] | null
  setMainView: (view: 'dashboard' | 'analytics' | 'vault' | 'marketplace') => void
  isViewOnly: boolean
  onOpenMetadata: (nft: NFT) => void
  onOpenBatchIPFS: () => void
  startTransition: React.TransitionStartFunction
}

export function VaultView({
  displayedAgents,
  displayedEvents,
  displayedNFTs,
  selectedChainId,
  verificationData,
  setMainView,
  isViewOnly,
  onOpenMetadata,
  onOpenBatchIPFS,
  startTransition,
}: VaultViewProps) {
  const [nftVaultTab, setNftVaultTab] = useState<'nfts' | 'scouts'>('nfts')
  const [nftPage, setNftPage] = useState(0)

  const scoutingEvents = displayedEvents.filter(e => e.status === 'scheduled')
  const scoutingEventIds = new Set(scoutingEvents.map(e => e.id))
  const wisdomNFTs = displayedNFTs.filter(n => !scoutingEventIds.has(n.eventId))
  const agentMap: Record<string, string> = Object.fromEntries(
    (displayedAgents ?? []).map(a => [a.id, a.name])
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <WalletIcon className="text-primary" weight="duotone" size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              NFT Vault
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-xs text-muted-foreground font-mono">
                {getChain(selectedChainId)?.name ?? `Chain ${selectedChainId}`}
              </p>
            </div>
          </div>
        </div>
        {displayedEvents.filter(e => e.status === 'completed').length > 0 && (
          <Button
            onClick={onOpenBatchIPFS}
            disabled={isViewOnly}
            size="sm"
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 font-semibold shadow-lg shadow-primary/30"
          >
            <CloudArrowUp className="mr-2" weight="duotone" size={16} />
            Batch Upload to IPFS
          </Button>
        )}
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/40 w-fit">
        <button
          onClick={() => setNftVaultTab('nfts')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            nftVaultTab === 'nfts'
              ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <WalletIcon size={15} weight="duotone" />
          My NFTs
          <span className={cn(
            'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
            nftVaultTab === 'nfts' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          )}>{wisdomNFTs.length}</span>
        </button>
        <button
          onClick={() => setNftVaultTab('scouts')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            nftVaultTab === 'scouts'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <Binoculars size={15} weight="duotone" />
          Upcoming Scouts
          {scoutingEvents.length > 0 && (
            <span className={cn(
              'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
              nftVaultTab === 'scouts' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/10 text-amber-500'
            )}>{scoutingEvents.length}</span>
          )}
        </button>
      </div>

      {/* ── Tab: My NFTs ──────────────────────────── */}
      {nftVaultTab === 'nfts' && (
        wisdomNFTs.length === 0 ? (
          <Card className="glass-card-hover p-12 text-center border-2 border-dashed border-primary/30">
            <WalletIcon size={56} className="mx-auto mb-4 text-muted-foreground opacity-50 animate-float" weight="duotone" />
            <h3 className="text-base font-bold mb-2">No NFTs Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Attend events with your agents to mint Proof-of-Attendance NFTs on Mantle Sepolia
            </p>
            <Button
              onClick={() => startTransition(() => setMainView('dashboard'))}
              className="bg-gradient-to-r from-secondary to-accent font-semibold shadow-lg shadow-secondary/30"
            >
              <Globe className="mr-2" weight="duotone" />
              Go to Dashboard
            </Button>
          </Card>
        ) : (() => {
          const NFT_PAGE_SIZE = 12
          const totalPages = Math.ceil(wisdomNFTs.length / NFT_PAGE_SIZE)
          const effectivePage = Math.min(nftPage, Math.max(0, totalPages - 1))
          const pagedNFTs = wisdomNFTs.slice(effectivePage * NFT_PAGE_SIZE, (effectivePage + 1) * NFT_PAGE_SIZE)
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {pagedNFTs.map((nft, idx) => (
                  <motion.div
                    key={nft.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <NFTCard
                      nft={nft}
                      onClick={() => onOpenMetadata(nft)}
                    />
                  </motion.div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNftPage(p => Math.max(0, p - 1))}
                    disabled={effectivePage === 0}
                    className="border-primary/30 hover:border-primary/60 px-3"
                  >
                    ← Prev
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono">
                    Page {effectivePage + 1} / {totalPages} &nbsp;·&nbsp; {wisdomNFTs.length} NFTs
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNftPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={effectivePage >= totalPages - 1}
                    className="border-primary/30 hover:border-primary/60 px-3"
                  >
                    Next →
                  </Button>
                </div>
              )}
            </div>
          )
        })()
      )}

      {/* ── Tab: Upcoming Scouts ──────────────────── */}
      {nftVaultTab === 'scouts' && (
        scoutingEvents.length === 0 ? (
          <Card className="glass-card-hover p-12 text-center border-2 border-dashed border-amber-500/20">
            <Binoculars size={48} className="mx-auto mb-4 text-amber-500/40 animate-float" weight="duotone" />
            <h3 className="text-base font-bold mb-2">No Upcoming Scouts</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Attend a future Luma event to generate a predictive Scouting Brief. Your agent will prepare intelligence before the event begins.
            </p>
            <Button
              onClick={() => startTransition(() => setMainView('dashboard'))}
              variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              <Binoculars className="mr-2" weight="duotone" />
              Go Scout an Event
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {scoutingEvents.length} upcoming event{scoutingEvents.length !== 1 ? 's' : ''} scouted — agent will auto-upgrade to full wisdom NFT after the event completes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scoutingEvents.map(event => (
                <ScoutingBriefCard
                  key={event.id}
                  event={event}
                  agentName={agentMap[event.agentId]}
                />
              ))}
            </div>
          </div>
        )
      )}

      {/* ── Contract Verification History ─────── */}
      {nftVaultTab === 'nfts' && verificationData && verificationData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <ShieldCheck className="text-emerald-500" weight="duotone" size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold">Contract Verification</h3>
              <p className="text-xs text-muted-foreground">On-chain smart contract verification status per agent</p>
            </div>
          </div>
          <VerificationDashboard verifications={verificationData} />
        </div>
      )}
    </motion.div>
  )
}