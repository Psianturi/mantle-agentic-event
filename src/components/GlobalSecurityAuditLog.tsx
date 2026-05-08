import { Card } from '@/components/ui/card'
import { Agent, SecurityAuditEntry } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'

interface GlobalSecurityAuditLogProps {
  agents: Agent[]
}

const generateMockEntries = (agents: Agent[]): SecurityAuditEntry[] => {
  const entries: SecurityAuditEntry[] = []
  const now = Date.now()
  
  const eventTypes: Array<{
    icon: string
    type: SecurityAuditEntry['type']
    severity: SecurityAuditEntry['severity']
    messages: string[]
  }> = [
    { icon: '🔒', type: 'security', severity: 'info', messages: [
      'Agent NFT Transfer detected. Identity Memory Wiped. Wisdom Retained.',
      'Smart contract verification completed successfully.',
      'Agent wallet security audit passed.',
      'Human-in-the-Loop approval required for transaction.',
      'Private key rotation scheduled and executed.'
    ]},
    { icon: '💸', type: 'economy', severity: 'info', messages: [
      'Agent auto-replenished gas with 0.1 MNT.',
      'Genesis Agent minted successfully for 1.0 MNT.',
      'Gas optimization saved 0.05 MNT on batch mint.',
      'Platform fee collected: 0.5 MNT.',
      'Agent wallet topped up with 0.3 MNT.'
    ]},
    { icon: '⚡', type: 'system', severity: 'info', messages: [
      'New agent spawned and deployed to Mantle Network.',
      'Event attendance completed and NFT minted.',
      'Wisdom threshold reached - strategic analysis available.',
      'Sub-agent delegation workflow completed.',
      'IPFS metadata uploaded successfully.'
    ]},
    { icon: '⚠️', type: 'governance', severity: 'warning', messages: [
      'Low gas balance detected - replenishment recommended.',
      'Agent proposal pending user approval.',
      'Contract verification retry attempt in progress.',
      'Rate limit approaching - throttling requests.',
      'Memory usage at 75% capacity.'
    ]}
  ]

  for (let i = 0; i < 12; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const message = eventType.messages[Math.floor(Math.random() * eventType.messages.length)]
    const agent = agents.length > 0 ? agents[Math.floor(Math.random() * agents.length)] : null
    
    entries.push({
      id: `audit-${Date.now()}-${i}`,
      timestamp: now - (i * 60000 * Math.random() * 10),
      icon: eventType.icon,
      type: eventType.type,
      severity: eventType.severity,
      message: message,
      agentName: Math.random() > 0.3 && agent ? agent.name : undefined
    })
  }

  return entries.sort((a, b) => b.timestamp - a.timestamp)
}

export function GlobalSecurityAuditLog({ agents }: GlobalSecurityAuditLogProps) {
  const [entries, setEntries] = useState<SecurityAuditEntry[]>([])

  useEffect(() => {
    const initialEntries = generateMockEntries(agents)
    setEntries(initialEntries)

    const interval = setInterval(() => {
      const eventTypes: Array<{
        icon: string
        type: SecurityAuditEntry['type']
        severity: SecurityAuditEntry['severity']
        message: string
      }> = [
        { icon: '🔒', type: 'security', severity: 'info', message: 'Routine security scan completed.' },
        { icon: '💸', type: 'economy', severity: 'info', message: `Gas usage monitored: ${(Math.random() * 0.5).toFixed(4)} MNT.` },
        { icon: '⚡', type: 'system', severity: 'info', message: 'Agent activity detected on network.' }
      ]
      
      const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      const agent = agents.length > 0 ? agents[Math.floor(Math.random() * agents.length)] : null
      
      const newEntry: SecurityAuditEntry = {
        id: `audit-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        icon: randomEvent.icon,
        type: randomEvent.type,
        severity: randomEvent.severity,
        message: randomEvent.message,
        agentName: Math.random() > 0.4 && agent ? agent.name : undefined
      }

      setEntries(prev => [newEntry, ...prev].slice(0, 20))
    }, 8000 + Math.random() * 4000)

    return () => clearInterval(interval)
  }, [agents])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    })
  }

  const getSeverityColor = (severity: SecurityAuditEntry['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/20 text-destructive border-destructive/50'
      case 'warning':
        return 'bg-amber-500/20 text-amber-500 border-amber-500/50'
      case 'info':
      default:
        return 'bg-primary/20 text-primary border-primary/50'
    }
  }

  return (
    <Card className="glass-card-hover p-6 border-2 border-primary/20">
      <ScrollArea className="h-[400px] custom-scrollbar">
        <div className="space-y-2 font-mono text-sm pr-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-200 animate-slide-up"
            >
              <div className="flex items-start gap-3">
                <span className="text-base flex-shrink-0">{entry.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      [{formatTime(entry.timestamp)}]
                    </span>
                    <Badge variant="outline" className={`text-xs ${getSeverityColor(entry.severity)}`}>
                      {entry.type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground break-words">{entry.message}</p>
                  {entry.agentName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Agent: {entry.agentName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>Live monitoring active • {entries.length} events logged</span>
      </div>
    </Card>
  )
}
