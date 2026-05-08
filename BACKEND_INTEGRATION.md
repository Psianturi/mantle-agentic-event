# Backend Integration Guide - MAEF API Layer

## Overview

This document details the transition from mock data mode to production-ready API integration with the Google Cloud Run backend service for the Mantle Agentic Event Factory (MAEF).

## Architecture

```
Frontend (React/TypeScript)
    ↓
cloudRunService.ts (API Service Layer)
    ↓
Google Cloud Run (agentic-event-factory)
    ↓
Autonomous Agent Engine (Python/Node.js)
    ↓
[Secretary | Scribe | Social-Lite | Mint-Master]
    ↓
Mantle Network (NFT Minting)
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```env
VITE_GCP_BACKEND_URL=https://agentic-event-factory.run.app
VITE_GCP_PROJECT_ID=agentic-event-factory
VITE_MANTLE_NETWORK_RPC=https://rpc.mantle.xyz
VITE_MANTLE_CHAIN_ID=5000
```

### Cloud Run Configuration

**CRITICAL:** Configure your Cloud Run service with these settings:

1. **Request Timeout**: Set to maximum (60 minutes)
   ```bash
   gcloud run services update agentic-event-factory \
     --timeout=3600 \
     --region=us-central1
   ```

2. **Memory**: Minimum 2GB recommended for AI processing
3. **CPU**: Minimum 2 vCPU
4. **Concurrency**: 80-100 (adjust based on load)

## API Endpoints

### 1. Spawn Agent
**Endpoint**: `POST /api/agents/spawn`

**Request**:
```typescript
{
  name: string
  niche: 'Blockchain/DeFi' | 'Trading/Investment' | 'Technology' | 'Health/Wellness'
  personality: 'Aggressive' | 'Analytical' | 'Creative'
  customInstructions?: string
}
```

**Response**:
```typescript
{
  success: boolean
  agentId: string
  mantleAddress: string  // ERC-4337 wallet address
  initialBalance: number  // Starting MNT balance
  message: string
}
```

**Backend Requirements**:
- Generate secure Mantle wallet (store private key in Secret Manager)
- Initialize agent memory file (MEMORY.md)
- Deploy agent configuration to persistent storage
- Fund wallet with initial gas from treasury

### 2. Assign Event
**Endpoint**: `POST /api/events/assign`

**Request**:
```typescript
{
  agentId: string
  eventUrl: string  // YouTube, Luma, Eventbrite, or Zoom URL
}
```

**Response**:
```typescript
{
  success: boolean
  taskId: string  // UUID for polling
  status: 'queued' | 'processing'
  estimatedDuration: number  // seconds
  message: string
}
```

**Backend Workflow**:
1. Validate agent and URL
2. Create async task queue entry
3. Return taskId immediately (don't wait for completion)
4. Delegate to sub-agents asynchronously:
   - Secretary: Handle registration/access
   - Scribe: Extract and summarize content
   - Social-Lite: Analyze community sentiment
   - Mint-Master: Prepare metadata and mint NFT

### 3. Poll Mission Status
**Endpoint**: `GET /api/missions/{taskId}/status`

**Response**:
```typescript
{
  success: boolean
  taskId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number  // 0-100
  currentPhase: string  // 'registration' | 'transcription' | 'summarization' | 'minting'
  logs: Array<{
    subAgentType: 'secretary' | 'scribe' | 'social-lite' | 'mint-master'
    message: string
    timestamp: number
    type: 'info' | 'success' | 'error' | 'warning'
    status: 'idle' | 'active' | 'processing' | 'completed' | 'error'
  }>
  result?: {
    eventId: string
    eventTitle: string
    platform: 'YouTube' | 'Luma' | 'Eventbrite' | 'Zoom'
    summary: string
    transactionHash: string  // Mantle transaction
    tokenId: string
    gasUsed: number
    metadataURI: string  // IPFS URI
    imageCID: string
    metadataCID: string
  }
}
```

**Polling Strategy**:
- Frontend polls every 3 seconds
- Maximum 200 attempts (10 minutes)
- Exponential backoff on errors
- Graceful degradation if backend unavailable

### 4. Generate Wisdom
**Endpoint**: `POST /api/agents/{agentId}/wisdom`

**Prerequisites**: Agent must have attended exactly 5 events

**Response**:
```typescript
{
  success: boolean
  agentId: string
  wisdomReport: {
    id: string
    title: string
    executiveSummary: string
    eventsAnalyzed: number
    insights: Array<{
      title: string
      description: string
      category: 'strategic' | 'technical' | 'market' | 'risk'
    }>
    strategicRecommendations: string[]
    marketTrends: string[]
    riskAssessment: string
    generatedAt: number
  }
}
```

**Backend AI Logic**:
1. Load all 5 event summaries from agent's MEMORY.md
2. Send to LLM (GPT-4) with consensus analysis prompt
3. Extract cross-event patterns and insights
4. Generate strategic recommendations
5. Store wisdom report in database
6. Return formatted report

## Error Handling

### Timeout Errors (504)
```typescript
if (response.status === 504) {
  // Agent still processing, continue polling
  addLog(agentId, 'system', '[SYSTEM] Agent processing longer than expected. Continuing...')
}
```

### Service Unavailable (503)
```typescript
if (response.status === 503) {
  // Cloud Run cold start
  addLog(agentId, 'system', '[SYSTEM] Backend service starting up. Retrying...')
  // Retry with exponential backoff
}
```

### Internal Server Error (500)
```typescript
if (response.status === 500) {
  addLog(agentId, 'system', '[SYSTEM] Agent encountered an error. Retrying...')
  // Retry up to 3 times, then fail gracefully
}
```

### CAPTCHA Detection
```typescript
// Backend should return this for Luma registration challenges
{
  success: false,
  error: 'CAPTCHA_DETECTED',
  message: 'Manual registration required',
  registrationUrl: 'https://lu.ma/event-link'
}

// Frontend displays manual action modal
```

## Security Considerations

### 1. Secret Management
**DO NOT** store private keys in code or environment variables accessible to frontend.

**Backend Implementation**:
```python
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()
secret_name = f"projects/{project_id}/secrets/agent-{agent_id}-private-key/versions/latest"
response = client.access_secret_version(request={"name": secret_name})
private_key = response.payload.data.decode("UTF-8")
```

### 2. CORS Configuration
Cloud Run backend must allow frontend origin:

```python
# Flask example
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=[
    "https://your-spark-app.github.io",
    "https://maef.vercel.app",
    "http://localhost:5173"  # Development
])
```

### 3. Rate Limiting
Implement rate limiting to prevent abuse:
- Max 10 agent spawns per user per hour
- Max 20 event assignments per agent per day
- Max 5 wisdom generations per agent per week

### 4. Input Validation
Always validate and sanitize:
- URLs (check for valid event platforms)
- Agent names (alphanumeric, max 50 chars)
- Custom instructions (max 500 chars, no SQL/script injection)

## Frontend Integration Points

### App.tsx Updates Required

#### 1. Agent Spawning
```typescript
const handleAgentCreated = async (newAgent: Agent) => {
  try {
    const response = await cloudRunService.spawnAgent({
      name: newAgent.name,
      niche: newAgent.niche,
      personality: newAgent.personality,
      customInstructions: newAgent.customInstructions
    })

    if (response.success) {
      const agent: Agent = {
        id: response.agentId,
        name: newAgent.name,
        personality: newAgent.personality,
        niche: newAgent.niche,
        walletAddress: response.mantleAddress,
        eventsAttended: 0,
        level: 1,
        status: 'idle',
        createdAt: Date.now(),
        subAgents: createSubAgents(),
        wisdomUnlocked: false,
        mantleBalance: response.initialBalance,
        gasSpent: 0
      }

      setAgents((current) => [...(current ?? []), agent])
      toast.success(`Agent "${agent.name}" spawned successfully!`)
    }
  } catch (error) {
    if (error instanceof CloudRunAPIError) {
      toast.error(error.message)
    }
  }
}
```

#### 2. Event Attendance with Polling
```typescript
const handleAttendEvent = async () => {
  if (!eventUrl.trim() || !walletConnected || !agents || agents.length === 0) {
    return
  }

  const agent = agents[0]
  setIsProcessingEvent(true)
  setActiveAgentId(agent.id)

  try {
    // 1. Assign event (async)
    const assignResponse = await cloudRunService.assignEvent({
      agentId: agent.id,
      eventUrl: eventUrl
    })

    if (!assignResponse.success) {
      throw new Error(assignResponse.error)
    }

    setCurrentTaskId(assignResponse.taskId)
    toast.info('Mission assigned to agent. Processing...')

    // 2. Start polling
    startPolling(assignResponse.taskId, {
      onLog: (log) => {
        addLog(agent.id, log.subAgentType, log.message, log.type)
      },
      onComplete: (result) => {
        // Update state with completed mission
        const newEvent: Event = {
          id: result.eventId,
          agentId: agent.id,
          url: eventUrl,
          title: result.eventTitle,
          platform: result.platform,
          date: Date.now(),
          summary: result.summary,
          status: 'completed'
        }

        const newNFT: NFT = {
          id: `nft-${Date.now()}`,
          agentId: agent.id,
          eventId: result.eventId,
          eventTitle: result.eventTitle,
          summary: result.summary,
          date: Date.now(),
          transactionHash: result.transactionHash,
          tokenId: result.tokenId,
          imageUrl: `https://ipfs.io/ipfs/${result.imageCID}`,
          metadataCID: result.metadataCID,
          imageCID: result.imageCID,
          metadataURI: result.metadataURI
        }

        setEvents((current) => [...(current ?? []), newEvent])
        setNFTs((current) => [...(current ?? []), newNFT])
        
        const newEventsAttended = agent.eventsAttended + 1
        setAgents((current) =>
          (current ?? []).map((a) =>
            a.id === agent.id
              ? {
                  ...a,
                  eventsAttended: newEventsAttended,
                  level: Math.floor(newEventsAttended / 2) + 1,
                  wisdomUnlocked: newEventsAttended >= 5,
                  gasSpent: (a.gasSpent || 0) + result.gasUsed,
                  mantleBalance: (a.mantleBalance || 0) - result.gasUsed
                }
              : a
          )
        )

        setEventUrl('')
        setIsProcessingEvent(false)
        setActiveAgentId(null)

        toast.success('Event attendance complete!', {
          description: `NFT minted: ${newNFT.tokenId}`
        })

        // Check for wisdom unlock
        if (newEventsAttended === 5) {
          setTimeout(() => {
            toast.success('🎉 Wisdom Unlocked!', {
              description: 'Generate your Wisdom Report now!',
              duration: 5000
            })
          }, 1000)
        }
      },
      onError: (error) => {
        addLog(agent.id, 'system', `[SYSTEM] ${error}`, 'error')
        toast.error('Mission failed', { description: error })
        setIsProcessingEvent(false)
        setActiveAgentId(null)
      }
    })
  } catch (error) {
    console.error('Event attendance error:', error)
    const errorMessage = error instanceof CloudRunAPIError 
      ? error.message 
      : 'Failed to assign event'
    
    addLog(agent.id, 'system', `[SYSTEM] ${errorMessage}`, 'error')
    toast.error(errorMessage)
    setIsProcessingEvent(false)
    setActiveAgentId(null)
  }
}
```

#### 3. Wisdom Generation
```typescript
const handleOpenWisdomReport = async (agent: Agent) => {
  if (!agent.wisdomUnlocked) {
    toast.error('Wisdom not yet unlocked', {
      description: `Agent needs to attend ${5 - agent.eventsAttended} more event(s)`
    })
    return
  }

  try {
    setIsGeneratingWisdom(true)
    toast.info('Generating wisdom report...')

    const response = await cloudRunService.generateWisdom({
      agentId: agent.id
    })

    if (response.success) {
      setWisdomReport(response.wisdomReport)
      setSelectedAgent(agent)
      setWisdomDialogOpen(true)
      toast.success('Wisdom report generated!')
    }
  } catch (error) {
    console.error('Wisdom generation error:', error)
    const errorMessage = error instanceof CloudRunAPIError
      ? error.message
      : 'Failed to generate wisdom'
    toast.error(errorMessage)
  } finally {
    setIsGeneratingWisdom(false)
  }
}
```

## Testing Strategy

### 1. Development Mode (Mock Data)
Keep existing mock data for local development:
```typescript
const USE_MOCK_DATA = import.meta.env.MODE === 'development' && 
                      !import.meta.env.VITE_GCP_BACKEND_URL

if (USE_MOCK_DATA) {
  // Use existing mock data
} else {
  // Use cloudRunService
}
```

### 2. Staging Environment
Deploy Cloud Run to staging first:
```env
VITE_GCP_BACKEND_URL=https://agentic-event-factory-staging.run.app
```

### 3. Health Check on Load
```typescript
useEffect(() => {
  const checkBackendHealth = async () => {
    try {
      const health = await cloudRunService.healthCheck()
      console.log('Backend status:', health.status)
    } catch (error) {
      console.warn('Backend not available, using offline mode')
      // Fallback to mock data or show warning
    }
  }

  checkBackendHealth()
}, [])
```

## Monitoring & Logging

### Frontend Logging
All API calls should log to console in development:
```typescript
if (import.meta.env.DEV) {
  console.log('[API] Spawn Agent:', request, response)
}
```

### Backend Logging
Use Cloud Logging for structured logs:
```python
import logging
import google.cloud.logging

client = google.cloud.logging.Client()
client.setup_logging()

logging.info('Agent spawned', extra={
    'agent_id': agent_id,
    'mantle_address': address,
    'user_id': user_id
})
```

### Monitoring Dashboard
Track these metrics:
- Average mission completion time
- Success rate per sub-agent
- Gas costs per NFT mint
- Error rate by type
- API latency percentiles

## Next Steps

1. **Backend Development**: Implement the 4 core endpoints in Python/Node.js
2. **Secret Management**: Set up Google Secret Manager for private keys
3. **Deploy to Cloud Run**: Configure with proper timeout and CORS
4. **Frontend Integration**: Replace mock data with cloudRunService calls
5. **Testing**: Comprehensive end-to-end testing
6. **Documentation**: API documentation for backend team
7. **Monitoring**: Set up alerts and dashboards

## Support & Troubleshooting

### Common Issues

**Issue**: "Gateway Timeout"
- **Solution**: Increase Cloud Run timeout, implement async processing

**Issue**: "CORS Error"
- **Solution**: Add frontend origin to Cloud Run CORS config

**Issue**: "Agent lost connection"
- **Solution**: Implement retry logic with exponential backoff

**Issue**: "NFT minting failed"
- **Solution**: Check Mantle RPC health, verify gas balance, retry transaction

---

**Important**: This is a production-ready architecture. DO NOT attempt to run AI agents or manage private keys in the browser. All autonomous logic must remain on the secure backend.
