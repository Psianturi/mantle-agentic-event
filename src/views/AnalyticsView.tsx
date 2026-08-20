import { motion } from 'framer-motion'
import { ChartLine } from '@phosphor-icons/react'
import { AnalyticsCharts } from '@/components/AnalyticsCharts'
import { Agent, Event, NFT } from '@/lib/types'

interface AnalyticsViewProps {
  agents: Agent[]
  events: Event[]
  nfts: NFT[]
}

export function AnalyticsView({ agents, events, nfts }: AnalyticsViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
          <ChartLine className="text-primary" weight="duotone" size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold">Event Analytics</h2>
          <p className="text-sm text-muted-foreground">Agent performance, event trends, platform insights</p>
        </div>
      </div>
      <AnalyticsCharts agents={agents} events={events} nfts={nfts} />
    </motion.div>
  )
}
