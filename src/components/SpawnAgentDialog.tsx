import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Niche, Personality, Agent } from '@/lib/types'
import { createMockAgent } from '@/lib/mockData'
import { Sparkle, Lightning } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

interface SpawnAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentCreated: (agent: Agent) => void
}

const niches: Niche[] = ['Blockchain/DeFi', 'Trading/Investment', 'Technology', 'Health/Wellness']
const personalities: Personality[] = ['Aggressive', 'Analytical', 'Creative']

export function SpawnAgentDialog({ open, onOpenChange, onAgentCreated }: SpawnAgentDialogProps) {
  const [name, setName] = useState('')
  const [personality, setPersonality] = useState<Personality>('Analytical')
  const [niche, setNiche] = useState<Niche>('Blockchain/DeFi')
  const [isSpawning, setIsSpawning] = useState(false)

  const handleSpawn = async () => {
    if (!name.trim()) return

    setIsSpawning(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const newAgent = createMockAgent(name, personality, niche)
    onAgentCreated(newAgent)
    
    setIsSpawning(false)
    setName('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkle className="text-primary" weight="fill" />
            Spawn New Agent
          </DialogTitle>
          <DialogDescription>
            Create an autonomous AI agent tailored to your information domain
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!isSpawning ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  placeholder="e.g., Alpha Genesis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality">Personality</Label>
                <Select value={personality} onValueChange={(v) => setPersonality(v as Personality)}>
                  <SelectTrigger id="personality" className="border-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {personalities.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {personality === 'Aggressive' && 'Fast-acting, prioritizes speed over precision'}
                  {personality === 'Analytical' && 'Methodical, focuses on detailed analysis'}
                  {personality === 'Creative' && 'Innovative, explores unconventional insights'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="niche">Information Niche</Label>
                <Select value={niche} onValueChange={(v) => setNiche(v as Niche)}>
                  <SelectTrigger id="niche" className="border-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {niches.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSpawn}
                disabled={!name.trim()}
                className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90 transition-opacity"
              >
                <Lightning className="mr-2" weight="fill" />
                Initialize Agent
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="spawning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mb-4"
              >
                <Sparkle size={32} className="text-background" weight="fill" />
              </motion.div>
              <h3 className="text-xl font-bold mb-2">Birth Sequence Active</h3>
              <p className="text-sm text-muted-foreground text-center">
                Generating Mantle wallet address...<br />
                Initializing sub-agents...<br />
                Establishing neural pathways...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
