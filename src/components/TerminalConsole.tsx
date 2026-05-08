import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Terminal, X, Minus } from '@phosphor-icons/react'
import { TerminalLog } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TerminalConsoleProps {
  logs: TerminalLog[]
  className?: string
}

const logTypeStyles = {
  info: 'text-primary',
  success: 'text-green-400',
  error: 'text-destructive',
  warning: 'text-yellow-400'
}

const subAgentPrefix = {
  secretary: '[Secretary]',
  scribe: '[Scribe]',
  'social-lite': '[Social-Lite]',
  'mint-master': '[Mint-Master]'
}

export function TerminalConsole({ logs, className }: TerminalConsoleProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className={cn('fixed bottom-0 left-0 right-0 z-50', className)}
    >
      <Card className="glass-card rounded-t-lg rounded-b-none border-t-2 border-primary/30 border-b-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50">
          <div className="flex items-center gap-2">
            <Terminal className="text-primary" weight="fill" />
            <span className="font-mono text-sm font-semibold">Mission Control Log</span>
            <span className="text-xs text-muted-foreground">
              {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0"
            >
              <Minus size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 200 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ScrollArea className="h-[200px] p-4 bg-background/95">
                <div ref={scrollRef} className="space-y-1 font-mono text-xs">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground italic">Waiting for agent activity...</p>
                  ) : (
                    logs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="animate-slide-up"
                      >
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={cn('ml-2 font-semibold', logTypeStyles[log.type])}>
                          {subAgentPrefix[log.subAgentType]}
                        </span>
                        <span className="ml-2 text-foreground">{log.message}</span>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
