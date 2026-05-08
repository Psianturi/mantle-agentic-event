import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Funnel, X } from '@phosphor-icons/react'
import { Niche } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface MarketplaceFiltersProps {
  filters: {
    generation: number[]
    niche: Niche[]
    sortBy: 'price-asc' | 'price-desc' | 'level-desc' | 'generation-desc'
  }
  onFilterChange: (filters: {
    generation: number[]
    niche: Niche[]
    sortBy: 'price-asc' | 'price-desc' | 'level-desc' | 'generation-desc'
  }) => void
}

const niches: Niche[] = ['Blockchain/DeFi', 'Trading/Investment', 'Technology', 'Health/Wellness']
const generations = [1, 2, 3, 4, 5]

export function MarketplaceFilters({ filters, onFilterChange }: MarketplaceFiltersProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleGenerationToggle = (gen: number) => {
    const newGenerations = filters.generation.includes(gen)
      ? filters.generation.filter(g => g !== gen)
      : [...filters.generation, gen]
    onFilterChange({ ...filters, generation: newGenerations })
  }

  const handleNicheToggle = (niche: Niche) => {
    const newNiches = filters.niche.includes(niche)
      ? filters.niche.filter(n => n !== niche)
      : [...filters.niche, niche]
    onFilterChange({ ...filters, niche: newNiches })
  }

  const handleClearFilters = () => {
    onFilterChange({
      generation: [],
      niche: [],
      sortBy: 'level-desc'
    })
  }

  const activeFilterCount = filters.generation.length + filters.niche.length

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card-hover p-5 border-2 border-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-accent/5" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 border border-secondary/40 flex items-center justify-center">
                <Funnel size={20} className="text-secondary" weight="duotone" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Marketplace Filters</h3>
                {activeFilterCount > 0 && (
                  <p className="text-xs text-muted-foreground">{activeFilterCount} active filter(s)</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  onClick={handleClearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-xs hover:bg-destructive/10 hover:text-destructive"
                >
                  <X size={14} className="mr-1" />
                  Clear All
                </Button>
              )}
              <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                {isOpen ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
                  <div>
                    <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span>Generation</span>
                      {filters.generation.length > 0 && (
                        <span className="text-xs text-secondary bg-secondary/20 px-2 py-0.5 rounded-full">
                          {filters.generation.length}
                        </span>
                      )}
                    </Label>
                    <div className="space-y-2.5">
                      {generations.map((gen) => (
                        <div key={gen} className="flex items-center space-x-2">
                          <Checkbox
                            id={`gen-${gen}`}
                            checked={filters.generation.includes(gen)}
                            onCheckedChange={() => handleGenerationToggle(gen)}
                            className="border-secondary/40 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                          />
                          <label
                            htmlFor={`gen-${gen}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                          >
                            Gen-{gen}
                            {gen >= 3 && (
                              <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                                RARE
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span>Niche</span>
                      {filters.niche.length > 0 && (
                        <span className="text-xs text-secondary bg-secondary/20 px-2 py-0.5 rounded-full">
                          {filters.niche.length}
                        </span>
                      )}
                    </Label>
                    <div className="space-y-2.5">
                      {niches.map((niche) => (
                        <div key={niche} className="flex items-center space-x-2">
                          <Checkbox
                            id={`niche-${niche}`}
                            checked={filters.niche.includes(niche)}
                            onCheckedChange={() => handleNicheToggle(niche)}
                            className="border-secondary/40 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                          />
                          <label
                            htmlFor={`niche-${niche}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {niche}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Sort By</Label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value: typeof filters.sortBy) =>
                        onFilterChange({ ...filters, sortBy: value })
                      }
                    >
                      <SelectTrigger className="border-secondary/30 focus:border-secondary bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="level-desc">Highest Level</SelectItem>
                        <SelectItem value="generation-desc">Highest Generation</SelectItem>
                        <SelectItem value="price-asc">Price: Low to High</SelectItem>
                        <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}
