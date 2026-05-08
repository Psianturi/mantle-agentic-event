# Cloud Run API Integration - Implementation Guide

## Overview
This document describes the completed integration between the MAEF frontend and the Cloud Run backend service.

## Components Implemented

### 1. Backend Health Check Modal (`BackendHealthModal.tsx`)
- Displays on app load to verify backend connectivity
- Shows connection status with visual feedback
- Allows retry on failure or continue with mock data
- Auto-closes on successful connection

### 2. Neural Network Background (`NeuralNetworkBackground.tsx`)
- Replaces the sparkle animation with animated particle network
- Particles move and connect when close to each other
- More fitting for an AI/agentic platform theme
- Uses canvas for smooth 60fps animations

### 3. Cloud Run Service (`cloudRunService.ts`)
- Complete API service layer with TypeScript interfaces
- Includes all endpoints:
  - `spawnAgent()` - Create new autonomous agents
  - `assignEvent()` - Send event URL for processing
  - `pollMissionStatus()` - Check real-time progress
  - `generateWisdom()` - Generate strategic insights report
  - `getAgentDetails()` - Fetch agent information
  - `updateAgentInstructions()` - Modify agent behavior
  - `healthCheck()` - Verify backend availability

## API Integration Flow

### Agent Creation Flow
```typescript
// User clicks "Spawn Agent"
const response = await cloudRunService.spawnAgent({
  name: "Alpha Genesis",
  niche: "DeFi",
  personality: "Analytical",
  customInstructions: "Focus on Layer 2 solutions"
})

// Backend returns:
{
  success: true,
  agentId: "agent-123",
  mantleAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  initialBalance: 1.5,
  message: "Agent deployed successfully"
}
```

### Event Attendance Flow
```typescript
// 1. User submits event URL
const assignResponse = await cloudRunService.assignEvent({
  agentId: "agent-123",
  eventUrl: "https://youtube.com/watch?v=example"
})

// Returns taskId for polling
{
  success: true,
  taskId: "task-456",
  status: "queued",
  estimatedDuration: 180
}

// 2. Poll for mission status every 3 seconds
const pollInterval = setInterval(async () => {
  const status = await cloudRunService.pollMissionStatus("task-456")
  
  // Update UI with real-time logs from sub-agents
  status.logs.forEach(log => {
    addLog(log.agentId, log.subAgentType, log.message, log.type)
  })
  
  // Check if completed
  if (status.status === 'completed') {
    clearInterval(pollInterval)
    // Use status.result to create NFT, update agent stats, etc.
  }
}, 3000)
```

### Wisdom Generation Flow
```typescript
// After agent attends 5+ events
const wisdomResponse = await cloudRunService.generateWisdom({
  agentId: "agent-123"
})

// Display comprehensive report
{
  success: true,
  wisdomReport: {
    id: "wisdom-789",
    title: "DeFi Market Analysis Q1 2026",
    executiveSummary: "...",
    insights: [...],
    strategicRecommendations: [...],
    marketTrends: [...],
    riskAssessment: "..."
  }
}
```

## Error Handling

### Timeout Handling
- Default timeout: 55 seconds for most requests
- Event assignment: 120 seconds (longer processing)
- Wisdom generation: 90 seconds (AI-intensive)
- On timeout: Display retry option with graceful fallback

### Network Errors
```typescript
try {
  const result = await cloudRunService.spawnAgent(...)
} catch (error) {
  if (error instanceof CloudRunAPIError) {
    // Structured error with statusCode
    if (error.statusCode === 504) {
      toast.error('Request timeout - agent still processing')
    } else if (error.statusCode === 503) {
      toast.error('Service starting up - retry in 30 seconds')
    }
  } else {
    // Network/connection error
    toast.error('Cannot reach backend service')
  }
}
```

## Environment Configuration

Set these environment variables in `.env`:
```bash
VITE_GCP_BACKEND_URL=https://agentic-event-factory.run.app
VITE_GCP_PROJECT_ID=agentic-event-factory
VITE_MANTLE_NETWORK_RPC=https://rpc.mantle.xyz
VITE_MANTLE_CHAIN_ID=5000
```

## Backend API Endpoints

All endpoints expect JSON and return JSON responses.

### Health Check
```
GET /health
Response: { status: "healthy", version: "1.0.0" }
```

### Spawn Agent
```
POST /api/agents/spawn
Body: { name, niche, personality, customInstructions? }
Response: { success, agentId, mantleAddress, initialBalance, message }
```

### Assign Event
```
POST /api/events/assign
Body: { agentId, eventUrl }
Response: { success, taskId, status, estimatedDuration, message }
```

### Poll Mission Status
```
GET /api/missions/:taskId/status
Response: {
  success,
  taskId,
  status: 'queued' | 'processing' | 'completed' | 'failed',
  progress: 0-100,
  logs: SubAgentLog[],
  result?: { eventId, title, summary, transactionHash, ... }
}
```

### Generate Wisdom
```
POST /api/agents/:agentId/wisdom
Response: { success, wisdomReport: {...} }
```

### Get Agent Details
```
GET /api/agents/:agentId
Response: { success, agent, events, totalGasSpent, totalNFTsMinted }
```

### Update Instructions
```
PATCH /api/agents/:agentId/instructions
Body: { customInstructions }
Response: { success }
```

## UI Integration Points

### App.tsx Changes
1. Added `backendConnected` state to track connection status
2. Added `healthCheckOpen` state for modal visibility
3. Integrated `BackendHealthModal` component
4. Replaced `SparkleBackground` with `NeuralNetworkBackground`
5. Ready for Cloud Run service integration in event handling

### Next Steps for Full Integration
1. Replace mock data initialization with API calls
2. Update `handleAgentCreated` to call `cloudRunService.spawnAgent()`
3. Modify `handleAttendEvent` to use `assignEvent()` and polling
4. Update wisdom generation to call `generateWisdom()`
5. Add error boundaries and retry logic for all API calls

## Testing Checklist
- [ ] Health check modal shows on app load
- [ ] Connection retry works correctly
- [ ] Can continue with mock data if backend unavailable
- [ ] Agent spawn calls backend API
- [ ] Event assignment triggers task queue
- [ ] Polling updates terminal logs in real-time
- [ ] NFT minting uses backend transaction data
- [ ] Wisdom generation works after 5 events
- [ ] Error messages are user-friendly
- [ ] Network failures are handled gracefully

## Performance Considerations
- Polling interval: 3 seconds (configurable)
- Request timeouts prevent hanging
- Cancel polling on component unmount
- Cache agent data to reduce API calls
- Batch NFT metadata uploads when possible

## Security Notes
- No private keys in frontend code
- All sensitive operations happen on backend
- API calls use HTTPS only
- CORS configured for frontend domain
- Rate limiting handled by Cloud Run
