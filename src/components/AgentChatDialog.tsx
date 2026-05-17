import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Agent } from '@/lib/types'
import { ChatCircle, PaperPlaneRight, Robot } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cloudRunService } from '@/services/cloudRunService'

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: number
}

interface AgentChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent
}

export function AgentChatDialog({ open, onOpenChange, agent }: AgentChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: `Hello! I'm ${agent.name}, your ${agent.personality.toLowerCase()} AI agent specializing in ${agent.niche}. I've attended ${agent.eventsAttended} events and I'm here to help you with insights and recommendations. How can I assist you today?`,
      timestamp: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isTyping])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const conversationHistory = messages
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`)

      const responseText = await cloudRunService.chatWithAgent(agent.id, userMessage.content, conversationHistory)

      const agentMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'agent',
        content: responseText,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, agentMessage])
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message')
      
      const fallbackMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'agent',
        content: `I apologize, but I'm having trouble connecting right now. As your ${agent.personality.toLowerCase()} agent focused on ${agent.niche}, I'm here to provide insights based on the ${agent.eventsAttended} events I've attended. Please try your question again.`,
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, fallbackMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[min(680px,90vh)] glass-card border-2 border-primary/30 flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 border-2 border-primary/40 flex items-center justify-center">
              <Robot size={22} className="text-primary" weight="duotone" />
            </div>
            <div>
              <DialogTitle className="text-lg">Chat with {agent.name}</DialogTitle>
              <DialogDescription className="text-xs">
                {agent.personality} • {agent.niche} • Level {agent.level}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 pr-4">
          <div className="space-y-4 pb-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-foreground'
                        : 'bg-muted/50 border border-border/50 text-foreground'
                    }`}
                  >
                    {message.role === 'agent' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Robot size={16} className="text-primary" weight="duotone" />
                        <span className="text-xs font-semibold text-primary">{agent.name}</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] rounded-xl px-4 py-3 bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Robot size={16} className="text-primary" weight="duotone" />
                    <span className="text-xs font-semibold text-primary">{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 pt-4 border-t border-border/30">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your agent anything..."
            disabled={isTyping}
            className="flex-1 border-primary/30 focus:border-primary bg-background/50"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <PaperPlaneRight size={20} weight="bold" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
