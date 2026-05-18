import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Agent, SubAgentType, ScoutLogEntry } from '@/lib/types'
import { User, FileText, ChatCircle, Coin, Robot, ArrowRight, Circle, CheckCircle, XCircle, ChartBar, MagnifyingGlass, Funnel, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SubAgentAnalytics, SubAgentHistoricalData } from './SubAgentAnalytics'
import { cloudRunService } from '@/services/cloudRunService'

function decodeHtml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
}

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
  agents: Agent[]
  isActive?: boolean
  currentTasks?: SubAgentTask[]
  activeAgentId?: string | null
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

export function SubAgentDelegation({ agents, isActive, currentTasks = [], activeAgentId }: SubAgentDelegationProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '')
  const [activePulse, setActivePulse] = useState<SubAgentType | null>(null)
  const [taskQueue, setTaskQueue] = useState<SubAgentTask[]>(currentTasks)
  const [historicalData, setHistoricalData] = useState<Record<string, SubAgentHistoricalData>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | SubAgentTask['status']>('all')
  const [subAgentFilter, setSubAgentFilter] = useState<'all' | SubAgentType>('all')
  const [showFilters, setShowFilters] = useState(false)

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0]

  const filteredTasks = useMemo(() => {
    let filtered = taskQueue

    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.subAgentType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    if (subAgentFilter !== 'all') {
      filtered = filtered.filter(task => task.subAgentType === subAgentFilter)
    }

    return filtered
  }, [taskQueue, searchQuery, statusFilter, subAgentFilter])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (statusFilter !== 'all') count++
    if (subAgentFilter !== 'all') count++
    return count
  }, [statusFilter, subAgentFilter])

  const clearFilters = () => {
    setStatusFilter('all')
    setSubAgentFilter('all')
    setSearchQuery('')
  }

  useEffect(() => {
    if (agents.length > 0 && !agents.find(a => a.id === selectedAgentId)) {
      setSelectedAgentId(agents[0].id)
    }
  }, [agents, selectedAgentId])

  useEffect(() => {
    if (activeAgentId === selectedAgentId && isActive && currentTasks.length > 0) {
      setTaskQueue(currentTasks)
    }
  }, [isActive, currentTasks, activeAgentId, selectedAgentId])

  useEffect(() => {
    if (!isActive || activeAgentId !== selectedAgentId) return

    const interval = setInterval(() => {
      const types: SubAgentType[] = ['secretary', 'scribe', 'social-lite', 'mint-master']
      const randomType = types[Math.floor(Math.random() * types.length)]
      setActivePulse(randomType)
      
      setTimeout(() => setActivePulse(null), 1500)
    }, 3000)

    return () => clearInterval(interval)
  }, [isActive, activeAgentId, selectedAgentId])

  // --- Real data from Firestore scout_logs ---
  const [scoutLogs, setScoutLogs] = useState<ScoutLogEntry[]>([])

  useEffect(() => {
    if (!selectedAgent) return
    cloudRunService.getAgentScoutLogs(selectedAgent.id)
      .then(setScoutLogs)
      .catch(() => {})
  }, [selectedAgent?.id])

  const formatRelativeTime = (ts: number) => {
    const diff = Date.now() - ts
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (d > 0) return `${d}d ago`
    if (h > 0) return `${h}h ago`
    if (m > 0) return `${m}m ago`
    return 'just now'
  }

  // Build SubAgentHistoricalData from real scout_logs
  const derivedHistoricalData = useMemo((): SubAgentHistoricalData => {
    if (!scoutLogs.length) return {}
    const minted = scoutLogs.filter(l => l.action === 'MINTED')
    const oldest = [...scoutLogs].reverse()
    return {
      secretary: {
        totalTasks: scoutLogs.length,
        completedTasks: scoutLogs.length,
        failedTasks: 0,
        avgDuration: 24000,
        lastActive: scoutLogs[0] ? scoutLogs[0].runAt * 1000 : 0,
        successRate: 100,
        taskHistory: oldest.map(l => ({
          timestamp: l.runAt * 1000,
          taskName: `Scouted ${selectedAgent?.niche || 'events'}`,
          duration: 24000,
          status: 'completed' as const
        })).slice(-20)
      },
      scribe: {
        totalTasks: minted.length,
        completedTasks: minted.length,
        failedTasks: 0,
        avgDuration: 3500,
        lastActive: minted[0] ? minted[0].runAt * 1000 : 0,
        successRate: minted.length > 0 ? 100 : 0,
        taskHistory: [...minted].reverse().map(l => ({
          timestamp: l.runAt * 1000,
          taskName: 'Generated wisdom report',
          duration: 3500,
          status: 'completed' as const
        })).slice(-20)
      },
      'mint-master': {
        totalTasks: minted.length,
        completedTasks: minted.length,
        failedTasks: 0,
        avgDuration: 3000,
        lastActive: minted[0] ? minted[0].runAt * 1000 : 0,
        successRate: minted.length > 0 ? 100 : 0,
        taskHistory: [...minted].reverse().map(l => ({
          timestamp: l.runAt * 1000,
          taskName: l.candidateTitle ? `Minted: ${decodeHtml(l.candidateTitle).slice(0, 32)}` : 'Minted NFT on Mantle',
          duration: 3000,
          status: 'completed' as const
        })).slice(-20)
      },
      'social-lite': {
        totalTasks: minted.length,
        completedTasks: minted.length,
        failedTasks: 0,
        avgDuration: 1500,
        lastActive: minted[0] ? minted[0].runAt * 1000 : 0,
        successRate: minted.length > 0 ? 100 : 0,
        taskHistory: [...minted].reverse().map(l => ({
          timestamp: l.runAt * 1000,
          taskName: 'Generated social post draft',
          duration: 1500,
          status: 'completed' as const
        })).slice(-20)
      }
    }
  }, [scoutLogs, selectedAgent?.niche, selectedAgent?.id])

  // Merge live session data over derived (live always wins)
  const mergedHistoricalData = useMemo((): SubAgentHistoricalData => {
    const liveForAgent = selectedAgent ? (historicalData[selectedAgent.id] || {}) : {}
    const merged = { ...derivedHistoricalData }
    ;(Object.keys(liveForAgent) as SubAgentType[]).forEach(type => {
      if ((liveForAgent[type]?.totalTasks ?? 0) > 0) merged[type] = liveForAgent[type]
    })
    return merged
  }, [derivedHistoricalData, historicalData, selectedAgent])

  // Historical task entries for display in Delegation tab when queue is idle
  const historyTasks = useMemo((): SubAgentTask[] => {
    return scoutLogs.slice(0, 3).flatMap(log => {
      const tasks: SubAgentTask[] = [{
        id: `${log.logId}-sec`,
        subAgentType: 'secretary',
        taskName: log.candidateTitle
          ? `Found: ${decodeHtml(log.candidateTitle).slice(0, 40)}`
          : `Scanned ${selectedAgent?.niche} events`,
        status: 'completed',
        progress: 100,
        startTime: log.runAt * 1000,
        duration: 22000
      }]
      if (log.action === 'MINTED') {
        tasks.push(
          { id: `${log.logId}-scribe`, subAgentType: 'scribe', taskName: 'Generated wisdom report', status: 'completed', progress: 100, startTime: log.runAt * 1000, duration: 3500 },
          { id: `${log.logId}-mint`, subAgentType: 'mint-master', taskName: 'Minted NFT on Mantle', status: 'completed', progress: 100, startTime: log.runAt * 1000, duration: 3000 }
        )
      }
      return tasks
    })
  }, [scoutLogs, selectedAgent?.niche])

  // ---

  useEffect(() => {
    const completedTasks = currentTasks.filter(t =>
      t.status === 'completed' || t.status === 'failed'
    )

    if (completedTasks.length > 0 && selectedAgent) {
      setHistoricalData((current) => {
        const agentData = current?.[selectedAgent.id] || {}

        const updatedAgentData = { ...agentData }

        completedTasks.forEach(task => {
          const subAgentType = task.subAgentType
          const subAgentData = updatedAgentData[subAgentType] || {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            avgDuration: 0,
            lastActive: 0,
            successRate: 0,
            taskHistory: []
          }

          const existingTask = subAgentData.taskHistory.find(
            t => t.timestamp === task.startTime && t.taskName === task.taskName
          )

          if (!existingTask && task.startTime) {
            const duration = task.duration || 3000
            const newTotalTasks = subAgentData.totalTasks + 1
            const newCompletedTasks = task.status === 'completed' 
              ? subAgentData.completedTasks + 1 
              : subAgentData.completedTasks
            const newFailedTasks = task.status === 'failed' 
              ? subAgentData.failedTasks + 1 
              : subAgentData.failedTasks

            const newAvgDuration = 
              (subAgentData.avgDuration * subAgentData.totalTasks + duration) / newTotalTasks

            updatedAgentData[subAgentType] = {
              totalTasks: newTotalTasks,
              completedTasks: newCompletedTasks,
              failedTasks: newFailedTasks,
              avgDuration: newAvgDuration,
              lastActive: Date.now(),
              successRate: (newCompletedTasks / newTotalTasks) * 100,
              taskHistory: [
                ...subAgentData.taskHistory,
                {
                  timestamp: task.startTime,
                  taskName: task.taskName,
                  duration,
                  status: task.status as 'completed' | 'failed'
                }
              ].slice(-20)
            }
          }
        })

        return {
          ...current,
          [selectedAgent.id]: updatedAgentData
        }
      })
    }
  }, [currentTasks, selectedAgent, setHistoricalData])

  const getSubAgentTasks = (type: SubAgentType) => {
    return taskQueue.filter(task => task.subAgentType === type)
  }

  const getSubAgentStatus = (type: SubAgentType): 'idle' | 'active' | 'completed' => {
    const tasks = getSubAgentTasks(type)
    if (tasks.some(t => t.status === 'processing')) return 'active'
    if (tasks.some(t => t.status === 'completed')) return 'completed'
    if ((mergedHistoricalData[type]?.completedTasks ?? 0) > 0) return 'completed'
    return 'idle'
  }

  const agentHistoricalData = mergedHistoricalData

  const isAgentActive = isActive && activeAgentId === selectedAgentId

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
              <p className="text-xs text-muted-foreground">Real-time task distribution & analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card border-primary/20">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isAgentActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
              )} />
              <span className="text-xs font-mono text-muted-foreground">
                {isAgentActive ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        {agents.length > 1 && (
          <div className="mb-6">
            <label className="text-xs text-muted-foreground font-semibold mb-2 block">
              Select Agent
            </label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-full glass-card border-primary/30">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <Robot size={16} weight="duotone" className="text-primary" />
                      <span className="font-semibold">{agent.name}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{agent.niche}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">Level {agent.level}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Tabs defaultValue="delegation" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 glass-card border-primary/20">
            <TabsTrigger value="delegation" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary">
              <Robot size={16} weight="duotone" className="mr-2" />
              Delegation
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary">
              <ChartBar size={16} weight="duotone" className="mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="delegation" className="space-y-4">
            <div className="relative">
              <div className="flex items-center justify-center mb-4">
                <motion.div
                  className="relative"
                  animate={isAgentActive ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary border-2 border-primary/60 flex items-center justify-center shadow-xl shadow-primary/40">
                    <Robot size={26} className="text-background" weight="fill" />
                  </div>
                  {isAgentActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary blur-xl opacity-50"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.3, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-background flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{selectedAgent?.level}</span>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(subAgentConfig) as SubAgentType[]).map((type, index) => {
                  const config = subAgentConfig[type]
                  const Icon = config.icon
                  const subAgent = selectedAgent?.subAgents.find((sa) => sa.type === type)
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
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-1 h-12 pointer-events-none"
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
                          animate={isAgentActive ? { 
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
                            '0 0 16px rgba(0, 243, 255, 0.4)',
                            '0 0 0px rgba(0, 243, 255, 0)'
                          ]
                        } : {}}
                        transition={{ duration: 1.5 }}
                        className={cn(
                          "relative glass-card-hover border-2 p-3 rounded-xl group",
                          isHighlighted && "border-primary/60",
                          !isHighlighted && config.borderColor
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg border-2 flex items-center justify-center flex-shrink-0",
                            config.bgColor,
                            config.borderColor
                          )}>
                            <Icon className={config.textColor} weight="duotone" size={16} />
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

                            {tasks.length === 0 && status !== 'active' && (
                              <div className="text-xs text-muted-foreground/60 italic">
                                {(mergedHistoricalData[type]?.lastActive ?? 0) > 0
                                  ? `Active ${formatRelativeTime(mergedHistoricalData[type].lastActive)}`
                                  : 'Standby mode'}
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

            {taskQueue.length === 0 && historyTasks.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-primary/10">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" weight="fill" />
                  Recent Autonomous Activity
                </h4>
                <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                  {historyTasks.map(task => {
                    const config = subAgentConfig[task.subAgentType]
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-2 rounded-lg glass-card border border-green-500/10"
                      >
                        <div className={cn('w-6 h-6 rounded flex items-center justify-center flex-shrink-0', config.bgColor)}>
                          <config.icon className={config.textColor} size={14} weight="duotone" />
                        </div>
                        <div className="flex-1 min-w-0 text-xs font-medium truncate">{task.taskName}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/60 flex-shrink-0">
                          <CheckCircle size={12} className="text-green-500" weight="fill" />
                          {task.startTime ? formatRelativeTime(task.startTime) : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {taskQueue.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-primary/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <ArrowRight className="text-primary" size={16} weight="bold" />
                    Task Queue ({filteredTasks.length}{filteredTasks.length !== taskQueue.length && ` / ${taskQueue.length}`})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-7 px-2"
                  >
                    <Funnel size={16} weight="duotone" className="text-primary" />
                    {activeFiltersCount > 0 && (
                      <Badge variant="default" className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </div>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="relative">
                        <MagnifyingGlass 
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
                          size={16} 
                          weight="duotone" 
                        />
                        <Input
                          placeholder="Search tasks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9 glass-card border-primary/30 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-semibold">Status</label>
                          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger className="h-9 glass-card border-primary/30 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="queued">
                                <div className="flex items-center gap-2">
                                  <Circle size={12} className="text-muted-foreground" weight="duotone" />
                                  Queued
                                </div>
                              </SelectItem>
                              <SelectItem value="processing">
                                <div className="flex items-center gap-2">
                                  <Circle size={12} className="text-primary" weight="bold" />
                                  Processing
                                </div>
                              </SelectItem>
                              <SelectItem value="completed">
                                <div className="flex items-center gap-2">
                                  <CheckCircle size={12} className="text-green-500" weight="fill" />
                                  Completed
                                </div>
                              </SelectItem>
                              <SelectItem value="failed">
                                <div className="flex items-center gap-2">
                                  <XCircle size={12} className="text-destructive" weight="fill" />
                                  Failed
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-semibold">Sub-Agent</label>
                          <Select value={subAgentFilter} onValueChange={(v) => setSubAgentFilter(v as any)}>
                            <SelectTrigger className="h-9 glass-card border-primary/30 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Sub-Agents</SelectItem>
                              {(Object.keys(subAgentConfig) as SubAgentType[]).map((type) => {
                                const config = subAgentConfig[type]
                                const Icon = config.icon
                                return (
                                  <SelectItem key={type} value={type}>
                                    <div className="flex items-center gap-2">
                                      <Icon size={12} className={config.textColor} weight="duotone" />
                                      <span>{config.name}</span>
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {(searchQuery || activeFiltersCount > 0) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <X size={14} className="mr-1" />
                          Clear Filters
                        </Button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {filteredTasks.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-8 text-sm text-muted-foreground"
                      >
                        {searchQuery || activeFiltersCount > 0 ? (
                          <>
                            <MagnifyingGlass size={32} className="mx-auto mb-2 opacity-50" weight="duotone" />
                            <p>No tasks match your filters</p>
                          </>
                        ) : (
                          <p>No active tasks</p>
                        )}
                      </motion.div>
                    ) : (
                      filteredTasks.map((task) => {
                        const config = subAgentConfig[task.subAgentType]
                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            layout
                            className="flex items-center gap-3 p-2 rounded-lg glass-card border border-primary/10"
                          >
                            <div className={cn("w-6 h-6 rounded flex items-center justify-center flex-shrink-0", config.bgColor)}>
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
                            <span className={cn("text-xs flex-shrink-0", getStatusColor(task.status))}>
                              {getStatusIcon(task.status)}
                            </span>
                          </motion.div>
                        )
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            {selectedAgent && (
              <SubAgentAnalytics 
                agent={selectedAgent} 
                historicalData={agentHistoricalData}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  )
}
