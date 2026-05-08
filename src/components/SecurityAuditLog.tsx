import { Card } from '@/components/ui/card'
import { ShieldCheck, Warning } from '@phosphor-icons/react'
import { Agent } from '@/lib/types'

interface SecurityAuditLogProps {
  agents: Agent[]
}

interface AuditLogEntry {
  id: string
  timestamp: number
  agentId: string
  agentName: string
  eventType: 'transfer-detected' | 'memory-wipe' | 'ownership-change'
  message: string
  severity: 'info' | 'warning'
}

export function SecurityAuditLog({ agents }: SecurityAuditLogProps) {
  const mockLogs: AuditLogEntry[] = agents
    .filter(agent => agent.ownershipStatus === 'marketplace-acquired')
    .flatMap(agent => [
      {
        id: `${agent.id}-transfer`,
        timestamp: agent.createdAt,
        agentId: agent.id,
        agentName: agent.name,
        eventType: 'transfer-detected' as const,
        message: `Agent NFT Transfer Detected. Initiating security protocol...`,
        severity: 'warning' as const
      },
      {
        id: `${agent.id}-wipe`,
        timestamp: agent.createdAt + 1000,
        agentId: agent.id,
        agentName: agent.name,
        eventType: 'memory-wipe' as const,
        message: `Wiping Private Identity Memory... Public Wisdom Memory Retained.`,
        severity: 'info' as const
      },
      {
        id: `${agent.id}-ownership`,
        timestamp: agent.createdAt + 2000,
        agentId: agent.id,
        agentName: agent.name,
        eventType: 'ownership-change' as const,
        message: `Ownership transferred securely. Agent ready for new owner.`,
        severity: 'info' as const
      }
    ])
    .sort((a, b) => b.timestamp - a.timestamp)

  if (mockLogs.length === 0) {
    return (
      <Card className="glass-card-hover p-8 text-center border-2 border-dashed border-primary/30">
        <ShieldCheck size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" weight="duotone" />
        <h4 className="text-base font-semibold mb-2 text-muted-foreground">No Security Events</h4>
        <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
          Security audit logs will appear here when agents are transferred via marketplace
        </p>
      </Card>
    )
  }

  return (
    <Card className="glass-card-hover p-6 border border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="text-primary" weight="duotone" size={24} />
        <h3 className="text-lg font-bold">Security Audit Log</h3>
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {mockLogs.map((log) => (
          <div
            key={log.id}
            className={`p-4 rounded-lg border transition-all ${
              log.severity === 'warning'
                ? 'bg-amber-500/5 border-amber-500/30'
                : 'bg-primary/5 border-primary/20'
            }`}
          >
            <div className="flex items-start gap-3">
              {log.severity === 'warning' ? (
                <Warning className="text-amber-500 flex-shrink-0 mt-0.5" weight="fill" size={20} />
              ) : (
                <ShieldCheck className="text-primary flex-shrink-0 mt-0.5" weight="fill" size={20} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm text-foreground truncate">
                    [{log.agentName}]
                  </p>
                  <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  <span className="font-mono text-xs text-primary">[SYSTEM]</span> {log.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
