import { Agent } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AgentEvolutionPath } from './AgentEvolutionPath'

interface AgentEvolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent | null
}

export function AgentEvolutionDialog({
  open,
  onOpenChange,
  agent
}: AgentEvolutionDialogProps) {
  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            {agent.name} - Evolution Path
          </DialogTitle>
        </DialogHeader>
        <AgentEvolutionPath agent={agent} />
      </DialogContent>
    </Dialog>
  )
}
