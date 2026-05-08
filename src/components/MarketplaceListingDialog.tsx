import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Agent } from '@/lib/types'
import { Warning, Storefront } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface MarketplaceListingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent | null
  onList: (agentId: string, price: number) => void
}

export function MarketplaceListingDialog({ open, onOpenChange, agent, onList }: MarketplaceListingDialogProps) {
  const [listingPrice, setListingPrice] = useState('')
  const [isListing, setIsListing] = useState(false)

  if (!agent) return null

  const handleList = async () => {
    const price = parseFloat(listingPrice)
    
    if (isNaN(price) || price <= 0) {
      toast.error('Invalid price', {
        description: 'Please enter a valid price in MNT'
      })
      return
    }

    if (price < 0.1) {
      toast.error('Price too low', {
        description: 'Minimum listing price is 0.1 MNT'
      })
      return
    }

    setIsListing(true)

    await new Promise(resolve => setTimeout(resolve, 1500))

    onList(agent.id, price)
    toast.success('Agent listed on marketplace!', {
      description: `${agent.name} is now listed for ${price} MNT`
    })

    setIsListing(false)
    setListingPrice('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-2 border-primary/30">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/40 flex items-center justify-center">
              <Storefront size={24} weight="duotone" className="text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl">List Agent on Marketplace</DialogTitle>
              <DialogDescription className="text-xs">
                Set the listing price for {agent.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 rounded-lg bg-amber-500/10 border-2 border-amber-500/30">
            <div className="flex items-start gap-3">
              <Warning size={24} weight="duotone" className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-500">
                  ⚠️ Security Warning
                </p>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  Listing this agent will transfer its NFT to the marketplace smart contract and <span className="font-bold text-amber-500">permanently wipe your private interaction history</span>. 
                  The agent's public wisdom and event memories will be retained for the new owner.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This ensures your private conversations and custom instructions remain confidential.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="listing-price" className="text-sm font-semibold">
              Listing Price (MNT)
            </Label>
            <Input
              id="listing-price"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="Enter price in MNT (min 0.1)"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
              className="border-primary/30 focus:border-primary font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Minimum listing price: 0.1 MNT
            </p>
          </div>

          <div className="p-3 rounded-lg bg-card/50 border border-border space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agent Level:</span>
              <span className="font-semibold">{agent.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Events Attended:</span>
              <span className="font-semibold">{agent.eventsAttended}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wisdom Status:</span>
              <span className={`font-semibold ${agent.wisdomUnlocked ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {agent.wisdomUnlocked ? 'Unlocked' : 'Locked'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Smart Account Balance:</span>
              <span className="font-semibold font-mono">{agent.agentGasBalance?.toFixed(3) || '0.000'} MNT</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isListing}
            className="border-border hover:bg-secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleList}
            disabled={isListing || !listingPrice}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 font-semibold"
          >
            {isListing ? 'Listing...' : 'Confirm & List'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
