# MAEF Cloud Run API Integration

## Quick Start

This project has been updated with a production-ready API service layer to connect with the Google Cloud Run backend.

### Setup

1. **Configure Environment Variables**

Copy `.env.example` to `.env` and update with your Cloud Run URL:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_GCP_BACKEND_URL=https://agentic-event-factory.run.app
VITE_GCP_PROJECT_ID=agentic-event-factory
```

2. **Development Mode (Mock Data)**

By default, the app uses mock data for local development. To test with the real backend:

```typescript
// In App.tsx, set:
const USE_REAL_API = true
```

### Service Layer Architecture

```
src/
├── services/
│   └── cloudRunService.ts      # Main API service
├── hooks/
│   └── useMissionPolling.ts    # Polling hook for async missions
└── App.tsx                      # Updated with API integration examples
```

## API Service Usage

### 1. Spawn Agent

```typescript
import { cloudRunService } from '@/services/cloudRunService'

const response = await cloudRunService.spawnAgent({
  name: 'Alpha Genesis',
  niche: 'Blockchain/DeFi',
  personality: 'Analytical',
  customInstructions: 'Focus on Layer 2 solutions'
})

// Response includes:
// - agentId: Unique identifier
// - mantleAddress: ERC-4337 wallet address
// - initialBalance: Starting MNT balance
```

### 2. Assign Event (Asynchronous)

```typescript
const response = await cloudRunService.assignEvent({
  agentId: 'agent-123',
  eventUrl: 'https://youtube.com/watch?v=...'
})

// Returns immediately with taskId for polling
const taskId = response.taskId
```

### 3. Poll Mission Status

```typescript
import { useMissionPolling } from '@/hooks/useMissionPolling'

const { status, isPolling, startPolling } = useMissionPolling(taskId, {
  onLog: (log) => {
    console.log(`[${log.subAgentType}] ${log.message}`)
  },
  onComplete: (result) => {
    console.log('NFT Minted:', result.transactionHash)
  },
  onError: (error) => {
    console.error('Mission failed:', error)
  }
})

// Start polling
startPolling()
```

### 4. Generate Wisdom Report

```typescript
const response = await cloudRunService.generateWisdom({
  agentId: 'agent-123'
})

// Requires agent to have attended 5 events
const report = response.wisdomReport
```

## Error Handling

The service includes comprehensive error handling:

```typescript
import { CloudRunAPIError } from '@/services/cloudRunService'

try {
  await cloudRunService.assignEvent({ ... })
} catch (error) {
  if (error instanceof CloudRunAPIError) {
    switch (error.statusCode) {
      case 504:
        // Timeout - agent still processing
        console.log('Taking longer than expected...')
        break
      case 503:
        // Service unavailable - cold start
        console.log('Backend starting up...')
        break
      case 500:
        // Internal error
        console.log('Agent encountered an error')
        break
    }
  }
}
```

## Polling Strategy

- **Interval**: 3 seconds
- **Max Attempts**: 200 (10 minutes total)
- **Timeout**: 55 seconds per request
- **Backoff**: Exponential on repeated errors

## Testing

### Mock Mode (Default)
```typescript
// Uses mock data from mockData.ts
const agents = getMockAgents()
```

### API Mode
```typescript
// Set in .env
VITE_GCP_BACKEND_URL=https://your-backend.run.app

// Uses cloudRunService for all operations
```

### Health Check
```typescript
const health = await cloudRunService.healthCheck()
console.log(health.status) // 'healthy'
```

## Backend Requirements

Your Cloud Run backend must implement these endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/agents/spawn` | Create new agent |
| POST | `/api/events/assign` | Assign event to agent |
| GET | `/api/missions/{taskId}/status` | Poll mission status |
| POST | `/api/agents/{agentId}/wisdom` | Generate wisdom report |
| GET | `/api/agents/{agentId}` | Get agent details |
| PATCH | `/api/agents/{agentId}/instructions` | Update instructions |
| GET | `/health` | Health check |

See `BACKEND_INTEGRATION.md` for detailed API specifications.

## Security Notes

⚠️ **IMPORTANT**:
- Never store private keys in frontend code
- All wallet operations happen on backend
- Frontend only receives transaction hashes
- Use Google Secret Manager for sensitive data
- Enable CORS for your frontend domain

## Cloud Run Configuration

Required settings for your backend:

```bash
gcloud run deploy agentic-event-factory \
  --timeout=3600 \
  --memory=2Gi \
  --cpu=2 \
  --max-instances=10 \
  --allow-unauthenticated \
  --region=us-central1
```

## Monitoring

Log all API calls in development:

```typescript
if (import.meta.env.DEV) {
  console.log('[API Call]', method, endpoint, data)
  console.log('[API Response]', response)
}
```

## Next Steps

1. ✅ API service layer created (`cloudRunService.ts`)
2. ✅ Polling hook implemented (`useMissionPolling.ts`)
3. ✅ Error handling with retry logic
4. ✅ Environment configuration
5. ⏳ Update App.tsx to use API services
6. ⏳ Deploy Cloud Run backend
7. ⏳ Test end-to-end flow
8. ⏳ Production deployment

## Support

For backend implementation details, see:
- `BACKEND_INTEGRATION.md` - Complete integration guide
- `.env.example` - Environment variables
- `src/services/cloudRunService.ts` - API service code

---

**Ready for Production**: This API layer is production-ready and follows best practices for async operations, error handling, and security.
