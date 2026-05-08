# Product Requirements Document: Mantle Agentic Event Factory (MAEF)

A comprehensive SaaS platform that enables users to spawn autonomous AI agents that attend digital events, summarize content, and mint Proof-of-Attendance NFTs on the Mantle Network - transforming information overload into on-chain wisdom.

**Experience Qualities**:
1. **Commanding** - Users should feel like they're operating a sophisticated mission control center, orchestrating autonomous AI agents with precision and authority
2. **Futuristic** - Every interaction should evoke a sense of advanced technology through cybernetic aesthetics, smooth animations, and real-time status updates
3. **Trustworthy** - Despite the complexity, the interface should communicate reliability through clean organization, clear feedback, and transparent agent operations

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a multi-layered platform featuring hierarchical agent management, real-time status monitoring, blockchain integration, AI-powered summarization, and cross-event analysis requiring sophisticated state management and multiple interconnected views.

## Essential Features

### 1. Agent Factory & Spawning System
- **Functionality**: Creates new Parent Agents with unique identities, Mantle wallet addresses, and specialized niches
- **Purpose**: Enables users to build a customized fleet of AI agents tailored to specific information domains
- **Trigger**: User clicks "Spawn New Agent" button in the Factory view
- **Progression**: Click Spawn → Modal opens → Fill form (Name, Personality, Niche) → Birth sequence animation → Mantle address generated → Agent card appears in grid
- **Success criteria**: Agent appears in dashboard with unique wallet address, personality traits visible, and all 4 sub-agents initialized in idle state

### 2. Event Attendance System
- **Functionality**: Assigns agents to attend digital events via URL input, triggering multi-agent workflow coordination
- **Purpose**: Automates event participation, content extraction, and attendance verification across multiple platforms
- **Trigger**: User pastes event URL (YouTube/Luma) and clicks "Attend Event"
- **Progression**: Enter URL → Click Attend → Secretary registers → Scribe extracts content → Social-Lite monitors → Mint-Master prepares NFT → Summary generated → NFT minted
- **Success criteria**: Terminal log shows all sub-agent actions, event counter increments, summary appears in Report Card, NFT minted with transaction hash

### 3. Real-Time Agent Status Dashboard
- **Functionality**: Displays live status of all agents and their sub-agents with visual indicators
- **Purpose**: Provides transparency into agent operations and current task execution
- **Trigger**: Automatic updates when agents perform actions
- **Progression**: Agent starts task → Status changes to Active → Sub-agent indicators glow → Terminal logs update → Task completes → Status returns to Idle
- **Success criteria**: Status updates appear within 1 second, color-coded indicators show agent health, sub-agent breakdown visible on card hover

### 4. Consolidated Wisdom Engine
- **Functionality**: After 5 events in same niche, performs cross-analysis to generate strategic insights
- **Purpose**: Transforms accumulated event data into actionable intelligence and trend analysis
- **Trigger**: 5th event completion in a niche automatically unlocks wisdom panel
- **Progression**: 5th event completes → Unlock animation plays → Wisdom panel glows → Analysis runs → Strategic report card appears → Investment/tech tips displayed
- **Success criteria**: Panel locks until 5 events, glowing unlock animation, consolidated report shows patterns across all 5 events, actionable insights presented

### 5. NFT Vault & Mantle Integration
- **Functionality**: Gallery view of all minted Proof-of-Attendance NFTs with metadata and transaction links
- **Purpose**: Provides on-chain proof of agent activity and creates tradeable digital assets
- **Trigger**: User navigates to NFT Vault section
- **Progression**: Open Vault → Grid displays NFTs → Click NFT → Modal shows metadata → View transaction → Opens Mantle Explorer
- **Success criteria**: All minted NFTs display correctly, metadata includes event details and summary, transaction hashes link to explorer, loading states for pending mints

## Edge Case Handling

- **Invalid Event URLs** - Display inline error with format examples and supported platforms list
- **Agent Spawn Failures** - Show retry option with error details, maintain form data
- **Network Connection Loss** - Queue actions locally, show offline indicator, sync when reconnected
- **Gas Estimation Errors** - Display current Mantle gas price, suggest retry timing, show alternative options
- **Duplicate Event Attendance** - Warn user agent already attended, offer to resend or skip
- **Sub-Agent Timeout** - Show which sub-agent failed, provide manual retry, continue with others
- **Wisdom Panel Edge Cases** - Handle mixed niches (show warning), incomplete event data (mark as partial)
- **Empty States** - Guide new users with example flows, showcase demo agents, provide quick-start tutorials

## Design Direction

The design should evoke the feeling of operating a high-tech command center in a cyberpunk future. Users should feel empowered, like elite operators managing sophisticated AI infrastructure. The aesthetic balances professional credibility (for investors/hackathon judges) with futuristic excitement (for the AI/blockchain community). Every interaction should reinforce the "Agentic Economy" narrative - autonomous systems working on your behalf, creating verifiable on-chain value.

## Color Selection

A bold cybernetic palette that combines deep space blacks with electric neon accents, creating a high-contrast, futuristic mission control aesthetic.

- **Primary Color**: Neon Cyan (oklch(0.85 0.15 200)) - Represents digital energy, blockchain connectivity, and AI intelligence; used for primary actions, agent status indicators, and key highlights
- **Secondary Colors**: 
  - Deep Space (oklch(0.15 0.02 240)) - Main background creating depth
  - Slate Gray (oklch(0.25 0.01 240)) - Card backgrounds with glassmorphism
- **Accent Color**: Electric Purple (oklch(0.65 0.25 300)) - Used for CTAs, NFT elements, unlock animations, and wisdom panel glow
- **Foreground/Background Pairings**: 
  - Deep Space Background (oklch(0.15 0.02 240)): White text (oklch(0.98 0 0)) - Ratio 13.8:1 ✓
  - Slate Cards (oklch(0.25 0.01 240)): Cyan text (oklch(0.85 0.15 200)) - Ratio 8.2:1 ✓
  - Neon Cyan (oklch(0.85 0.15 200)): Dark text (oklch(0.15 0.02 240)) - Ratio 11.5:1 ✓
  - Electric Purple (oklch(0.65 0.25 300)): White text (oklch(0.98 0 0)) - Ratio 5.8:1 ✓

## Font Selection

Typography should communicate technical precision while remaining highly readable - a balance of futuristic monospace for data/terminals and clean sans-serif for content.

- **Typographic Hierarchy**:
  - H1 (Page Titles): Space Grotesk Bold / 36px / tight tracking (-0.02em) - Used for "Agent Factory", "Mission Control"
  - H2 (Section Headers): Space Grotesk SemiBold / 24px / normal tracking - Agent names, panel titles
  - H3 (Sub-headers): Space Grotesk Medium / 18px / slight tracking (0.01em) - Sub-agent labels, card titles
  - Body Text: Inter Regular / 15px / line-height 1.6 - Descriptions, summaries
  - Terminal/Code: JetBrains Mono Regular / 13px / line-height 1.4 - Agent logs, wallet addresses
  - Labels: Inter Medium / 12px / uppercase / tracking 0.05em - Status badges, metadata

## Animations

Animations should reinforce the feeling of intelligent systems at work - purposeful transitions that communicate state changes and guide attention to important events. Use sparingly for maximum impact: Agent spawn "birth sequence" (2s particle effect with glow), status transitions (300ms pulse), terminal log entries (slide in from bottom), wisdom panel unlock (1s golden glow expansion), NFT minting success (confetti + glow). All interactions have 150ms hover feedback with subtle scale/glow.

## Component Selection

- **Components**: 
  - Dialog (Agent spawn modal, NFT detail view)
  - Card (Agent grid items with glassmorphism using backdrop-blur)
  - Badge (Status indicators: Active/Idle/Processing)
  - Button (Primary: Electric Purple with glow, Secondary: Outlined Cyan)
  - Tabs (Dashboard navigation: Overview/Factory/Vault/Settings)
  - Progress (Event counter, 5-event tracker)
  - Scroll Area (Terminal console, agent logs)
  - Tooltip (Sub-agent status on hover)
  - Alert (Success notifications for minting)
  
- **Customizations**: 
  - Custom Terminal component with typewriter effect
  - Holographic card effect using gradients and backdrop-blur
  - Glowing border animations for active agents (using box-shadow keyframes)
  - NFT gallery grid with hover zoom and metadata overlay
  - Collapsible console panel docked at bottom
  
- **States**: 
  - Buttons: Default (solid purple), Hover (glow intensifies + scale 1.05), Active (pressed scale 0.98), Disabled (50% opacity, no glow)
  - Agent Cards: Idle (subtle glow), Active (pulsing cyan border), Processing (animated gradient border), Error (red accent)
  - Input fields: Default (cyan border), Focus (purple glow ring), Error (red border + shake animation), Success (green checkmark)
  
- **Icon Selection**: 
  - Phosphor Icons throughout for consistency
  - Robot (agent representation)
  - Lightning (quick actions, energy)
  - ChartLine (wisdom/analytics)
  - Wallet (blockchain/NFT)
  - Globe (event attendance)
  - Terminal (console logs)
  
- **Spacing**: 
  - Container padding: px-6 py-8
  - Card internal spacing: p-6
  - Grid gaps: gap-6 for agent grid, gap-4 for sub-components
  - Section margins: mb-8 between major sections
  - Consistent use of Tailwind's 4px base unit
  
- **Mobile**: 
  - Single column agent grid on <768px
  - Sidebar collapses to hamburger menu
  - Terminal console becomes modal overlay
  - NFT gallery: 1 column mobile, 2 tablet, 3+ desktop
  - Touch-friendly 44px minimum tap targets
  - Swipe gestures for terminal drawer
