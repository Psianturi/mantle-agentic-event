import { Agent, Event, Niche, Personality, SubAgentType } from '@/lib/types'

const GCP_BACKEND_URL = import.meta.env.VITE_GCP_BACKEND_URL || 'https://agentic-event-factory.run.app'
const REQUEST_TIMEOUT = 55000

export interface SpawnAgentRequest {
  name: string
  niche: Niche
  personality: Personality
  customInstructions?: string
}

export interface SpawnAgentResponse {
  success: boolean
  agentId: string
  mantleAddress: string
  initialBalance: number
  message: string
  error?: string
}

export interface AssignEventRequest {
  agentId: string
  eventUrl: string
}

export interface AssignEventResponse {
  success: boolean
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  estimatedDuration?: number
  message: string
  error?: string
}

export interface SubAgentLog {
  subAgentType: SubAgentType
  message: string
  timestamp: number
  type: 'info' | 'success' | 'error' | 'warning'
  status: 'idle' | 'active' | 'processing' | 'completed' | 'error'
}

export interface MissionStatusResponse {
  success: boolean
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  currentPhase?: string
  logs: SubAgentLog[]
  result?: {
    eventId: string
    eventTitle: string
    platform: 'YouTube' | 'Luma' | 'Eventbrite' | 'Zoom'
    summary: string
    transactionHash?: string
    tokenId?: string
    gasUsed?: number
    metadataURI?: string
    imageCID?: string
    metadataCID?: string
  }
  error?: string
}

export interface GenerateWisdomRequest {
  agentId: string
}

export interface WisdomInsight {
  title: string
  description: string
  category: 'strategic' | 'technical' | 'market' | 'risk'
}

export interface GenerateWisdomResponse {
  success: boolean
  agentId: string
  wisdomReport: {
    id: string
    title: string
    executiveSummary: string
    eventsAnalyzed: number
    insights: WisdomInsight[]
    strategicRecommendations: string[]
    marketTrends: string[]
    riskAssessment: string
    generatedAt: number
  }
  error?: string
}

export interface AgentDetailsResponse {
  success: boolean
  agent: Agent
  events: Event[]
  totalGasSpent: number
  totalNFTsMinted: number
  error?: string
}

class CloudRunAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'CloudRunAPIError'
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CloudRunAPIError('Request timeout - agent processing may take longer than expected', 408)
    }
    throw error
  }
}

async function handleAPIResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // Ignore JSON parse errors
    }

    if (response.status === 504) {
      throw new CloudRunAPIError('Gateway timeout - the autonomous agent is still processing. Please try polling for status.', 504)
    } else if (response.status === 503) {
      throw new CloudRunAPIError('Service temporarily unavailable - Cloud Run instance may be starting up', 503)
    } else if (response.status === 500) {
      throw new CloudRunAPIError('Internal server error - agent encountered an unexpected issue', 500)
    } else if (response.status === 429) {
      throw new CloudRunAPIError('Too many requests - please wait before retrying', 429)
    }

    throw new CloudRunAPIError(errorMessage, response.status)
  }

  return response.json()
}

export const cloudRunService = {
  async spawnAgent(request: SpawnAgentRequest): Promise<SpawnAgentResponse> {
    try {
      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/api/agents/spawn`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      )

      return handleAPIResponse<SpawnAgentResponse>(response)
    } catch (error) {
      if (error instanceof CloudRunAPIError) {
        throw error
      }
      
      console.error('Error spawning agent:', error)
      throw new CloudRunAPIError(
        'Failed to connect to agent factory',
        undefined,
        error
      )
    }
  },

  async assignEvent(request: AssignEventRequest): Promise<AssignEventResponse> {
    try {
      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/api/events/assign`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
        120000
      )

      return handleAPIResponse<AssignEventResponse>(response)
    } catch (error) {
      if (error instanceof CloudRunAPIError) {
        throw error
      }

      console.error('Error assigning event:', error)
      throw new CloudRunAPIError(
        'Failed to assign event to agent',
        undefined,
        error
      )
    }
  },

  async pollMissionStatus(taskId: string): Promise<MissionStatusResponse> {
    try {
      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/api/missions/${taskId}/status`,
        {
          method: 'GET',
        },
        30000
      )

      return handleAPIResponse<MissionStatusResponse>(response)
    } catch (error) {
      if (error instanceof CloudRunAPIError) {
        throw error
      }

      console.error('Error polling mission status:', error)
      throw new CloudRunAPIError(
        'Failed to retrieve mission status',
        undefined,
        error
      )
    }
  },

  async generateWisdom(request: GenerateWisdomRequest): Promise<GenerateWisdomResponse> {
    try {
      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/api/agents/${request.agentId}/wisdom`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
        90000
      )

      return handleAPIResponse<GenerateWisdomResponse>(response)
    } catch (error) {
      if (error instanceof CloudRunAPIError) {
        throw error
      }

      console.error('Error generating wisdom:', error)
      throw new CloudRunAPIError(
        'Failed to generate wisdom report',
        undefined,
        error
      )
    }
  },

  async getAgentDetails(agentId: string): Promise<AgentDetailsResponse> {
    try {
      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/api/agents/${agentId}`,
        {
          method: 'GET',
        }
      )

      return handleAPIResponse<AgentDetailsResponse>(response)
    } catch (error) {
      if (error instanceof CloudRunAPIError) {
        throw error
      }

      console.error('Error fetching agent details:', error)
      throw new CloudRunAPIError(
        'Failed to fetch agent details',
        undefined,
        error
      )
    }
  },

  async updateAgentInstructions(agentId: string, instructions: string): Promise<{ success: boolean }> {
    try {
      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/api/agents/${agentId}/instructions`,
        {
          method: 'PATCH',
          body: JSON.stringify({ customInstructions: instructions }),
        }
      )

      return handleAPIResponse<{ success: boolean }>(response)
    } catch (error) {
      if (error instanceof CloudRunAPIError) {
        throw error
      }

      console.error('Error updating agent instructions:', error)
      throw new CloudRunAPIError(
        'Failed to update agent instructions',
        undefined,
        error
      )
    }
  },

  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/health`,
        {
          method: 'GET',
        },
        5000
      )

      return handleAPIResponse<{ status: string; version: string }>(response)
    } catch (error) {
      console.error('Health check failed:', error)
      throw new CloudRunAPIError(
        'Backend service is not responding',
        undefined,
        error
      )
    }
  },
}

export { CloudRunAPIError }
