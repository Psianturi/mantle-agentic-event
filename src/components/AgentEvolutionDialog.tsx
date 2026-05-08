import { Agent } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AgentEvolutionPath } from './AgentEvolutionPath'
import { AgentLineageTree } from './AgentLineageTreeInteractive'
import { TreeStructure, ChartLine } from '@phosphor-icons/react'

interface AgentEvolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent | null
  allAgents?: Agent[]
}

export function AgentEvolutionDialog({
  open,
  onOpenChange,
  agent,
  allAgents = []
}: AgentEvolutionDialogProps) {
  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            {agent.name} - Agent Details
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="evolution" className="w-full">
          <TabsList className="glass-card mb-4 p-2 border border-primary/20 gap-1.5 w-full grid grid-cols-2">
            <TabsTrigger 
              value="evolution" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary transition-all duration-300"
            >
              <ChartLine size={16} className="mr-2" weight="duotone" />
              Evolution Path
            </TabsTrigger>
            <TabsTrigger 
              value="lineage" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary transition-all duration-300"
            >
              <TreeStructure size={16} className="mr-2" weight="duotone" />
              Genetic Lineage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evolution" className="mt-4">
            <AgentEvolutionPath agent={agent} />
          </TabsContent>

          <TabsContent value="lineage" className="mt-4">
            <AgentLineageTree agent={agent} allAgents={allAgents} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
