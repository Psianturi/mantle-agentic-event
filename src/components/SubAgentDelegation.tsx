import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Agent, SubAgentType } from '@/lib/types'
import { User, FileText, ChatCircle, Coin, Robot, ArrowRight, Circle, CheckCircle, Warning, XCircle } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SubAgentTask {
  id: string
  subAgentType: SubAgentType
  taskName: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  startTime?: number
  duration?: number
}

interface SubAgentDelegationProps {
  agent: Agent
  isActive?: boolean
  currentTasks?: SubAgentTask[]
}

const subAgentConfig = {
  secretary: {
    icon: User,
    name: 'Secretary',
    color: 'from-cyan-500 to-blue-500',
    borderColor: 'border-cyan-500/50',
    glowColor: 'shadow-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    tasks: [
      'Scanning event platforms',
      'Auto-filling registration forms',
      'Verifying access credentials',
      'Scheduling attendance'
    ]
  },
  scribe: {
    icon: FileText,
    name: 'Scribe',
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/50',
    glowColor: 'shadow-purple-500/30',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    tasks: [
      'Extracting audio transcripts',
      'Analyzing content structure',
      'Generating summaries',
      'Identifying key insights'
    ]
  },
  'social-lite': {
    icon: ChatCircle,
    name: 'Social-Lite',
    color: 'from-green-500 to-emerald-500',
    borderColor: 'border-green-500/50',
    glowColor: 'shadow-green-500/30',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    tasks: [
      'Monitoring community channels',
      'Analyzing sentiment',
      'Tracking discussions',
      'Engaging with members'
    ]
  },
  'mint-master': {
    icon: Coin,
    name: 'Mint-Master',
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/50',
    glowColor: 'shadow-amber-500/30',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    tasks: [
      'Estimating gas fees',
      'Optimizing transaction parameters',
      'Preparing metadata',
      'Executing on-chain mint'
    ]
  }
}

const getStatusIcon = (status: SubAgentTask['status']) => {
  switch (status) {
    case 'queued':
      return <Circle className="animate-pulse" weight="duotone" size={16} />
    case 'processing':
      return <Circle className="animate-spin" weight="bold" size={16} />
    case 'completed':
      return <CheckCircle weight="fill" size={16} />
    case 'failed':
      return <XCircle weight="fill" size={16} />
  }
}

const getStatusColor = (status: SubAgentTask['status']) => {
  switch (status) {
    case 'queued':
      return 'text-muted-foreground'
    case 'processing':
      return 'text-primary'
    case 'completed':
      return 'text-green-500'
    case 'failed':
      return 'text-destructive'
  }
}

export function SubAgentDelegation({ agent, isActive, currentTasks = [] }: SubAgentDelegationProps) {
  const [activePulse, setActivePulse] = useState<SubAgentType | null>(null)
  const [taskQueue, setTaskQueue] = useState<SubAgentTask[]>(currentTasks)

  useEffect(() => {
    if (isActive && currentTasks.length > 0) {
      setTaskQueue(currentTasks)
    }
  }, [isActive, currentTasks])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      const types: SubAgentType[] = ['secretary', 'scribe', 'social-lite', 'mint-master']
      const randomType = types[Math.floor(Math.random() * types.length)]
      setActivePulse(randomType)
      
      setTimeout(() => setActivePulse(null), 1500)
    }, 3000)

    return () => clearInterval(interval)
  }, [isActive])

  const getSubAgentTasks = (type: SubAgentType) => {
    return taskQueue.filter(task => task.subAgentType === type)
  }

  const getSubAgentStatus = (type: SubAgentType): 'idle' | 'active' | 'completed' => {
    const tasks = getSubAgentTasks(type)
    if (tasks.some(t => t.status === 'processing')) return 'active'
    if (tasks.some(t => t.status === 'completed')) return 'completed'
    return 'idle'
  }

  return (
    <Card className="glass-card-hover border-primary/20 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center">
              <Robot className="text-primary" weight="duotone" size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Sub-Agent Delegation</h3>
              <p className="text-xs text-muted-foreground">Real-time task distribution</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card border-primary/20">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
            )} />
            <span className="text-xs font-mono text-muted-foreground">
              {isActive ? 'Active' : 'Idle'}
            </span>
          </div>
        </div>

        <div className="relative mb-8">
          <div className="flex items-center justify-center mb-6">
            <motion.div
              className="relative"
              animate={isActive ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-accent to-secondary border-2 border-primary/60 flex items-center justify-center shadow-2xl shadow-primary/50">
                <Robot size={36} className="text-background" weight="fill" />
              </div>
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary blur-xl opacity-50"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.3, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-background flex items-center justify-center">
                <span className="text-xs font-bold text-white">{agent.level}</span>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(subAgentConfig) as SubAgentType[]).map((type, index) => {
              const config = subAgentConfig[type]
              const Icon = config.icon
              const subAgent = agent.subAgents.find(sa => sa.type === type)
              const status = getSubAgentStatus(type)
              const tasks = getSubAgentTasks(type)
              const isHighlighted = activePulse === type

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <svg
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-16 w-1 h-16 pointer-events-none"
                    style={{ zIndex: 0 }}
                  >
                    <motion.line
                      x1="50%"
                      y1="0"
                      x2="50%"
                      y2="100%"
                      stroke={isHighlighted ? 'url(#pulse-gradient)' : 'rgba(128, 128, 128, 0.2)'}
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={isActive ? { 
                        pathLength: 1,
                        opacity: isHighlighted ? [0.3, 1, 0.3] : 0.3 
                      } : { pathLength: 0 }}
                      transition={{ 
                        pathLength: { duration: 0.5 },
                        opacity: { duration: 1.5, repeat: isHighlighted ? Infinity : 0 }
                      }}
                    />
                    <defs>
                      <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="oklch(0.80 0.18 195)" stopOpacity="0" />
                        <stop offset="100%" stopColor="oklch(0.80 0.18 195)" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <motion.div
                    animate={isHighlighted ? { 
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        '0 0 0px rgba(0, 243, 255, 0)',
                        '0 0 20px rgba(0, 243, 255, 0.4)',
                        '0 0 0px rgba(0, 243, 255, 0)'
                      ]
                    } : {}}
                    transition={{ duration: 1.5 }}
                    className={cn(
                      "relative glass-card-hover border-2 p-4 rounded-xl group",
                      isHighlighted && "border-primary/60",
                      !isHighlighted && config.borderColor
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg border-2 flex items-center justify-center flex-shrink-0",
                        config.bgColor,
                        config.borderColor
                      )}>
                        <Icon className={config.textColor} weight="duotone" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold truncate">{config.name}</h4>
                          <div className="flex items-center gap-1">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              status === 'active' && "bg-green-500 animate-pulse",
                              status === 'completed' && "bg-blue-500",
                              status === 'idle' && "bg-muted-foreground"
                            )} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                          {subAgent?.lastAction || subAgent?.description}
                        </p>

                        <AnimatePresence mode="wait">
                          {tasks.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-1.5"
                            >
                              {tasks.slice(0, 2).map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className={getStatusColor(task.status)}>
                                    {getStatusIcon(task.status)}
                                  </span>
                                  <span className="text-muted-foreground truncate flex-1">
                                    {task.taskName}
                                  </span>
                                  {task.status === 'processing' && (
                                    <span className={cn("font-mono text-xs", config.textColor)}>
                                      {task.progress}%
                                    </span>
                                  )}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {tasks.length === 0 && status === 'idle' && (
                          <div className="text-xs text-muted-foreground/60 italic">
                            Standby mode
                          </div>
                        )}
                      </div>
                    </div>

                    {isHighlighted && (
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ duration: 1.5 }}
                      />
                    )}
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {taskQueue.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-primary/10">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ArrowRight className="text-primary" size={16} weight="bold" />
              Task Queue ({taskQueue.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
              {taskQueue.map((task) => {
                const config = subAgentConfig[task.subAgentType]
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2 rounded-lg glass-card border border-primary/10"
                  >
                    <div className={cn("w-6 h-6 rounded flex items-center justify-center", config.bgColor)}>
                      <config.icon className={config.textColor} size={14} weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{task.taskName}</div>
                      {task.status === 'processing' && (
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                          <motion.div
                            className={cn("h-full rounded-full bg-gradient-to-r", config.color)}
                            initial={{ width: 0 }}
                            animate={{ width: `${task.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      )}
                    </div>
                    <span className={cn("text-xs", getStatusColor(task.status))}>
                      {getStatusIcon(task.status)}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
