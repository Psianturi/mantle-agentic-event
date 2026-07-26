# Multi-Chain UI/UX Design Strategy
**Date**: 2026-07-26  
**Status**: Design Specification  
**Version**: 1.0

## Executive Summary

This document outlines the comprehensive UI/UX strategy for implementing multi-chain support in MAEF (Mantle Agentic Event Factory). The design maintains the existing glassmorphic cyberpunk aesthetic while introducing intuitive chain selection, chain-specific badges, and multi-chain filtering capabilities.

---

## Current UI/UX Analysis

### Existing Design System

**Theme & Aesthetic:**
- **Style**: Dark cyberpunk/futuristic with glassmorphism
- **Color Palette**:
  - Background: `oklch(0.12 0.03 250)` - Deep navy/dark blue
  - Primary (Cyan): `oklch(0.80 0.18 195)` - #00F3FF accent
  - Secondary (Purple): `oklch(0.65 0.28 305)` - Magenta/violet
  - Accent (Purple): `oklch(0.75 0.25 285)` - Light purple
  - Destructive: `oklch(0.58 0.24 25)` - Orange-red
  
**Design Patterns:**
- **Glassmorphic Cards**: `backdrop-filter: blur(24px)` with semi-transparent backgrounds
- **Neon Borders**: Cyan/purple glowing borders for active states
- **Gradient Overlays**: Multi-color gradients (primary → accent → secondary)
- **Animation**: Glow pulse effects, floating elements, shimmer animations

**Typography:**
- Headings: 'Space Grotesk' - Modern geometric sans-serif
- Body: 'Inter' - Clean readable sans-serif
- Code/Mono: 'JetBrains Mono' - Developer-friendly monospace

**Current Wallet States:**

**Pre-Connection State:**
- Single "Connect Wallet" button with gradient background
- Simple, uncluttered hero section

**Post-Connection State:**
- Top bar shows: User wallet address (0xfb6e...d6e5), MNT balance (0.0000 MNT)
- Live status indicator
- Disconnect button
- Full dashboard with agent cards, stats, and event attendance

---

## Multi-Chain Design Requirements

### Supported Chains (Initial Scope)

1. **Mantle Sepolia** (Current - Testnet)
   - Chain ID: 5003
   - Native: MNT
   - Color: Cyan (#00F3FF) - Primary brand color
   
2. **Ethereum Sepolia** (Testnet - NEW)
   - Chain ID: 11155111
   - Native: ETH
   - Color: Purple/Violet (#8B5CF6) - Secondary brand color
   
3. **Polygon Amoy** (Testnet - NEW)
   - Chain ID: 80002
   - Native: MATIC
   - Color: Purple (#8247E5) - Polygon brand
   
4. **Solana Devnet** (Future - Non-EVM)
   - Native: SOL
   - Color: Green/Teal (#14F195) - Solana gradient
   - Note: Requires separate implementation

---

## UI Component Design Specifications

### 1. Chain Selector Component

**Location Options:**
- **Option A (Recommended)**: Top navigation bar, between wallet address and disconnect button
- **Option B**: Inside SpawnAgentDialog as dropdown
- **Option C**: Floating chain switcher (bottom-right corner)

**Design Specification (Option A - Top Bar):**

```tsx
// Visual Design
<ChainSelector>
  <Button className="glass-card border-chain/30 h-10 px-3">
    <ChainIcon /> {/* Dynamic based on selected chain */}
    <span className="text-sm font-semibold">{chainName}</span>
    <ChevronDown size={14} />
  </Button>
  
  <Dropdown>
    {chains.map(chain => (
      <ChainOption
        icon={chain.icon}
        name={chain.name}
        symbol={chain.nativeSymbol}
        color={chain.brandColor}
        isActive={currentChain === chain.id}
        isConnected={wallet.chainId === chain.id}
      />
    ))}
  </Dropdown>
</ChainSelector>
```

**Visual Mockup Description:**

**Closed State:**
- Glassmorphic button with current chain icon + name
- Border color matches chain brand color (e.g., cyan for Mantle)
- Subtle glow effect on hover matching chain color
- Size: 120px width, 40px height

**Open State (Dropdown):**
- Dark glassmorphic panel with backdrop blur
- Each chain option shows:
  - Chain icon (left, 24x24px)
  - Chain name (bold, 14px)
  - Native symbol (muted, 11px)
  - "Connected" badge if wallet is on that network
  - "Switch Network" prompt if wallet needs to change
  - Checkmark icon for currently selected chain
- Hover state: Border + background matching chain color
- Smooth dropdown animation (200ms ease-out)

**Chain Colors & Icons:**
- **Mantle**: Cyan dot/badge (#00F3FF)
- **Ethereum**: Purple/violet badge (#8B5CF6)
- **Polygon**: Purple badge (#8247E5)
- **Solana**: Teal/green badge (#14F195)

---

### 2. Agent Card Multi-Chain Badges

**Design Integration:**

**Badge Placement:**
- Top-right corner of AgentCard, next to status badge
- Small, subtle, doesn't compete with rarity badges

**Visual Specification:**

```tsx
<ChainBadge className="absolute top-2 left-2 z-20">
  <Badge className={cn(
    "text-[9px] font-bold px-2 py-0.5",
    "backdrop-blur-md",
    chainId === 5003 && "bg-cyan-500/20 border-cyan-500/40 text-cyan-400",
    chainId === 11155111 && "bg-purple-500/20 border-purple-500/40 text-purple-400",
    chainId === 80002 && "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-400"
  )}>
    <ChainIcon size={8} className="mr-0.5" />
    {chainSymbol}
  </Badge>
</ChainBadge>
```

**Mockup Description:**
- **Size**: 40px × 18px compact badge
- **Position**: Top-left corner (doesn't conflict with rarity badge on top-right)
- **Style**: Semi-transparent with chain color, subtle border glow
- **Content**: Tiny chain icon + symbol (e.g., "MNT", "ETH", "MATIC")
- **Animation**: Subtle pulse on hover

**Example Visual:**
```
┌─────────────────────────────────┐
│ [MNT] AgentName    [RARE] │ ← Both badges visible
│ Blockchain/DeFi                 │
│ Level 4 · 3 Events             │
└─────────────────────────────────┘
```

---

### 3. Spawn Agent Dialog - Chain Selection

**Design Changes:**

**New Field: Network Selection**
- Position: Between "Information Niche" and Spawn Quota Counter
- Required field (no default, forces user choice)

**Visual Specification:**

```tsx
<div className="space-y-2">
  <Label htmlFor="network">Deployment Network</Label>
  <Select value={selectedChain} onValueChange={setSelectedChain}>
    <SelectTrigger className="border-primary/20 h-12">
      <SelectValue placeholder="Select blockchain network" />
    </SelectTrigger>
    <SelectContent>
      {SUPPORTED_CHAINS.map(chain => (
        <SelectItem value={chain.id} key={chain.id}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              `bg-gradient-to-br from-${chain.color}/20 to-${chain.color}/10`,
              `border border-${chain.color}/30`
            )}>
              <ChainIcon size={16} color={chain.iconColor} />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-sm">{chain.name}</span>
              <span className="text-xs text-muted-foreground">
                {chain.nativeSymbol} · {chain.spawnFee} {chain.nativeSymbol}
              </span>
            </div>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    Agent will be deployed to {selectedChainName} with {spawnFee} {nativeSymbol} initial funding
  </p>
</div>
```

**Mockup Description:**
- **Height**: 48px select dropdown (taller than other fields for prominence)
- **Chain Options**: Each shows icon, name, native symbol, and spawn fee
- **Visual Hierarchy**: Large chain icon (32px) with colored background
- **Helper Text**: Shows selected chain details below dropdown
- **Validation**: Red border if not selected when user tries to spawn

---

### 4. Dashboard Stats - Multi-Chain Aggregation

**Current Stats Display:**
```
4 Active Agents | 27 NFTs Minted | 27 Events Attended | 2 Wisdom Unlocked
```

**Multi-Chain Enhancement:**

**Design Specification:**

```tsx
<StatsGrid className="grid grid-cols-4 gap-4">
  <StatCard>
    <StatValue>4</StatValue>
    <StatLabel>Active Agents</StatLabel>
    <ChainBreakdown>
      <ChainDot color="cyan" /> 2 MNT
      <ChainDot color="purple" /> 1 ETH
      <ChainDot color="fuchsia" /> 1 MATIC
    </ChainBreakdown>
  </StatCard>
  
  <StatCard>
    <StatValue>27</StatValue>
    <StatLabel>NFTs Minted</StatLabel>
    <ChainBreakdown>
      <ChainDot color="cyan" /> 15 MNT
      <ChainDot color="purple" /> 8 ETH
      <ChainDot color="fuchsia" /> 4 MATIC
    </ChainBreakdown>
  </StatCard>
  
  {/* Similar for Events Attended and Wisdom Unlocked */}
</StatsGrid>
```

**Mockup Description:**
- **Main Number**: Large, bold total (no visual change)
- **Chain Breakdown**: Small pills below main stat
  - Size: 12px height mini-pills
  - Colors: Dots match chain brand colors
  - Layout: Horizontal row, left-aligned
  - Font: 10px monospace for numbers
- **Hover Effect**: Expand to show full chain name on hover
- **Animation**: Smooth expand/collapse (150ms)

**Visual Example:**
```
┌──────────────────────┐
│       27             │ ← Large total
│  NFTs Minted         │
│                      │
│ ● 15  ● 8  ● 4      │ ← Colored dots + counts
│  MNT   ETH  MATIC    │
└──────────────────────┘
```

---

### 5. NFT Vault - Chain Filtering

**Current State:**
- Simple grid of NFT cards
- No filtering options

**Multi-Chain Enhancement:**

**Filter Bar Design:**

```tsx
<NFTVaultFilters className="flex items-center gap-3 mb-6">
  <FilterLabel>Filter by Chain:</FilterLabel>
  
  <ChainFilterButtons>
    <ChainFilterButton
      active={filter === 'all'}
      onClick={() => setFilter('all')}
    >
      All Chains ({totalNFTs})
    </ChainFilterButton>
    
    <ChainFilterButton
      active={filter === 'mantle'}
      chainColor="cyan"
      onClick={() => setFilter('mantle')}
    >
      <MantleIcon /> Mantle ({mantleNFTs})
    </ChainFilterButton>
    
    <ChainFilterButton
      active={filter === 'ethereum'}
      chainColor="purple"
      onClick={() => setFilter('ethereum')}
    >
      <EthereumIcon /> Ethereum ({ethNFTs})
    </ChainFilterButton>
    
    <ChainFilterButton
      active={filter === 'polygon'}
      chainColor="fuchsia"
      onClick={() => setFilter('polygon')}
    >
      <PolygonIcon /> Polygon ({polygonNFTs})
    </ChainFilterButton>
  </ChainFilterButtons>
  
  <Separator />
  
  <RarityFilter />
</NFTVaultFilters>
```

**Mockup Description:**
- **Position**: Top of NFT Vault tab, below tab header
- **Layout**: Horizontal pill buttons
- **Active State**: 
  - Solid background with chain color
  - Neon border glow
  - Slightly larger scale (1.05)
- **Inactive State**:
  - Semi-transparent background
  - Muted text color
  - Subtle border
- **Animation**: Smooth filter transition with fade-in/out (300ms)
- **Badge Count**: Shows number of NFTs per chain

**NFT Card Chain Badge:**
- Each NFT card shows small chain badge (bottom-right corner)
- Same style as agent card badges
- Shows on hover or always visible (TBD based on UX testing)

---

### 6. Network Switching Prompts

**Scenario**: User selects Ethereum chain but wallet is connected to Mantle

**Design Specification:**

```tsx
<NetworkMismatchPrompt className="glass-card border-amber-500/40 p-4 mb-6">
  <div className="flex items-start gap-3">
    <WarningCircle size={24} className="text-amber-400" weight="fill" />
    <div className="flex-1">
      <h4 className="font-bold text-amber-400 mb-1">Network Switch Required</h4>
      <p className="text-sm text-muted-foreground mb-3">
        You're viewing Ethereum agents, but your wallet is connected to Mantle Network.
        Switch networks to interact with these agents.
      </p>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSwitchNetwork}
          className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400"
        >
          <ArrowsClockwise className="mr-2" />
          Switch to Ethereum
        </Button>
        <Button
          variant="ghost"
          onClick={() => setSelectedChain('mantle')}
          className="text-muted-foreground"
        >
          View Mantle Agents
        </Button>
      </div>
    </div>
  </div>
</NetworkMismatchPrompt>
```

**Mockup Description:**
- **Style**: Amber/orange warning colors (not destructive red)
- **Position**: Top of agent grid when mismatch detected
- **Animation**: Slide down from top (300ms)
- **Auto-dismiss**: Disappears when networks match
- **Actions**: 
  - Primary: "Switch to [Chain]" button triggers wallet network switch
  - Secondary: "View [CurrentChain] Agents" changes UI filter

---

### 7. Agent Evolution Tree - Multi-Chain Lineage

**Enhancement**: Show cross-chain breeding paths

**Design Specification:**

**Chain Transition Indicator:**
```tsx
<BreedingLine className={cn(
  "breeding-connection",
  parent1.chainId !== offspring.chainId && "cross-chain-line"
)}>
  {parent1.chainId !== offspring.chainId && (
    <ChainTransitionBadge>
      <ChainIcon from={parent1.chainId} size={10} />
      <ArrowRight size={10} />
      <ChainIcon to={offspring.chainId} size={10} />
    </ChainTransitionBadge>
  )}
</BreedingLine>
```

**Mockup Description:**
- **Normal Breeding**: Standard purple dashed line
- **Cross-Chain Breeding**: 
  - Gradient line (from parent chain color → offspring chain color)
  - Small badge in middle showing chain transition
  - Icon: Chain A → Chain B
  - Tooltip: "Cross-chain breeding: Mantle → Ethereum"
- **Visual Style**: More prominent, special effect (shimmer animation)

---

## Color System for Multi-Chain

### Chain-Specific Color Palette

```css
/* Mantle Network */
--chain-mantle-primary: oklch(0.80 0.18 195); /* Cyan #00F3FF */
--chain-mantle-bg: rgba(0, 243, 255, 0.1);
--chain-mantle-border: rgba(0, 243, 255, 0.3);
--chain-mantle-glow: rgba(0, 243, 255, 0.5);

/* Ethereum */
--chain-ethereum-primary: oklch(0.65 0.28 280); /* Purple #8B5CF6 */
--chain-ethereum-bg: rgba(139, 92, 246, 0.1);
--chain-ethereum-border: rgba(139, 92, 246, 0.3);
--chain-ethereum-glow: rgba(139, 92, 246, 0.5);

/* Polygon */
--chain-polygon-primary: oklch(0.60 0.30 300); /* Fuchsia #8247E5 */
--chain-polygon-bg: rgba(130, 71, 229, 0.1);
--chain-polygon-border: rgba(130, 71, 229, 0.3);
--chain-polygon-glow: rgba(130, 71, 229, 0.5);

/* Solana (Future) */
--chain-solana-primary: oklch(0.70 0.20 160); /* Teal #14F195 */
--chain-solana-bg: rgba(20, 241, 149, 0.1);
--chain-solana-border: rgba(20, 241, 149, 0.3);
--chain-solana-glow: rgba(20, 241, 149, 0.5);
```

### Animation Classes

```css
@keyframes glow-pulse-ethereum {
  0%, 100% {
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.4), 0 0 30px rgba(139, 92, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.6), 0 0 50px rgba(139, 92, 246, 0.3);
  }
}

@keyframes glow-pulse-polygon {
  0%, 100% {
    box-shadow: 0 0 15px rgba(130, 71, 229, 0.4), 0 0 30px rgba(130, 71, 229, 0.2);
  }
  50% {
    box-shadow: 0 0 25px rgba(130, 71, 229, 0.6), 0 0 50px rgba(130, 71, 229, 0.3);
  }
}
```

---

## User Experience Flows

### Flow 1: Spawning Multi-Chain Agent

1. User clicks "Spawn Agent" button
2. Dialog opens with standard fields
3. **NEW**: User must select deployment network from dropdown
4. Visual preview shows selected chain icon + estimated costs
5. User fills remaining fields (name, personality, niche)
6. Spawn quota counter shows available slots (chain-agnostic)
7. Click "Register Agent On-chain"
8. If wallet network doesn't match selected chain:
   - Show prompt: "Switch to [Chain] to deploy agent?"
   - Trigger wallet network switch
9. Execute spawn transaction on correct chain
10. Success: Agent card displays with chain badge

### Flow 2: Viewing Multi-Chain Dashboard

1. User connects wallet (e.g., Mantle network)
2. Dashboard shows all agents across all chains
3. Top bar shows current wallet network with chain selector
4. Each agent card displays chain badge
5. Stats show aggregated totals with chain breakdowns
6. User switches chain filter to "Ethereum"
7. Dashboard filters to show only Ethereum agents
8. If wallet network ≠ Ethereum:
   - Show network mismatch prompt
   - User can either switch wallet network or change filter

### Flow 3: Cross-Chain Agent Interaction

1. User views Ethereum agent while wallet is on Mantle
2. Attempts to "Top Up Gas" or "Attend Event"
3. System detects network mismatch
4. Modal appears: "Switch to Ethereum to interact with this agent"
5. User clicks "Switch Network"
6. Wallet prompts network change
7. After switch, transaction proceeds

---

## Implementation Priority

### Phase 1: Core Multi-Chain UI (Week 1-2)
- [ ] Chain selector component (top bar)
- [ ] Chain badges on agent cards
- [ ] Network mismatch prompts
- [ ] Chain selection in SpawnAgentDialog
- [ ] Color system for new chains

### Phase 2: Filtering & Stats (Week 3)
- [ ] NFT Vault chain filtering
- [ ] Dashboard stats chain breakdown
- [ ] Agent list chain filtering
- [ ] Multi-chain search/sort

### Phase 3: Advanced Features (Week 4)
- [ ] Cross-chain breeding UI indicators
- [ ] Chain-specific gas price monitors
- [ ] Multi-chain analytics charts
- [ ] Chain activity heatmap

---

## Accessibility Considerations

- **Color Blindness**: Don't rely solely on color; use icons + text labels
- **Screen Readers**: Add aria-labels for chain badges ("Deployed on Mantle Network")
- **Keyboard Navigation**: Chain selector accessible via Tab + Enter/Space
- **High Contrast**: Ensure 4.5:1 contrast ratio for chain badges
- **Reduced Motion**: Respect prefers-reduced-motion for animations

---

## Design Assets Needed

### Icons
- [ ] Mantle logo (24x24, 16x16, 12x12)
- [ ] Ethereum logo (same sizes)
- [ ] Polygon logo (same sizes)
- [ ] Solana logo (same sizes)
- [ ] Chain switching icon
- [ ] Cross-chain transfer icon

### Mockups
- [ ] Chain selector (closed/open states)
- [ ] Agent card with chain badge
- [ ] Spawn dialog with network selection
- [ ] Network mismatch prompt
- [ ] NFT Vault with filters
- [ ] Stats breakdown tooltip

---

## Testing Checklist

### Visual Testing
- [ ] Chain badges visible at all screen sizes
- [ ] Colors distinguishable for all chains
- [ ] No badge overlap with other UI elements
- [ ] Smooth animations on chain switching
- [ ] Proper glassmorphic blur effects

### Functional Testing
- [ ] Chain selector switches wallet network
- [ ] Filters correctly show/hide agents by chain
- [ ] Network mismatch prompt appears when needed
- [ ] Spawn dialog validates chain selection
- [ ] Stats accurately aggregate multi-chain data

### UX Testing
- [ ] Users understand chain badges
- [ ] Network switching is intuitive
- [ ] No confusion when viewing cross-chain agents
- [ ] Clear feedback during chain operations
- [ ] Accessible to users with disabilities

---

## Conclusion

This multi-chain UI/UX design maintains MAEF's distinctive glassmorphic cyberpunk aesthetic while introducing clear, intuitive multi-chain functionality. The color-coded chain system (cyan for Mantle, purple for Ethereum, fuchsia for Polygon) provides instant visual recognition without cluttering the interface.

Key design principles:
1. **Consistency**: Chain colors used uniformly across all components
2. **Clarity**: Network mismatch prompts prevent user confusion
3. **Flexibility**: Filtering allows users to focus on specific chains
4. **Beauty**: Glassmorphic design maintained throughout
5. **Performance**: Lightweight badges and efficient animations

Next steps: Toggle to ACT MODE to begin implementation of Phase 1 components.
