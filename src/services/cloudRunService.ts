import { Agent, Event, Niche, Personality, SubAgentType } from '@/lib/types'

const GCP_BACKEND_URL = import.meta.env.VITE_GCP_BACKEND_URL || 'https://agentic-event-factory.run.app'
const REQUEST_TIMEOUT = 55000

const ALLOWED_EVENT_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'lu.ma',
  'eventbrite.com',
  'www.eventbrite.com',
  'zoom.us',
]

export function validateEventUrl(url: string): { valid: boolean; error?: string } {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { valid: false, error: 'URL tidak valid. Pastikan format URL lengkap (contoh: https://...)' }
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Hanya URL HTTPS yang diizinkan.' }
  }

  const hostname = parsed.hostname.toLowerCase()
  const isAllowed = ALLOWED_EVENT_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))
  if (!isAllowed) {
    return { valid: false, error: `Domain tidak diizinkan. Platform yang didukung: YouTube, Luma, Eventbrite, Zoom.` }
  }

  return { valid: true }
}

export interface SpawnAgentRequest {
  name: string
  niche: Niche
  personality: Personality
  customInstructions?: string
  userWallet?: string  // Connected MetaMask address (optional, used as owner ref)
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

export interface AttendEventRequest {
  agentId: string
  agentWallet: string
  agentName: string
  eventUrl: string
  eventTitle: string
  platform: string
  niche: string
}

export interface AttendEventResponse {
  success: boolean
  txHash: string
  tokenId: string
  wisdomSummary: string
  gasUsed: string
  blockNumber: number
  explorerUrl: string
  levelUp: boolean
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
  // Guard: only allow calls to our own GCP backend domain
  const parsedUrl = new URL(url)
  const backendHost = new URL(GCP_BACKEND_URL).hostname
  if (parsedUrl.hostname !== backendHost) {
    throw new CloudRunAPIError(`Requests to external host "${parsedUrl.hostname}" are not permitted.`, 403)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // SECURITY: URL is validated against GCP_BACKEND_URL hostname above — SSRF is mitigated
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
      // Backend field names differ from frontend: name→agent_name, userWallet→user_wallet
      const backendPayload = {
        agent_name: request.name,
        niche: request.niche,
        user_wallet: request.userWallet || '0x0000000000000000000000000000000000000001',
      }

      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/api/v1/agent/spawn`,
        {
          method: 'POST',
          body: JSON.stringify(backendPayload),
        }
      )

      const raw = await handleAPIResponse<{
        agent_id: string
        agent_wallet: string
        agent_name: string
        niche: string
        user_wallet: string
        level: number
        total_events: number
        needs_funding: boolean
      }>(response)

      // Map backend snake_case → frontend camelCase
      return {
        success: true,
        agentId: raw.agent_id,
        mantleAddress: raw.agent_wallet,
        initialBalance: 0,
        message: `Agent ${raw.agent_name} spawned on Mantle Network`,
      }
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
    const urlCheck = validateEventUrl(request.eventUrl)
    if (!urlCheck.valid) {
      throw new CloudRunAPIError(urlCheck.error || 'Invalid event URL', 400)
    }

    try {
      // Backend endpoint: /api/v1/event/attend — full agentic flow (AI + mint)
      // Note: backend needs more fields; caller should use attendEvent() instead for full flow
      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/api/v1/event/attend`,
        {
          method: 'POST',
          body: JSON.stringify({
            agent_id: request.agentId,
            agent_wallet: '0x0000000000000000000000000000000000000001', // placeholder
            agent_name: 'Agent',
            event_url: request.eventUrl,
            event_title: 'Event',
            platform: 'YouTube',
            niche: 'General',
          }),
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

  // ── Real backend: AI summary + Mantle NFT mint (Mode A) ──────────────────
  async attendEvent(request: AttendEventRequest): Promise<AttendEventResponse> {
    const urlCheck = validateEventUrl(request.eventUrl)
    if (!urlCheck.valid) {
      throw new CloudRunAPIError(urlCheck.error || 'Invalid event URL', 400)
    }

    try {
      const backendPayload = {
        agent_id: request.agentId,
        agent_wallet: request.agentWallet,
        agent_name: request.agentName,
        event_url: request.eventUrl,
        event_title: request.eventTitle,
        platform: request.platform,
        niche: request.niche,
      }

      const response = await fetchWithTimeout(
        `${GCP_BACKEND_URL}/api/v1/event/attend`,
        { method: 'POST', body: JSON.stringify(backendPayload) },
        90000  // 90s — Gemini + Mantle tx
      )

      const raw = await handleAPIResponse<{
        success: boolean
        tx_hash: string | null
        token_id: string | null
        wisdom_summary: string
        gas_used: string | null
        block_number: number | null
        explorer_url: string | null
        level_up: boolean
      }>(response)

      if (!raw.success) {
        throw new CloudRunAPIError('Backend returned success=false', 500)
      }

      return {
        success: true,
        txHash: raw.tx_hash ?? '',
        tokenId: raw.token_id ?? '?',
        wisdomSummary: raw.wisdom_summary,
        gasUsed: raw.gas_used ?? '0',
        blockNumber: raw.block_number ?? 0,
        explorerUrl: raw.explorer_url ?? `https://explorer.sepolia.mantle.xyz`,
        levelUp: raw.level_up,
      }
    } catch (error) {
      if (error instanceof CloudRunAPIError) throw error
      throw new CloudRunAPIError(
        'Failed to process event attendance',
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
