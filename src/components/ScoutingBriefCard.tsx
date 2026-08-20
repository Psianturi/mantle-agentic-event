import { Event } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Binoculars, CalendarBlank, Globe, Clock, ArrowSquareOut, CalendarPlus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { generateIcs, downloadIcs } from '@/lib/icsUtils'

interface ScoutingBriefCardProps {
  event: Event
  agentName?: string
}

function formatEventDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  } catch {
    return isoString
  }
}

function getCountdown(isoString: string): string | null {
  try {
    const eventMs = new Date(isoString).getTime()
    const nowMs = Date.now()
    const diffMs = eventMs - nowMs
    if (diffMs <= 0) return null
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h`
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${mins}m`
  } catch {
    return null
  }
}

export function ScoutingBriefCard({ event, agentName }: ScoutingBriefCardProps) {
  const countdown = event.lumaStartAt ? getCountdown(event.lumaStartAt) : null
  const eventDate = event.lumaStartAt ? formatEventDate(event.lumaStartAt) : null
  const scoutedDate = new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'relative overflow-hidden p-4 border transition-all duration-300',
        'bg-gradient-to-br from-amber-950/30 via-background to-orange-950/20',
        'border-amber-500/30 hover:border-amber-500/60',
        'shadow-amber-900/20 hover:shadow-amber-500/10 hover:shadow-lg'
      )}>
        {/* Glow top-right */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl -mr-14 -mt-14 pointer-events-none" />

        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Binoculars size={16} className="text-amber-400" weight="duotone" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-foreground leading-tight truncate pr-1">
                {event.title}
              </h4>
              {agentName && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  Scouted by {agentName}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[9px] font-bold px-1.5 py-0 uppercase tracking-wider">
              Upcoming
            </Badge>
            <Badge className="bg-muted/40 text-muted-foreground border-border/40 text-[9px] px-1.5 py-0">
              0 XP
            </Badge>
          </div>
        </div>

        {/* Date + Countdown row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe size={12} className="text-amber-400/70" weight="duotone" />
            <span>Luma</span>
          </div>
          {eventDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarBlank size={12} className="text-amber-400/70" weight="duotone" />
              <span>{eventDate}</span>
            </div>
          )}
          {countdown && (
            <div className="flex items-center gap-1 text-xs font-mono font-semibold text-amber-400">
              <Clock size={12} weight="duotone" />
              <span>{countdown} away</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 ml-auto">
            <span>Scouted {scoutedDate}</span>
          </div>
        </div>

        {/* Scouting brief text */}
        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 mb-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
            {event.summary}
          </p>
        </div>

        {/* Footer: event link + calendar export */}
        <div className="flex items-center justify-between gap-2">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors font-mono"
          >
            <ArrowSquareOut size={11} weight="duotone" />
            View on Luma
          </a>
          {event.lumaStartAt && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const ics = generateIcs({
                  title: event.title,
                  description: event.summary,
                  url: event.url,
                  startAt: event.lumaStartAt!,
                  uid: `${event.id}@asaju.ai`,
                })
                downloadIcs(`asaju-scout-${event.id}.ics`, ics)
              }}
              className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <CalendarPlus size={12} weight="duotone" />
              Add to Calendar
            </button>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
