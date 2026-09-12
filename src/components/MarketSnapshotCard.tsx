import { useEffect, useState } from 'react'
import { ChartLine, TrendUp, TrendDown, Newspaper, ShieldCheck, Database } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { cloudRunService, MarketSnapshot, DexPool } from '@/services/cloudRunService'

const COIN_LABELS: Record<string, string> = { bitcoin: 'BTC', ethereum: 'ETH', mantle: 'MNT' }
const REFRESH_MS = 5 * 60 * 1000 // matches backend cache TTL for prices

function formatPrice(usd: number): string {
  return usd >= 1 ? `$${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${usd.toFixed(4)}`
}

function getNewsTitle(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null
  const record = item as Record<string, unknown>
  const title = record.title ?? record.name
  return typeof title === 'string' && title.trim() ? title.trim() : null
}

function sentimentColor(value: number): string {
  if (value >= 60) return 'text-emerald-400'
  if (value <= 40) return 'text-rose-400'
  return 'text-amber-400'
}

interface MarketContextPanelProps {
  snapshot: MarketSnapshot
  pools?: DexPool[]
  compact?: boolean
}

export function MarketContextPanel({ snapshot, pools = [], compact = false }: MarketContextPanelProps) {
  const lastUpdated = new Date(snapshot.generated_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const sentimentValue = snapshot.fear_greed ? Number(snapshot.fear_greed.value) : null
  const news = (snapshot.news ?? []).map(getNewsTitle).filter((title): title is string => Boolean(title)).slice(0, compact ? 2 : 3)

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ChartLine size={17} className="text-cyan-300" weight="duotone" />
            <span className="text-sm font-bold">Market intelligence</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Context available to the agent before it forms a proposal.
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{lastUpdated}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-mono text-cyan-200">
          <Database size={10} /> CoinGecko
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-mono text-amber-200">
          <ShieldCheck size={10} /> CoinMarketCap
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Object.entries(snapshot.prices).map(([id, price]) => {
          const change = price.usd_24h_change ?? 0
          const up = change >= 0
          return (
            <div key={id} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-muted-foreground font-mono uppercase">{COIN_LABELS[id] ?? id}</span>
                {up ? <TrendUp size={11} className="text-emerald-400" weight="bold" /> : <TrendDown size={11} className="text-rose-400" weight="bold" />}
              </div>
              <p className="text-sm font-bold font-mono mt-1">{formatPrice(price.usd)}</p>
              <p className={`text-[10px] font-mono ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {up ? '+' : '-'}{Math.abs(change).toFixed(1)}% / 24h
              </p>
            </div>
          )
        })}
      </div>

      {sentimentValue !== null && snapshot.fear_greed && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-semibold">Market sentiment</span>
            <span className={`text-xs font-bold ${sentimentColor(sentimentValue)}`}>
              {snapshot.fear_greed.value_classification} · {sentimentValue}/100
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 opacity-80">
            <div className="h-3 w-3 -translate-y-[3px] rounded-full border-2 border-background bg-white shadow" style={{ marginLeft: `calc(${Math.max(0, Math.min(100, sentimentValue))}% - 6px)` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">CoinMarketCap Fear &amp; Greed index</p>
        </div>
      )}

      {!compact && pools.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Mantle liquidity watch</p>
            <span className="text-[9px] text-muted-foreground/60">CoinGecko on-chain data</span>
          </div>
          <div className="space-y-1.5">
            {pools.map((pool, index) => (
              <div key={`${pool.attributes.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.025] px-2.5 py-2 text-xs">
                <span className="font-medium truncate">{pool.attributes.name}</span>
                <span className="font-mono text-muted-foreground whitespace-nowrap">${parseFloat(pool.attributes.base_token_price_usd).toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {news.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Newspaper size={13} className="text-amber-300" weight="duotone" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">CMC news signal</p>
          </div>
          <div className="space-y-1.5">
            {news.map((title, index) => (
              <p key={`${title}-${index}`} className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{title}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MarketSnapshotCard() {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null)
  const [pools, setPools] = useState<DexPool[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [snap, dex] = await Promise.all([
          cloudRunService.getMarketSnapshot(),
          cloudRunService.getMantleDexPools(),
        ])
        if (cancelled) return
        setSnapshot(snap)
        setPools(dex.pools.slice(0, 3))
        setError(false)
      } catch (err) {
        console.error('Failed to load market snapshot:', err)
        if (!cancelled) setError(true)
      }
    }

    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (error || !snapshot) return null // supplementary context — fail silent, don't block the dashboard

  return (
    <Card className="glass-card-hover overflow-hidden border-cyan-400/20">
      <div className="h-1 bg-gradient-to-r from-cyan-400 via-amber-300 to-violet-400" />
      <div className="p-5">
        <MarketContextPanel snapshot={snapshot} pools={pools} />
        <p className="text-[10px] text-muted-foreground/60 mt-4 pt-3 border-t border-border/20">
          Research context only. The agent may use this evidence in a proposal; it does not execute a trade automatically.
        </p>
      </div>
    </Card>
  )
}
