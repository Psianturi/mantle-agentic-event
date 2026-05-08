import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Event, Agent, NFT } from '@/lib/types'
import { ipfsService } from '@/lib/ipfs/ipfsService'
import { Upload, CheckCircle, XCircle, Clock, CloudArrowUp } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface BatchIPFSUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: Event[]
  agents: Agent[]
  onBatchComplete: (results: Array<{
    eventId: string
    metadataCID: string
    imageCID: string
    metadataURI: string
  }>) => void
}

interface UploadItem {
  eventId: string
  eventTitle: string
  agentName: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  metadataCID?: string
  imageCID?: string
  error?: string
}

export function BatchIPFSUploadDialog({
  open,
  onOpenChange,
  events,
  agents,
  onBatchComplete
}: BatchIPFSUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [currentProgress, setCurrentProgress] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [currentItemTitle, setCurrentItemTitle] = useState('')

  const eventsWithoutIPFS = events.filter(event => {
    return event.status === 'completed'
  })

  const handleStartBatchUpload = async () => {
    if (eventsWithoutIPFS.length === 0) {
      toast.error('No events available for upload')
      return
    }

    setIsUploading(true)
    setTotalItems(eventsWithoutIPFS.length)
    setCurrentProgress(0)

    const items: UploadItem[] = eventsWithoutIPFS.map(event => {
      const agent = agents.find(a => a.id === event.agentId)
      return {
        eventId: event.id,
        eventTitle: event.title,
        agentName: agent?.name || 'Unknown Agent',
        status: 'pending' as const
      }
    })

    setUploadItems(items)

    const batchParams = eventsWithoutIPFS.map((event, index) => {
      const agent = agents.find(a => a.id === event.agentId)
      return {
        eventTitle: event.title,
        eventUrl: event.url,
        summary: event.summary,
        agentName: agent?.name || 'Unknown Agent',
        agentId: event.agentId,
        platform: event.platform,
        date: event.date,
        tokenId: `${1000 + index}`,
        niche: agent?.niche
      }
    })

    try {
      const results = await ipfsService.batchCreateNFTMetadata(
        batchParams,
        (current, total, itemTitle) => {
          setCurrentProgress(current)
          setCurrentItemTitle(itemTitle)
          
          setUploadItems(prev => prev.map((item, idx) => {
            if (idx === current - 1) {
              return { ...item, status: 'uploading' as const }
            } else if (idx < current - 1) {
              return { ...item, status: 'success' as const }
            }
            return item
          }))
        }
      )

      const completedResults = results.map((result, idx) => {
        const event = eventsWithoutIPFS[result.index]
        return {
          eventId: event.id,
          metadataCID: result.metadataCID,
          imageCID: result.imageCID,
          metadataURI: ipfsService.getGatewayUrl(result.metadataCID)
        }
      })

      setUploadItems(prev => prev.map((item, idx) => ({
        ...item,
        status: 'success' as const,
        metadataCID: results[idx]?.metadataCID,
        imageCID: results[idx]?.imageCID
      })))

      toast.success('Batch upload complete!', {
        description: `Successfully uploaded ${results.length} NFT metadata to IPFS`
      })

      onBatchComplete(completedResults)

      setTimeout(() => {
        onOpenChange(false)
        setUploadItems([])
        setCurrentProgress(0)
      }, 2000)

    } catch (error) {
      console.error('Batch upload failed:', error)
      toast.error('Batch upload failed', {
        description: error instanceof Error ? error.message : 'Please try again'
      })

      setUploadItems(prev => prev.map(item => {
        if (item.status === 'uploading') {
          return { ...item, status: 'error' as const, error: 'Upload failed' }
        }
        return item
      }))
    } finally {
      setIsUploading(false)
    }
  }

  const successCount = uploadItems.filter(i => i.status === 'success').length
  const errorCount = uploadItems.filter(i => i.status === 'error').length
  const progressPercentage = totalItems > 0 ? (currentProgress / totalItems) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl glass-card border-2 border-primary/30 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center">
              <CloudArrowUp className="text-primary" weight="duotone" size={28} />
            </div>
            <span>Batch IPFS Upload</span>
          </DialogTitle>
          <DialogDescription>
            Upload multiple event NFT metadata to IPFS in a single batch operation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
          <Card className="glass-card p-6 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Events</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {eventsWithoutIPFS.length}
                </p>
              </div>
              {isUploading && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Progress</p>
                  <p className="text-2xl font-bold text-primary">
                    {currentProgress} / {totalItems}
                  </p>
                </div>
              )}
            </div>

            {isUploading && (
              <div className="space-y-3">
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono">
                    Uploading: {currentItemTitle.slice(0, 40)}...
                  </span>
                  <span className="text-primary font-bold">{Math.round(progressPercentage)}%</span>
                </div>
              </div>
            )}

            {!isUploading && uploadItems.length > 0 && (
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" weight="fill" size={20} />
                  <span className="text-sm font-semibold text-green-500">{successCount} Success</span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="text-red-500" weight="fill" size={20} />
                    <span className="text-sm font-semibold text-red-500">{errorCount} Failed</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {uploadItems.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>Upload Status</span>
                <Badge variant="outline" className="text-xs">
                  {uploadItems.length} items
                </Badge>
              </h3>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {uploadItems.map((item, idx) => (
                      <motion.div
                        key={item.eventId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="p-4 border-primary/10 hover:border-primary/30 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate mb-1">{item.eventTitle}</p>
                              <p className="text-xs text-muted-foreground">Agent: {item.agentName}</p>
                              {item.metadataCID && (
                                <p className="text-xs text-primary font-mono mt-2 truncate">
                                  CID: {item.metadataCID}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {item.status === 'pending' && (
                                <Clock className="text-muted-foreground" weight="duotone" size={24} />
                              )}
                              {item.status === 'uploading' && (
                                <Upload className="text-primary animate-pulse" weight="duotone" size={24} />
                              )}
                              {item.status === 'success' && (
                                <CheckCircle className="text-green-500" weight="fill" size={24} />
                              )}
                              {item.status === 'error' && (
                                <XCircle className="text-red-500" weight="fill" size={24} />
                              )}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>
          )}

          {uploadItems.length === 0 && eventsWithoutIPFS.length > 0 && (
            <Card className="glass-card p-8 border-dashed border-2 border-primary/30 text-center">
              <CloudArrowUp size={64} className="mx-auto mb-4 text-primary animate-float" weight="duotone" />
              <h3 className="text-lg font-semibold mb-2">Ready to Upload</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {eventsWithoutIPFS.length} event{eventsWithoutIPFS.length !== 1 ? 's' : ''} ready to be uploaded to IPFS
              </p>
              <Button
                onClick={handleStartBatchUpload}
                disabled={isUploading}
                className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold shadow-lg shadow-secondary/30"
              >
                <Upload className="mr-2" weight="bold" />
                Start Batch Upload
              </Button>
            </Card>
          )}

          {uploadItems.length === 0 && eventsWithoutIPFS.length === 0 && (
            <Card className="glass-card p-8 border-dashed border-2 border-primary/30 text-center">
              <CloudArrowUp size={64} className="mx-auto mb-4 text-muted-foreground" weight="duotone" />
              <h3 className="text-lg font-semibold mb-2">No Events Available</h3>
              <p className="text-sm text-muted-foreground">
                All events have already been uploaded to IPFS or no completed events exist
              </p>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-primary/20">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="border-primary/30"
          >
            {uploadItems.length > 0 && !isUploading ? 'Close' : 'Cancel'}
          </Button>
          {uploadItems.length === 0 && eventsWithoutIPFS.length > 0 && (
            <Button
              onClick={handleStartBatchUpload}
              disabled={isUploading}
              className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold shadow-lg shadow-secondary/30"
            >
              <Upload className="mr-2" weight="bold" />
              Start Upload
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
