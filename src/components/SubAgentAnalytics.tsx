import { Card } from '@/components/ui/card'
import { Agent, SubAgentType } from '@/lib/types'
import { User, FileText, ChatCircle, Coin, TrendUp, Clock, CheckCircle, XCircle } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SubAgentAnalyticsProps {
  agent: Agent
  historicalData: SubAgentHistoricalData
}

export interface SubAgentHistoricalData {
  [key: string]: {
    totalTasks: number
    completedTasks: number
    failedTasks: number
    avgDuration: number
    lastActive: number
    successRate: number
    taskHistory: Array<{
      timestamp: number
      taskName: string
      duration: number
      status: 'completed' | 'failed'
    }>
  }
}

const subAgentConfig = {
  secretary: {
    icon: User,
    name: 'Secretary',
    color: 'from-cyan-500 to-blue-500',
    borderColor: 'border-cyan-500/50',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    accentColor: 'text-cyan-500'
  },
  scribe: {
    icon: FileText,
    name: 'Scribe',
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    accentColor: 'text-purple-500'
  },
  'social-lite': {
    icon: ChatCircle,
    name: 'Social-Lite',
    color: 'from-green-500 to-emerald-500',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    accentColor: 'text-green-500'
  },
  'mint-master': {
    icon: Coin,
    name: 'Mint-Master',
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    accentColor: 'text-amber-500'
  }
}

export function SubAgentAnalytics({ agent, historicalData }: SubAgentAnalyticsProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(subAgentConfig) as SubAgentType[]).map((type, index) => {
          const config = subAgentConfig[type]
          const Icon = config.icon
          const data = historicalData[type] || {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            avgDuration: 0,
            lastActive: 0,
            successRate: 0,
            taskHistory: []
          }

          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(
                "glass-card-hover border-2 p-4 relative overflow-hidden group",
                config.borderColor
              )}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500" 
                  style={{ 
                    background: `linear-gradient(to bottom right, ${config.color.split(' ')[1]}, transparent)` 
                  }} 
                />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl border-2 flex items-center justify-center",
                        config.bgColor,
                        config.borderColor
                      )}>
                        <Icon className={config.textColor} weight="duotone" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">{config.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {data.lastActive > 0 ? formatRelativeTime(data.lastActive) : 'Never active'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendUp size={14} weight="duotone" />
                        <span>Success Rate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-bold", config.accentColor)}>
                          {data.successRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full bg-gradient-to-r", config.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${data.successRate}%` }}
                        transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle size={12} weight="fill" className="text-green-500" />
                          <span>Completed</span>
                        </div>
                        <p className="text-xl font-bold">{data.completedTasks}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock size={12} weight="duotone" />
                          <span>Avg Time</span>
                        </div>
                        <p className="text-xl font-bold">{formatDuration(data.avgDuration)}</p>
                      </div>
                    </div>

                    {data.failedTasks > 0 && (
                      <div className="flex items-center gap-2 text-xs text-destructive pt-1">
                        <XCircle size={12} weight="fill" />
                        <span>{data.failedTasks} failed task{data.failedTasks !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card className="glass-card-hover border-primary/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Clock className="text-primary" weight="duotone" size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <p className="text-xs text-muted-foreground">Last 10 completed tasks</p>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {Object.entries(historicalData)
            .flatMap(([type, data]) =>
              data.taskHistory.map(task => ({
                type: type as SubAgentType,
                ...task
              }))
            )
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10)
            .map((task, index) => {
              const config = subAgentConfig[task.type]
              const Icon = config.icon

              return (
                <motion.div
                  key={`${task.type}-${task.timestamp}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg glass-card border border-primary/10 hover:border-primary/30 transition-colors"
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bgColor)}>
                    <Icon className={config.textColor} size={16} weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{task.taskName}</span>
                      {task.status === 'completed' && (
                        <CheckCircle size={14} className="text-green-500" weight="fill" />
                      )}
                      {task.status === 'failed' && (
                        <XCircle size={14} className="text-destructive" weight="fill" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{config.name}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(task.timestamp)}</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {formatDuration(task.duration)}
                  </div>
                </motion.div>
              )
            })}

          {Object.values(historicalData).every(data => data.taskHistory.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock size={32} className="mx-auto mb-2 opacity-50" weight="duotone" />
              <p className="text-sm">No task history yet</p>
              <p className="text-xs mt-1">Tasks will appear here as agents complete them</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
