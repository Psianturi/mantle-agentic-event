import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Globe } from '@phosphor-icons/react'
import { Agent } from '@/lib/types'

interface AttendEventCardProps {
  selectedAgent: Agent | undefined
  displayedAgents: Agent[]
  onSelectAgent: (id: string) => void
  walletConnected: boolean
  onConnectWallet: () => void
  onAttendEvent: () => void
  eventUrl: string
  onEventUrlChange: (url: string) => void
  isProcessingEvent: boolean
  scoutingAgentId: string | null
  onRunAutoScout: (agentId: string) => void
}

export function AttendEventCard({
  selectedAgent,
  displayedAgents,
  onSelectAgent,
  walletConnected,
  onConnectWallet,
  onAttendEvent,
  eventUrl,
  onEventUrlChange,
  isProcessingEvent,
  scoutingAgentId,
  onRunAutoScout,
}: AttendEventCardProps) {
  const attendAgentId = (selectedAgent ?? displayedAgents[0])?.id ?? ''
  const activeAgent = displayedAgents.find(a => a.id === attendAgentId) ?? displayedAgents[0]

  return (
    <Card className="glass-card-hover p-6 border-2 border-primary/20">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
          <Globe className="text-primary" weight="duotone" size={22} />
        </div>
        <span>Attend Event</span>
        {displayedAgents.length > 1 && (
          <select
            value={attendAgentId}
            onChange={e => onSelectAgent(e.target.value)}
            className="ml-auto text-xs font-mono bg-background/50 border border-primary/30 rounded-md px-2 py-1 text-foreground cursor-pointer"
          >
            {displayedAgents.map(a => (
              <option key={a.id} value={a.id}>{a.name} (Lv {a.level})</option>
            ))}
          </select>
        )}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Choose one of your AI agents, paste a YouTube video URL, and let the agent autonomously watch, analyze the content, and mint an on-chain Proof-of-Attendance NFT.
      </p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border border-primary/20 p-3 text-center">
          <div className="text-lg">🤖</div>
          <p className="font-semibold text-sm mt-2">Select Agent</p>
        </div>
        <div className="rounded-lg border border-primary/20 p-3 text-center">
          <div className="text-lg">🔗</div>
          <p className="font-semibold text-sm mt-2">Paste Event URL</p>
        </div>
        <div className="rounded-lg border border-primary/20 p-3 text-center">
          <div className="text-lg">🏆</div>
          <p className="font-semibold text-sm mt-2">Earn NFT</p>
        </div>
      </div>
      <div className="flex gap-3 mb-3">
        <Input
          placeholder="Paste a YouTube video URL to start autonomous attendance..."
          value={eventUrl}
          onChange={(e) => onEventUrlChange(e.target.value)}
          className="flex-1 border-primary/30 focus:border-primary bg-background/50 font-mono text-sm"
        />
        <Button
          onClick={!walletConnected ? onConnectWallet : onAttendEvent}
          disabled={walletConnected && (!eventUrl.trim() || isProcessingEvent)}
          className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold px-6 shadow-lg shadow-secondary/30"
        >
          {!walletConnected ? 'Connect & Attend' : isProcessingEvent ? 'Processing...' : 'Launch Autonomous Attendance'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-1">
        Your AI agent will automatically attend, analyze the event, mint an NFT, and gain experience.
      </p>
      <p className="text-xs text-muted-foreground/60">
        Examples: YouTube Live • Tutorial • Conference Talk • Podcast
      </p>
      {walletConnected && activeAgent && (
        <div className="flex items-center gap-3 pt-2 border-t border-primary/10">
          <span className="text-xs text-muted-foreground">Auto Scout</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunAutoScout(activeAgent.id)}
            disabled={scoutingAgentId === activeAgent.id}
            className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 text-xs font-semibold"
          >
            {scoutingAgentId === activeAgent.id ? 'Secretary searching...' : 'Run Auto Scout'}
          </Button>
          <span className="text-xs text-muted-foreground">
            {activeAgent.name} discovers &amp; attends a {activeAgent.niche} event autonomously
          </span>
        </div>
      )}
    </Card>
  )
}
