import { NFT } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { config as appConfig } from '@/lib/config'
import { Image, Link as LinkIcon, Calendar, Cube, Database } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface NFTCardProps {
  nft: NFT
  onClick?: () => void
}

export function NFTCard({ nft, onClick }: NFTCardProps) {
  const handleExplorerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const explorerUrl = nft.explorerUrl || `${appConfig.blockchain.explorerUrl}/tx/${nft.transactionHash}`
    window.open(explorerUrl, '_blank')
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="glass-card-hover overflow-hidden group border-2">
        <div className="h-32 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 relative overflow-hidden">
          {nft.imageUrl ? (
            <div className="relative w-full h-full">
              <img
                src={nft.imageUrl}
                alt={nft.eventTitle}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 hologram-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 mix-blend-overlay" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,243,255,0.1),transparent_70%)]" />
              <Cube size={40} className="text-primary/60 animate-float" weight="duotone" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Badge className="absolute top-3 right-3 bg-secondary/90 text-secondary-foreground font-mono font-bold backdrop-blur-sm border border-secondary">
            #{nft.tokenId}
          </Badge>
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <div className="px-2 py-1 rounded-md bg-primary/20 backdrop-blur-sm border border-primary/40 text-xs font-mono text-primary font-semibold">
              MANTLE NFT
            </div>
            {nft.metadataCID && (
              <div className="px-2 py-1 rounded-md bg-accent/20 backdrop-blur-sm border border-accent/40 text-xs font-mono text-accent font-semibold flex items-center gap-1">
                <Database size={12} weight="duotone" />
                IPFS
              </div>
            )}
          </div>
        </div>

        <div className="p-3 space-y-2">
          <div>
            <h3 className="font-bold text-xs line-clamp-1 mb-1 group-hover:text-primary transition-colors">{nft.eventTitle}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{nft.summary}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={12} className="text-primary" weight="duotone" />
            <span className="font-mono text-[10px]">{new Date(nft.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <Button
            onClick={handleExplorerClick}
            variant="outline"
            size="sm"
            className="w-full group/btn border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300 h-7 text-[10px]"
          >
            <LinkIcon className="mr-1.5 group-hover/btn:animate-pulse" size={11} weight="duotone" />
            <span className="font-semibold">View on Explorer</span>
          </Button>

          <div className="pt-1 border-t border-border/30">
            <p className="text-[9px] text-muted-foreground/70 font-mono truncate">
              TX: {nft.transactionHash.slice(0, 10)}...{nft.transactionHash.slice(-8)}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
