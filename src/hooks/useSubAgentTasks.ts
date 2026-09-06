import { useState, useEffect, useCallback } from 'react'
import { SubAgentType } from '@/lib/types'

export interface SubAgentTask {
  id: string
  subAgentType: SubAgentType
  taskName: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  startTime?: number
  duration?: number
}

const taskTemplates: Record<SubAgentType, string[]> = {
  secretary: [
    'Scanning YouTube for new videos',
    'Auto-filling registration form',
    'Verifying access credentials',
    'Scheduling event attendance',
    'Confirming registration',
    'Checking event requirements'
  ],
  scribe: [
    'Extracting audio transcript',
    'Analyzing content structure',
    'Identifying key insights',
    'Generating summary',
    'Processing speaker sentiment',
    'Compiling notes'
  ],
  'social-lite': [
    'Monitoring Telegram channels',
    'Analyzing community sentiment',
    'Tracking Discord discussions',
    'Engaging with members',
    'Checking notifications',
    'Scanning social signals'
  ],
  'mint-master': [
    'Estimating gas fees',
    'Optimizing transaction parameters',
    'Preparing NFT metadata',
    'Calculating mint timing',
    'Validating blockchain state',
    'Preparing contract call'
  ]
}

export function useSubAgentTasks(agentId: string | null, isActive: boolean = false) {
  const [tasks, setTasks] = useState<SubAgentTask[]>([])

  const createTask = useCallback((type: SubAgentType): SubAgentTask => {
    const templates = taskTemplates[type]
    const taskName = templates[Math.floor(Math.random() * templates.length)]
    
    return {
      id: `task-${Date.now()}-${Math.random()}`,
      subAgentType: type,
      taskName,
      status: 'queued',
      progress: 0,
      startTime: Date.now(),
      duration: 2000 + Math.random() * 4000
    }
  }, [])

  const addTasksForWorkflow = useCallback(() => {
    if (!agentId || !isActive) return

    const subAgentTypes: SubAgentType[] = ['secretary', 'scribe', 'social-lite', 'mint-master']
    const newTasks: SubAgentTask[] = []

    subAgentTypes.forEach((type, index) => {
      setTimeout(() => {
        const task = createTask(type)
        setTasks(current => [...current, task])
      }, index * 800)
    })

    return newTasks
  }, [agentId, isActive, createTask])

  useEffect(() => {
    if (!isActive || !agentId) {
      setTasks([])
      return
    }

    const interval = setInterval(() => {
      setTasks(currentTasks => {
        const updatedTasks = currentTasks.map(task => {
          if (task.status === 'queued') {
            return { ...task, status: 'processing' as const, progress: 0 }
          }
          
          if (task.status === 'processing') {
            const elapsed = Date.now() - (task.startTime || 0)
            const duration = task.duration || 3000
            const newProgress = Math.min(100, Math.floor((elapsed / duration) * 100))
            
            if (newProgress >= 100) {
              return { ...task, status: 'completed' as const, progress: 100 }
            }
            
            return { ...task, progress: newProgress }
          }
          
          return task
        })

        return updatedTasks.filter(task => 
          task.status !== 'completed' || 
          (Date.now() - (task.startTime || 0)) < (task.duration || 0) + 2000
        )
      })
    }, 200)

    return () => clearInterval(interval)
  }, [isActive, agentId])

  const startWorkflow = useCallback(() => {
    if (!agentId) return
    addTasksForWorkflow()
  }, [agentId, addTasksForWorkflow])

  const clearTasks = useCallback(() => {
    setTasks([])
  }, [])

  return {
    tasks,
    startWorkflow,
    clearTasks
  }
}
