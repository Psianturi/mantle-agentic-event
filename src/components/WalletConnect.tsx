import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface WalletConnectProps {
  onConnect: (address: string) => void
  isConnected: boolean
  address?: string
  onDisconnect: () => void
}

export function WalletConnect({ onConnect, isConnected, address, onDisconnect }: WalletConnectProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const mockConnect = async () => {
    setIsConnecting(true)
    toast.info('Connecting to Mantle Network...')
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0')
    onConnect(mockAddress)
    setShowDialog(false)
    setIsConnecting(false)
    
    toast.success('Wallet Connected!', {
      description: 'Successfully connected to Mantle Network'
    })
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg glass-card border-primary/20">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-sm font-mono text-foreground/90">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onDisconnect}
          className="glass-card border-primary/20 hover:border-destructive/40"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="bg-gradient-to-r from-primary to-accent hover:opacity-90 font-semibold shadow-lg shadow-primary/30"
      >
        <Wallet className="mr-2" weight="duotone" />
        Connect Wallet
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass-card border-2 border-primary/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Connect to Mantle
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Connect your wallet to start spawning AI agents and minting NFTs on Mantle Network
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={mockConnect}
                disabled={isConnecting}
                className="w-full h-16 bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 border-2 border-primary/30 hover:border-primary/50 transition-all"
              >
                <Wallet size={24} className="mr-3 text-primary" weight="duotone" />
                <div className="text-left">
                  <p className="font-bold text-foreground">MetaMask</p>
                  <p className="text-xs text-muted-foreground">Connect to Mantle via MetaMask</p>
                </div>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={mockConnect}
                disabled={isConnecting}
                className="w-full h-16 bg-gradient-to-r from-secondary/20 to-accent/20 hover:from-secondary/30 hover:to-accent/30 border-2 border-secondary/30 hover:border-secondary/50 transition-all"
              >
                <Wallet size={24} className="mr-3 text-secondary" weight="duotone" />
                <div className="text-left">
                  <p className="font-bold text-foreground">WalletConnect</p>
                  <p className="text-xs text-muted-foreground">Connect via WalletConnect</p>
                </div>
              </Button>
            </motion.div>

            <div className="pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground text-center">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Connected to Mantle Network
                </span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
