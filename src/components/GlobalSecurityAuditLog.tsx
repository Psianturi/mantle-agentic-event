import { Card } from '@/components/ui/card'
import { SecurityAuditEntry } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface GlobalSecurityAuditLogProps {
  entries: SecurityAuditEntry[]
}

export function GlobalSecurityAuditLog({ entries }: GlobalSecurityAuditLogProps) {
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
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-xl">🔐</span>
        </div>
        <div>
          <h3 className="text-lg font-bold">Global Security Audit Log</h3>
          <p className="text-sm text-muted-foreground">Real-time network activity monitoring</p>
        </div>
      </div>

      <ScrollArea className="h-[400px] custom-scrollbar">
        <div className="space-y-2 font-mono text-sm pr-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <span className="text-base flex-shrink-0">{entry.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
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
        <span>Live monitoring active</span>
      </div>
    </Card>
  )
}
