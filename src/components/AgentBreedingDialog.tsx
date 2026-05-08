import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Agent, BreedingResult } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Sparkle, Lightning, ArrowsLeftRight, Plus, Dna, Check, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'

interface AgentBreedingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: Agent[]
  onBreedComplete: (result: BreedingResult, offspringName: string) => void
  userBalance: number
}

export function AgentBreedingDialog({ 
  open, 
  onOpenChange, 
  agents, 
  onBreedComplete,
  userBalance 
}: AgentBreedingDialogProps) {
  const [selectedParent1, setSelectedParent1] = useState<Agent | null>(null)
  const [selectedParent2, setSelectedParent2] = useState<Agent | null>(null)
  const [offspringName, setOffspringName] = useState('')
  const [isBreeding, setIsBreeding] = useState(false)
  const [breedingProgress, setBreedingProgress] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [breedingResult, setBreedingResult] = useState<BreedingResult | null>(null)

  const BREEDING_COST = 2.5

  const eligibleAgents = agents.filter(a => 
    a.wisdomUnlocked && 
    (a.breedingCount ?? 0) < (a.maxBreedings ?? 3)
  )

  const canBreed = selectedParent1 && 
                   selectedParent2 && 
                   selectedParent1.id !== selectedParent2.id &&
                   offspringName.trim().length > 0 &&
                   userBalance >= BREEDING_COST

  const calculateInheritedWisdom = (p1: Agent, p2: Agent): number => {
    const baseWisdom = Math.floor((p1.eventsAttended + p2.eventsAttended) / 3)
    const levelBonus = Math.floor((p1.level + p2.level) / 4)
    return baseWisdom + levelBonus
  }

  const getGeneticBonuses = (p1: Agent, p2: Agent): string[] => {
    const bonuses: string[] = []
    
    if (p1.niche === p2.niche) {
      bonuses.push('Specialized Niche Mastery')
    } else {
      bonuses.push('Cross-Domain Intelligence')
    }

    if (p1.personality === p2.personality) {
      bonuses.push('Enhanced Personality Traits')
    } else {
      bonuses.push('Adaptive Personality Matrix')
    }

    const totalEvents = p1.eventsAttended + p2.eventsAttended
    if (totalEvents >= 15) {
      bonuses.push('Legendary Wisdom Heritage')
    } else if (totalEvents >= 10) {
      bonuses.push('Superior Knowledge Base')
    }

    const generation = Math.max(p1.generation ?? 1, p2.generation ?? 1)
    if (generation >= 2) {
      bonuses.push('Multi-Generation Evolution')
    }

    return bonuses
  }

  const getInheritedTraits = (p1: Agent, p2: Agent) => {
    const traits = []
    
    traits.push({ from: p1.name, trait: `${p1.niche} Domain Expertise` })
    traits.push({ from: p2.name, trait: `${p2.niche} Domain Expertise` })
    traits.push({ from: p1.name, trait: `${p1.personality} Strategy Patterns` })
    traits.push({ from: p2.name, trait: `${p2.personality} Analysis Methods` })
    
    if (p1.customInstructions) {
      traits.push({ from: p1.name, trait: 'Custom Protocol Library' })
    }
    if (p2.customInstructions) {
      traits.push({ from: p2.name, trait: 'Advanced Instruction Set' })
    }

    return traits
  }

  const handleBreed = async () => {
    if (!canBreed || !selectedParent1 || !selectedParent2) return

    setIsBreeding(true)
    setBreedingProgress(0)

    const progressSteps = [
      { progress: 20, delay: 500 },
      { progress: 40, delay: 800 },
      { progress: 60, delay: 700 },
      { progress: 80, delay: 600 },
      { progress: 100, delay: 500 }
    ]

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, step.delay))
      setBreedingProgress(step.progress)
    }

    const inheritedWisdom = calculateInheritedWisdom(selectedParent1, selectedParent2)
    const geneticBonuses = getGeneticBonuses(selectedParent1, selectedParent2)
    const inheritedTraits = getInheritedTraits(selectedParent1, selectedParent2)

    const result: BreedingResult = {
      offspring: {
        id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: offspringName,
        personality: Math.random() > 0.5 ? selectedParent1.personality : selectedParent2.personality,
        niche: Math.random() > 0.5 ? selectedParent1.niche : selectedParent2.niche,
        walletAddress: `0x${Array.from({ length: 40 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`,
        eventsAttended: inheritedWisdom,
        level: Math.floor(inheritedWisdom / 2) + 1,
        status: 'idle',
        createdAt: Date.now(),
        subAgents: [
          {
            type: 'secretary',
            name: 'The Secretary',
            status: 'idle',
            description: 'Handles autonomous registration on platforms'
          },
          {
            type: 'scribe',
            name: 'The Scribe',
            status: 'idle',
            description: 'Captures and summarizes event content'
          },
          {
            type: 'social-lite',
            name: 'The Social-Lite',
            status: 'idle',
            description: 'Manages community presence and engagement'
          },
          {
            type: 'mint-master',
            name: 'The Mint-Master',
            status: 'idle',
            description: 'Handles NFT minting and gas optimization'
          }
        ],
        wisdomUnlocked: inheritedWisdom >= 5,
        isGenesis: false,
        ownershipStatus: 'bred',
        agentGasBalance: 0.8,
        mantleBalance: 0.8,
        gasSpent: 0,
        autoReplenishGas: false,
        generation: Math.max(selectedParent1.generation ?? 1, selectedParent2.generation ?? 1) + 1,
        parentIds: [selectedParent1.id, selectedParent2.id],
        breedingCount: 0,
        maxBreedings: 3,
        geneticTraits: geneticBonuses
      },
      inheritedTraits,
      wisdomMerge: {
        parent1Events: selectedParent1.eventsAttended,
        parent2Events: selectedParent2.eventsAttended,
        inheritedWisdom
      },
      geneticBonus: geneticBonuses
    }

    setBreedingResult(result)
    setIsBreeding(false)
    setShowResult(true)
  }

  const handleConfirm = () => {
    if (breedingResult) {
      onBreedComplete(breedingResult, offspringName)
      handleReset()
      onOpenChange(false)
    }
  }

  const handleReset = () => {
    setSelectedParent1(null)
    setSelectedParent2(null)
    setOffspringName('')
    setIsBreeding(false)
    setBreedingProgress(0)
    setShowResult(false)
    setBreedingResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) handleReset()
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto glass-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/30 to-accent/30 border border-secondary/40 flex items-center justify-center animate-glow-pulse-purple">
              <Dna size={28} className="text-secondary" weight="duotone" />
            </div>
            <span className="bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
              Agent Breeding Laboratory
            </span>
          </DialogTitle>
          <DialogDescription className="text-base">
            Merge wisdom from two agents to create a superior offspring with inherited traits and knowledge.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key="breeding-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="p-5 bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-2 border-amber-500/30">
                <div className="flex items-start gap-3">
                  <Sparkle size={24} className="text-amber-500 flex-shrink-0 mt-0.5" weight="duotone" />
                  <div>
                    <h4 className="font-bold text-amber-500 mb-1">Breeding Requirements</h4>
                    <ul className="text-sm text-foreground/90 space-y-1">
                      <li>• Both parents must have Wisdom Unlocked (5+ events attended)</li>
                      <li>• Each agent can breed up to 3 times</li>
                      <li>• Breeding Cost: <span className="font-bold text-amber-500">{BREEDING_COST} MNT</span></li>
                      <li>• Offspring inherits ~33% of combined parent wisdom</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {eligibleAgents.length < 2 && (
                <Card className="p-5 bg-gradient-to-br from-red-500/5 to-red-500/10 border-2 border-red-500/30">
                  <div className="flex items-start gap-3">
                    <X size={24} className="text-red-500 flex-shrink-0 mt-0.5" weight="duotone" />
                    <div>
                      <h4 className="font-bold text-red-500 mb-1">Insufficient Eligible Agents</h4>
                      <p className="text-sm text-foreground/90">
                        You need at least 2 agents with Wisdom Unlocked to breed. Attend more events with your agents!
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <span>Parent 1</span>
                    {selectedParent1 && <Check size={18} className="text-green-500" weight="bold" />}
                  </Label>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {eligibleAgents.map((agent) => (
                      <Card
                        key={agent.id}
                        className={`p-4 cursor-pointer transition-all duration-300 ${
                          selectedParent1?.id === agent.id
                            ? 'bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary shadow-lg shadow-primary/30'
                            : selectedParent2?.id === agent.id
                            ? 'opacity-50 cursor-not-allowed'
                            : 'glass-card-hover border border-primary/20'
                        }`}
                        onClick={() => {
                          if (selectedParent2?.id !== agent.id) {
                            setSelectedParent1(agent)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg mb-1">{agent.name}</h4>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">{agent.niche}</Badge>
                              <Badge variant="outline" className="text-xs">{agent.personality}</Badge>
                              <Badge className="text-xs bg-secondary/20 text-secondary">Gen {agent.generation ?? 1}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Level {agent.level}</span>
                              <span>•</span>
                              <span>{agent.eventsAttended} Events</span>
                              <span>•</span>
                              <span>Breeds: {agent.breedingCount ?? 0}/{agent.maxBreedings ?? 3}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <span>Parent 2</span>
                    {selectedParent2 && <Check size={18} className="text-green-500" weight="bold" />}
                  </Label>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {eligibleAgents.map((agent) => (
                      <Card
                        key={agent.id}
                        className={`p-4 cursor-pointer transition-all duration-300 ${
                          selectedParent2?.id === agent.id
                            ? 'bg-gradient-to-br from-secondary/20 to-accent/20 border-2 border-secondary shadow-lg shadow-secondary/30'
                            : selectedParent1?.id === agent.id
                            ? 'opacity-50 cursor-not-allowed'
                            : 'glass-card-hover border border-primary/20'
                        }`}
                        onClick={() => {
                          if (selectedParent1?.id !== agent.id) {
                            setSelectedParent2(agent)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg mb-1">{agent.name}</h4>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">{agent.niche}</Badge>
                              <Badge variant="outline" className="text-xs">{agent.personality}</Badge>
                              <Badge className="text-xs bg-secondary/20 text-secondary">Gen {agent.generation ?? 1}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Level {agent.level}</span>
                              <span>•</span>
                              <span>{agent.eventsAttended} Events</span>
                              <span>•</span>
                              <span>Breeds: {agent.breedingCount ?? 0}/{agent.maxBreedings ?? 3}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {selectedParent1 && selectedParent2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <Card className="p-5 bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20">
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                      <Lightning size={20} className="text-primary" weight="fill" />
                      Predicted Offspring Traits
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Inherited Wisdom</p>
                        <p className="font-bold text-primary">
                          ~{calculateInheritedWisdom(selectedParent1, selectedParent2)} Events Worth
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Starting Level</p>
                        <p className="font-bold text-secondary">
                          Level {Math.floor(calculateInheritedWisdom(selectedParent1, selectedParent2) / 2) + 1}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Generation</p>
                        <p className="font-bold text-accent">
                          Gen {Math.max(selectedParent1.generation ?? 1, selectedParent2.generation ?? 1) + 1}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-muted-foreground mb-2">Genetic Bonuses:</p>
                      <div className="flex flex-wrap gap-2">
                        {getGeneticBonuses(selectedParent1, selectedParent2).map((bonus, idx) => (
                          <Badge key={idx} className="bg-gradient-to-r from-primary/20 to-secondary/20 text-foreground">
                            {bonus}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <Label htmlFor="offspring-name" className="text-base font-semibold">
                      Offspring Name
                    </Label>
                    <Input
                      id="offspring-name"
                      placeholder="Enter a name for the new agent..."
                      value={offspringName}
                      onChange={(e) => setOffspringName(e.target.value)}
                      className="border-primary/30 focus:border-primary font-semibold"
                    />
                  </div>
                </motion.div>
              )}

              {isBreeding && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-center gap-3">
                    <ArrowsLeftRight size={24} className="text-primary animate-pulse" weight="bold" />
                    <span className="text-lg font-semibold">Merging Wisdom...</span>
                  </div>
                  <Progress value={breedingProgress} className="h-3" />
                  <p className="text-sm text-center text-muted-foreground">
                    Synthesizing genetic traits and knowledge matrices
                  </p>
                </motion.div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-primary/20">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isBreeding}
                  className="border-primary/30"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBreed}
                  disabled={!canBreed || isBreeding}
                  className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold shadow-lg shadow-secondary/30"
                >
                  {isBreeding ? (
                    <>
                      <Sparkle className="mr-2 animate-spin" weight="fill" />
                      Breeding...
                    </>
                  ) : (
                    <>
                      <Dna className="mr-2" weight="duotone" />
                      Breed Agents ({BREEDING_COST} MNT)
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="breeding-result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <Card className="p-8 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-2 border-primary/40 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 animate-pulse" />
                <div className="relative">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-secondary/40 to-accent/40 border-2 border-secondary/50 flex items-center justify-center animate-glow-pulse-purple shadow-2xl">
                    <Sparkle size={48} className="text-secondary" weight="fill" />
                  </div>
                  <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
                    Breeding Successful!
                  </h3>
                  <p className="text-xl font-semibold mb-2">{breedingResult?.offspring.name}</p>
                  <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                    <Badge className="bg-primary/20 text-primary">
                      Gen {breedingResult?.offspring.generation}
                    </Badge>
                    <Badge variant="outline">{breedingResult?.offspring.niche}</Badge>
                    <Badge variant="outline">{breedingResult?.offspring.personality}</Badge>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 glass-card border border-primary/20">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Dna size={20} className="text-primary" weight="duotone" />
                    Wisdom Merge
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parent 1 Events:</span>
                      <span className="font-semibold">{breedingResult?.wisdomMerge.parent1Events}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parent 2 Events:</span>
                      <span className="font-semibold">{breedingResult?.wisdomMerge.parent2Events}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-primary/20">
                      <span className="text-muted-foreground">Inherited Wisdom:</span>
                      <span className="font-bold text-primary">{breedingResult?.wisdomMerge.inheritedWisdom} Events</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 glass-card border border-secondary/20">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Lightning size={20} className="text-secondary" weight="fill" />
                    Genetic Bonuses
                  </h4>
                  <div className="space-y-2">
                    {breedingResult?.geneticBonus.map((bonus, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Plus size={16} className="text-secondary flex-shrink-0 mt-0.5" weight="bold" />
                        <span className="text-sm">{bonus}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="p-5 glass-card border border-accent/20">
                <h4 className="font-bold mb-3">Inherited Traits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {breedingResult?.inheritedTraits.map((trait, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="text-xs flex-shrink-0">{trait.from}</Badge>
                      <span className="text-muted-foreground">{trait.trait}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="flex gap-3 justify-end pt-4 border-t border-primary/20">
                <Button
                  onClick={handleConfirm}
                  className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold shadow-lg shadow-secondary/30"
                >
                  <Check className="mr-2" weight="bold" />
                  Add to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
