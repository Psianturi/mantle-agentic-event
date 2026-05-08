import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NFT } from '@/lib/types'
import { Copy, ArrowSquareOut, Check } from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'

interface NFTMetadataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nft: NFT | null
}

export function NFTMetadataDialog({ open, onOpenChange, nft }: NFTMetadataDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!nft) return null

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/30 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            NFT Metadata
          </DialogTitle>
          <DialogDescription>
            On-chain proof of attendance details
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {nft.imageUrl && (
              <div className="relative rounded-xl overflow-hidden border-2 border-primary/30">
                <img 
                  src={nft.imageUrl} 
                  alt={nft.eventTitle}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg border border-primary/20">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-2">Event Title</h3>
                <p className="text-lg font-semibold">{nft.eventTitle}</p>
              </div>

              <div className="glass-card p-4 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Transaction Hash</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(nft.transactionHash, 'txHash')}
                    className="h-7 px-2"
                  >
                    {copiedField === 'txHash' ? (
                      <Check className="text-green-500" size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </Button>
                </div>
                <p className="text-sm font-mono text-primary break-all">{nft.transactionHash}</p>
              </div>

              <div className="glass-card p-4 rounded-lg border border-primary/20">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-2">Token ID</h3>
                <p className="text-lg font-mono font-semibold text-secondary">#{nft.tokenId}</p>
              </div>

              {nft.metadataCID && (
                <div className="glass-card p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Metadata CID (IPFS)</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(nft.metadataCID!, 'metadataCID')}
                      className="h-7 px-2"
                    >
                      {copiedField === 'metadataCID' ? (
                        <Check className="text-green-500" size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm font-mono text-accent break-all">{nft.metadataCID}</p>
                  {nft.metadataURI && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-accent/30 hover:border-accent/50"
                      onClick={() => window.open(nft.metadataURI, '_blank')}
                    >
                      <ArrowSquareOut className="mr-2" size={16} />
                      View on IPFS
                    </Button>
                  )}
                </div>
              )}

              {nft.imageCID && (
                <div className="glass-card p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Image CID (IPFS)</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(nft.imageCID!, 'imageCID')}
                      className="h-7 px-2"
                    >
                      {copiedField === 'imageCID' ? (
                        <Check className="text-green-500" size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm font-mono text-accent break-all">{nft.imageCID}</p>
                </div>
              )}

              <div className="glass-card p-4 rounded-lg border border-primary/20">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-2">Summary</h3>
                <p className="text-sm leading-relaxed">{nft.summary}</p>
              </div>

              <div className="glass-card p-4 rounded-lg border border-primary/20">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Minted On</p>
                    <p className="text-sm font-medium">
                      {new Date(nft.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Network</p>
                    <Badge variant="outline" className="border-green-500/30 text-green-500">
                      Mantle
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Storage</p>
                    <Badge variant="outline" className="border-accent/30 text-accent">
                      IPFS
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Standard</p>
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      ERC-721
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
