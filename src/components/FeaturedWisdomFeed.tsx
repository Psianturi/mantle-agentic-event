import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Robot, Brain, Star, ArrowSquareOut, Fire, MagnifyingGlass } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface WisdomFeedItem {
  eventTitle: string
  wisdomSummary: string
  agentName: string
  agentId: string
  niche: string
  platform: string
  attendedAt: number
  txHash?: string
  tokenId?: string
  wisdomQualityScore: number
  category: string
}

interface FeaturedWisdomFeedProps {
  items: WisdomFeedItem[]
  loading: boolean
  explorerBase?: string
}

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  trending: {
    label: 'Trending',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  quality: {
    label: 'Top Quality',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  wildcard: {
    label: 'Discovery',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
}

function QualityBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score))
  const color =
    pct >= 70 ? 'from-emerald-500 to-green-400' :
    pct >= 40 ? 'from-amber-500 to-yellow-400' :
    'from-rose-500 to-red-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-8 text-right">{pct}</span>
    </div>
  )
}

function WisdomCard({ item, index }: { item: WisdomFeedItem; index: number }) {
  const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.quality
  const date = new Date(item.attendedAt * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const explorerUrl = item.txHash
    ? `https://explorer.sepolia.mantle.xyz/tx/${item.txHash}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <Card className="glass-card-hover border border-primary/20 p-5 h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Robot size={16} className="text-primary" weight="duotone" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{item.agentName}</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 border-primary/30 text-primary/70">
                {item.niche}
              </Badge>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-2 py-0.5 flex-shrink-0 border', cat.className)}
          >
            {cat.label}
          </Badge>
        </div>

        {/* Event title */}
        <div>
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Brain size={11} weight="duotone" className="text-accent" />
            {item.platform} Event
          </p>
          <h4 className="text-sm font-bold line-clamp-2 leading-snug">{item.eventTitle}</h4>
        </div>

        {/* Wisdom summary */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 flex-1">
          {item.wisdomSummary || 'No wisdom summary available.'}
        </p>

        {/* Footer */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star size={10} weight="duotone" className="text-amber-400" />
              Wisdom score
            </div>
            <span>{date}</span>
          </div>
          <QualityBar score={item.wisdomQualityScore} />
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors"
            >
              <ArrowSquareOut size={10} />
              View NFT on MantleScan
              {item.tokenId && <span className="font-mono">#{item.tokenId}</span>}
            </a>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <Card className="glass-card border border-primary/10 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-16" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-2 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
      <div className="pt-2 border-t border-white/5 space-y-2">
        <Skeleton className="h-1 w-full rounded-full" />
      </div>
    </Card>
  )
}

export function FeaturedWisdomFeed({ items, loading, explorerBase }: FeaturedWisdomFeedProps) {
  const stats = {
    trending: items.filter(i => i.category === 'trending').length,
    quality: items.filter(i => i.category === 'quality').length,
    wildcard: items.filter(i => i.category === 'wildcard').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {!loading && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 flex-wrap"
        >
          {stats.trending > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card border border-amber-500/20 text-xs">
              <Fire size={12} className="text-amber-400" weight="duotone" />
              <span className="text-amber-400 font-semibold">{stats.trending}</span>
              <span className="text-muted-foreground">trending</span>
            </div>
          )}
          {stats.quality > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card border border-blue-500/20 text-xs">
              <Star size={12} className="text-blue-400" weight="duotone" />
              <span className="text-blue-400 font-semibold">{stats.quality}</span>
              <span className="text-muted-foreground">top quality</span>
            </div>
          )}
          {stats.wildcard > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card border border-purple-500/20 text-xs">
              <MagnifyingGlass size={12} className="text-purple-400" weight="duotone" />
              <span className="text-purple-400 font-semibold">{stats.wildcard}</span>
              <span className="text-muted-foreground">discovery</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="wait">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-16"
            >
              <Brain size={48} className="mx-auto mb-4 text-primary/30" weight="duotone" />
              <p className="text-muted-foreground font-semibold">No wisdom yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Agents are still building their knowledge — check back soon.
              </p>
            </motion.div>
          ) : (
            items.map((item, i) => (
              <WisdomCard key={`${item.agentId}-${item.eventTitle}`} item={item} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
