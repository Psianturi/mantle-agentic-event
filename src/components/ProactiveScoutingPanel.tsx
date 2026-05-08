import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

  agent: Agent
  onApproveEvent: (agentId: st
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface ProactiveScoutingPanelProps {
  agent: Agent
  onToggleScout: (agentId: string, enabled: boolean) => void
  onApproveEvent: (agentId: string, eventId: string) => void
}

      toast.info('Proactive Scouting Disabled')
  }
  const handleApprove = (eventId: string) => {
    toast.success('Event approved! Agent will register a

    <Card className="glass-car
        <div classNa
            <div className="flex items-center gap-2 mb-2">
            
     
              </Label>
    
                ? `Auto-sc
              }
            {!canScout && (
        
            
      toast.info('Proactive Scouting Disabled')
    }
  }

  const handleApprove = (eventId: string) => {
    onApproveEvent(agent.id, eventId)
    toast.success('Event approved! Agent will register automatically.')
  }

  return (
    <Card className="glass-card-hover p-5 border-2 border-primary/30">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Radar className="text-primary" weight="duotone" size={18} />
              </div>
              <Label htmlFor={`scout-${agent.id}`} className="text-base font-semibold cursor-pointer">
                Proactive Event Scouting
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {canScout 
                ? `Auto-scan and recommend events based on: ${agent.customAgenda || agent.niche}`
                : 'Unlock at Level 5 to enable autonomous event discovery'
              }
            </p>
            {!canScout && (
              <Badge variant="outline" className="mt-2 text-xs">
                Requires Level 5+ (Current: Level {agent.level})
              </Badge>
            )}
          </div>
                 
            id={`scout-${agent.id}`}
            checked={isScoutEnabled}
            onCheckedChange={handleToggle}
            disabled={!canScout}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        {isScoutEnabled && (
                          :
            <motion.div
                      <div className="flex items-
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3 pt-4 border-t border-border/50"
            >
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-semibold">Scouted Opportunities</h5>
                          <div className="flex
                  <Badge variant="secondary" className="text-xs">
                    {scoutedEvents.length} new
                  </Badge>
                  
              </div>

              {scoutedEvents.length === 0 ? (
                            size="sm"
                  <Radar size={48} className="mx-auto mb-3 text-muted-foreground opacity-50 animate-pulse" weight="duotone" />
                          >
                    Agent is scanning for events...
                      
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Based on: {agent.customAgenda || agent.niche}
                  </p>
                      
              ) : (
                <div className="space-y-2">
                  {scoutedEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}

                      className={cn(
                        "p-3 rounded-lg border transition-all duration-200",
                        event.approved

                          : "bg-card/50 border-border/50 hover:border-primary/40"

                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {event.platform === 'YouTube' && <Youtube size={16} className="text-red-500" weight="duotone" />}
                            {event.platform === 'Luma' && <Calendar size={16} className="text-blue-500" weight="duotone" />}
                            {event.platform === 'Eventbrite' && <Calendar size={16} className="text-orange-500" weight="duotone" />}
                            {event.platform === 'Zoom' && <Calendar size={16} className="text-primary" weight="duotone" />}
                            <h6 className="text-sm font-semibold line-clamp-1">{event.title}</h6>

                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              Relevance: {event.relevanceScore}%
                            </Badge>

                        </div>
                        {!event.approved ? (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(event.id)}
                            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shrink-0"
                          >
                            Approve
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1 text-green-500 shrink-0">
                            <CheckCircle size={16} weight="fill" />
                            <span className="text-xs font-semibold">Approved</span>
                          </div>
                        )}
                      </div>
                    </motion.div>

                </div>

            </motion.div>

        )}

    </Card>

}
