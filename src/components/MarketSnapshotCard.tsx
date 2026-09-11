import { useEffect, useState } from 'react'
import { ChartLine, TrendUp, TrendDown } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { cloudRunService, MarketSnapshot, DexPool } from '@/services/cloudRunService'

const COIN_LABELS: Record<string, string> = { bitcoin: 'BTC', ethereum: 'ETH', mantle: 'MNT' }
const REFRESH_MS = 5 * 60 * 1000 // matches backend cache TTL for prices

function formatPrice(usd: number): string {
  return usd >= 1 ? `$${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${usd.toFixed(4)}`
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

  const lastUpdated = new Date(snapshot.generated_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <Card className="glass-card-hover p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChartLine size={16} className="text-primary" weight="duotone" />
          <span className="text-sm font-bold">Market Snapshot</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">Updated {lastUpdated}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {Object.entries(snapshot.prices).map(([id, p]) => {
          const change = p.usd_24h_change ?? 0
          const up = change >= 0
          return (
            <div key={id} className="rounded-lg bg-muted/20 border border-border/30 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground font-mono uppercase mb-0.5">{COIN_LABELS[id] ?? id}</p>
              <p className="text-sm font-bold font-mono">{formatPrice(p.usd)}</p>
              <p className={`text-[10px] font-mono flex items-center justify-center gap-0.5 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                {up ? <TrendUp size={10} weight="bold" /> : <TrendDown size={10} weight="bold" />}
                {Math.abs(change).toFixed(1)}%
              </p>
            </div>
          )
        })}
      </div>

      {snapshot.fear_greed && (
        <div className="flex items-center justify-between text-xs mb-3 px-2.5 py-2 rounded-lg bg-muted/10 border border-border/20">
          <span className="text-muted-foreground">Fear &amp; Greed</span>
          <span className="font-semibold">{snapshot.fear_greed.value} · {snapshot.fear_greed.value_classification}</span>
        </div>
      )}

      {pools.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-mono mb-1">Top Mantle DEX pools</p>
          {pools.map((pool, i) => (
            <div key={i} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-muted/10">
              <span className="font-medium truncate">{pool.attributes.name}</span>
              <span className="font-mono text-muted-foreground">${parseFloat(pool.attributes.base_token_price_usd).toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/50 mt-3 pt-2 border-t border-border/20">
        Market context for research only — not financial advice. Sources: CoinGecko, CoinMarketCap.
      </p>
    </Card>
  )
}
