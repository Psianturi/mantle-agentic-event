import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

  agent: Agent
  onApproveEvent: (agentId: string, eventId: string) =>
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProactiveScoutingPanelProps {
  agent: Agent
  onToggleScout: (agentId: string, enabled: boolean) => void
  onApproveEvent: (agentId: string, eventId: string) => void
}

export function ProactiveScoutingPanel({ agent, onToggleScout, onApproveEvent }: ProactiveScoutingPanelProps) {
  const canScout = agent.level >= 5
  const isScoutEnabled = agent.autoScoutEnabled ?? false
  const scoutedEvents = agent.scoutedOpportunities ?? []

                "text-primary 
    if (!canScout) {
      toast.error('Agent must be Level 5+ to enable Auto-Scout')
      return
     
    onToggleScout(agent.id, !isScoutEnabled)
   

  const handleApprove = (eventId: string) => {
    onApproveEvent(agent.id, eventId)
    toast.success('Event approved! Agent will register automatically.')
  }

          
            />
        </div>
      
            <motion.div
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
                <h5 className="text-sm font-s
                  <Badge variant="secondary" className="tex
                  </Badge>
              </div>
              {sco
                 
                    Agent is scanning for events...
                  <p className="t
                  </p>
              ) : (
                  {scoutedEvents.map(
                      key=
                  
                   
                        event.approved
                          : "bg-card/50 border-border/50 hov
                  
                  
                
                            <h6 className="text-sm 
                          <p className="text-xs text-muted-foreground line-clamp-2">
                          </p>
                    
                   
                            <Badge var
                            </Badge>
                        </div>
              disabled={!canScout}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {isScoutEnabled && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3 pt-4 border-t border-border/50"
            >
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-semibold">Scouted Opportunities</h5>
                {scoutedEvents.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {scoutedEvents.length} new
                  </Badge>
                )}
              </div>

              {scoutedEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Radar size={48} className="mx-auto mb-3 text-muted-foreground opacity-50 animate-pulse" weight="duotone" />
                  <p className="text-sm text-muted-foreground">
                    Agent is scanning for events...
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Based on: {agent.customAgenda || agent.niche}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scoutedEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "p-3 rounded-lg border transition-all duration-200",
                        event.approved
                          ? "bg-green-500/10 border-green-500/40"
                          : "bg-card/50 border-border/50 hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {event.platform === 'YouTube' && <Youtube size={16} className="text-red-500" weight="duotone" />}
                            {event.platform === 'Luma' && <Calendar size={16} className="text-blue-500" weight="duotone" />}
                            <h6 className="text-sm font-semibold line-clamp-1">{event.title}</h6>
                          </div>
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
                        </div>
                        {!event.approved ? (


























