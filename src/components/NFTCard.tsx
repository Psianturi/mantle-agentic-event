import { NFT } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Image, Link as LinkIcon, Calendar } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface NFTCardProps {
  nft: NFT
  onClick?: () => void
}

export function NFTCard({ nft, onClick }: NFTCardProps) {
  const handleExplorerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`https://explorer.mantle.xyz/tx/${nft.transactionHash}`, '_blank')
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
      <Card className="glass-card overflow-hidden group">
        <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
          {nft.imageUrl ? (
            <img
              src={nft.imageUrl}
              alt={nft.eventTitle}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image size={64} className="text-primary/40" weight="duotone" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Badge className="absolute top-2 right-2 bg-secondary text-secondary-foreground">
            #{nft.tokenId}
          </Badge>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-sm line-clamp-2 mb-1">{nft.eventTitle}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{nft.summary}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={14} />
            <span>{new Date(nft.date).toLocaleDateString()}</span>
          </div>

          <Button
            onClick={handleExplorerClick}
            variant="outline"
            size="sm"
            className="w-full group/btn border-primary/30 hover:border-primary hover:bg-primary/10"
          >
            <LinkIcon className="mr-2 group-hover/btn:animate-pulse" size={14} />
            View on Mantle Explorer
          </Button>

          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground font-mono truncate">
              {nft.transactionHash.slice(0, 10)}...{nft.transactionHash.slice(-8)}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
