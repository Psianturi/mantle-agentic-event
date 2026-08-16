import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { DataFlowBackground } from '@/components/DataFlowBackground'
import { ChainBadge } from '@/components/ChainBadge'
import { cloudRunService } from '@/services/cloudRunService'
import { getSupportedChains } from '@/lib/blockchain/chains'
import {
  Robot, ArrowRight, Lightning, Brain, Dna, ShieldCheck,
  Signature, Binoculars, Globe, Cube, Pulse,
} from '@phosphor-icons/react'
import maefLogo from '@/assets/maef-logo.png'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlatformMetrics {
  total_agents: number
  total_wisdom_nfts: number
  total_events_attended: number
  average_agent_level: number
}

interface ActivityEntry {
  id: string
  agentName: string
  action: string
  detail: string
  chainId: number
  timestamp: number
}

// ── Lifecycle stages ──────────────────────────────────────────────────────────
const LIFECYCLE_STAGES = [
  {
    icon: Robot,
    label: 'Spawn',
    color: '#00F3FF',
    desc: 'Gets its own wallet, encrypted keys, and gas reserve.',
  },
  {
    icon: Binoculars,
    label: 'Attend',
    color: '#9D00FF',
    desc: 'Joins events autonomously — YouTube, Luma, webinars.',
  },
  {
    icon: Brain,
    label: 'Learn',
    color: '#00F3FF',
    desc: 'Gemini distills events into structured wisdom summaries.',
  },
  {
    icon: Signature,
    label: 'Mint',
    color: '#9D00FF',
    desc: 'Self-signs a Proof-of-Attendance NFT. Permanent on-chain proof.',
  },
]

// ── Pillars ───────────────────────────────────────────────────────────────────
const PILLARS = [
  {
    icon: ShieldCheck,
    color: '#00F3FF',
    title: 'Agents that own their wallet',
    desc: 'Every agent gets its own cryptographic identity, encrypted private keys, and gas reserve. It signs transactions — not you.',
  },
  {
    icon: Cube,
    color: '#9D00FF',
    title: 'Knowledge that is permanent',
    desc: 'Each attended event becomes a verifiable on-chain NFT. The wisdom is immutable, ownable, and linked to the agent forever.',
  },
  {
    icon: Dna,
    color: '#00F3FF',
    title: 'Intelligence that evolves',
    desc: 'Agents level up, unlock strategic proposals, and can breed to produce offspring that inherit wisdom from both parents.',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const supportedChains = getSupportedChains()

  // Fetch metrics
  useEffect(() => {
    cloudRunService.getPublicMetrics()
      .then(d => setMetrics(d))
      .catch(() => {})
  }, [])

  // Fetch real activity (recent mints from featured wisdom endpoint)
  useEffect(() => {
    let cancelled = false

    async function loadActivity() {
      try {
        const wisdom = await cloudRunService.getPublicFeaturedWisdom()
        if (cancelled) return

        const activity: ActivityEntry[] = wisdom.slice(0, 6).map((w, i) => ({
          id: `act-${w.agentId}-${i}`,
          agentName: w.agentName,
          action: 'minted',
          detail: `Minted Proof-of-Attendance for "${w.eventTitle}"`,
          chainId: w.chainId ?? 5003,
          timestamp: w.attendedAt * 1000,
        }))

        setActivity(activity)
        setActivityLoading(false)
      } catch {
        setActivityLoading(false)
      }
    }

    loadActivity()
    return () => { cancelled = true }
  }, [])

  const formatRelativeTime = useCallback((timestamp: number) => {
    const diff = Date.now() - timestamp
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0b1a] text-slate-100">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <DataFlowBackground variant="dark" />
      </div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-transparent via-[#0a0b1a]/40 to-[#0a0b1a]" />

      <div className="relative z-10">
        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav className="border-b border-cyan-500/10 bg-[#0a0b1a]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={maefLogo} alt="ASAJU AI" className="h-9 w-auto object-contain" />
              <div>
                <span className="text-sm font-black tracking-widest text-cyan-300">ASAJU AI</span>
                <p className="text-[9px] text-slate-500 font-mono hidden sm:block leading-none mt-0.5">Autonomous Agent Intelligence</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:opacity-90 font-semibold shadow-lg shadow-cyan-500/20 h-9 px-5 text-sm text-white border border-cyan-400/30"
            >
              Launch App
              <ArrowRight className="ml-1.5" size={14} weight="bold" />
            </Button>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative max-w-screen-xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Chain badges */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {supportedChains.map(chain => (
                <ChainBadge key={chain.chainId} chainId={chain.chainId} />
              ))}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
              <span className="text-white">Autonomous agents</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                that live on-chain
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
              Spawn AI agents with their own wallets, gas reserves, and cryptographic identity.
              They attend events, learn from what they watch, and mint permanent proof of attendance —
              all signed by themselves.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:opacity-90 font-bold px-10 shadow-xl shadow-cyan-500/30 text-base text-white border border-cyan-400/40 h-12"
              >
                <Robot className="mr-2" weight="duotone" size={22} />
                Spawn Your First Agent
                <ArrowRight className="ml-2" size={18} weight="bold" />
              </Button>
              <a
                href="#lifecycle"
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
              >
                See how it works
                <ArrowRight size={13} />
              </a>
            </div>

            {/* Live metrics — terminal style */}
            {metrics && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-cyan-500/20 bg-[#0a0b1a]/80 backdrop-blur-md font-mono"
              >
                <span className="text-[9px] uppercase tracking-widest text-amber-400/80 border border-amber-500/30 px-1.5 py-0.5 rounded">Testnet</span>
                <div className="flex items-center gap-6 sm:gap-8">
                  {[
                    { label: 'agents', value: metrics.total_agents },
                    { label: 'wisdom NFTs', value: metrics.total_wisdom_nfts },
                    { label: 'avg level', value: metrics.average_agent_level.toFixed(1) },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-lg sm:text-xl font-black text-cyan-300">{value}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* ── Agent Lifecycle ──────────────────────────────────────────────── */}
        <section id="lifecycle" className="max-w-screen-xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
          <div className="text-center mb-14">
            <p className="text-xs font-mono uppercase tracking-widest text-cyan-400/60 mb-3">Agent Lifecycle</p>
            <h2 className="text-2xl sm:text-4xl font-black mb-3 text-white">
              From spawn to sovereign
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Each agent is born with autonomy. It acts on its own behalf — not as a relay, but as a sovereign participant.
            </p>
          </div>

          {/* Lifecycle loop — horizontal on desktop, vertical on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-2 relative">
            {LIFECYCLE_STAGES.map((stage, i) => (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative"
              >
                <div className="p-6 rounded-2xl border border-cyan-500/15 bg-[#0f1124]/60 backdrop-blur-sm h-full flex flex-col items-center text-center gap-3 hover:border-cyan-400/40 transition-all group">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center border"
                    style={{
                      borderColor: `${stage.color}40`,
                      background: `${stage.color}10`,
                      boxShadow: `0 0 20px ${stage.color}20`,
                    }}
                  >
                    <stage.icon size={28} style={{ color: stage.color }} weight="duotone" />
                  </div>
                  <h3 className="text-base font-bold text-white">{stage.label}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{stage.desc}</p>
                </div>

                {/* Arrow between stages */}
                {i < LIFECYCLE_STAGES.length - 1 && (
                  <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-4">
                    <ArrowRight className="text-cyan-500/40" size={18} weight="bold" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Loop-back indicator */}
          <div className="hidden md:flex items-center justify-center mt-6 gap-2 text-[10px] font-mono text-slate-600">
            <span className="w-8 h-px bg-cyan-500/20" />
            <span>repeats autonomously</span>
            <span className="w-8 h-px bg-cyan-500/20" />
          </div>
        </section>

        {/* ── Recent Activity Terminal ─────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">Recent on-chain activity</h2>
            <p className="text-sm text-slate-400">Verified mints from the ASAJU network on testnet.</p>
          </div>

          {/* Terminal feed */}
          <div
            ref={scrollRef}
            className="max-w-2xl mx-auto rounded-2xl border border-cyan-500/15 bg-[#08091a]/90 backdrop-blur-md overflow-hidden font-mono"
          >
            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-500/10 bg-[#0d0f25]/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-[10px] text-slate-600">asaju://activity-feed</span>
            </div>

            {/* Feed entries */}
            <div className="p-4 space-y-2 min-h-[280px]">
              {activityLoading ? (
                // Skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                    <div className="h-3 bg-slate-800 rounded w-full" />
                  </div>
                ))
              ) : activity.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs">
                  <Pulse size={32} className="mx-auto mb-3 text-slate-700" weight="duotone" />
                  No verified mints yet — be the first to spawn an agent.
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {activity.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-start gap-3 text-xs leading-relaxed"
                    >
                      {/* Action dot */}
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-emerald-400" />
                      {/* Timestamp */}
                      <span className="text-slate-600 text-[10px] mt-0.5 flex-shrink-0 w-16">
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                      {/* Content */}
                      <span className="text-slate-300 flex-1">
                        <span className="text-cyan-400 font-semibold">{entry.agentName}</span>
                        {' '}
                        <span className="text-slate-500">{entry.action}</span>
                        {' '}
                        <span className="text-slate-400">{entry.detail}</span>
                      </span>
                      {/* Chain badge — real chain from backend */}
                      <ChainBadge chainId={entry.chainId} showName={false} className="mt-0.5" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Terminal footer */}
            <div className="px-4 py-2 border-t border-cyan-500/10 bg-[#0d0f25]/60 flex items-center justify-between text-[9px] font-mono text-slate-600">
              <span>{activity.length} verified mint{activity.length !== 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                on-chain
              </span>
            </div>
          </div>
        </section>

        {/* ── Why On-Chain (3 Pillars) ─────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-xs font-mono uppercase tracking-widest text-violet-400/60 mb-3">Why On-Chain</p>
            <h2 className="text-2xl sm:text-4xl font-black mb-3 text-white">
              Not just AI. Sovereign AI.
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Most AI agents live in a database. Yours live on a blockchain — with all the rights and permanence that brings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PILLARS.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative p-7 rounded-2xl border bg-[#0f1124]/60 backdrop-blur-sm overflow-hidden group hover:border-opacity-60 transition-all"
                style={{ borderColor: `${pillar.color}25` }}
              >
                {/* Glow accent */}
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"
                  style={{ background: pillar.color }}
                />
                <div className="relative z-10">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 border"
                    style={{
                      borderColor: `${pillar.color}40`,
                      background: `${pillar.color}10`,
                    }}
                  >
                    <pillar.icon size={24} style={{ color: pillar.color }} weight="duotone" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{pillar.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{pillar.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-20 pb-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-cyan-500/20 p-10 sm:p-16 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-[#0a0b1a] to-violet-500/10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,243,255,0.08),transparent_70%)]" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl border border-cyan-400/30 flex items-center justify-center bg-cyan-500/10">
                <Robot size={32} className="text-cyan-400" weight="duotone" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-black mb-4 text-white">
                Give your AI a wallet.
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-10 leading-relaxed">
                Connect once, choose a chain, and spawn an agent that attends, learns, and proves — on its own.
              </p>

              {/* Chain selector inline */}
              <div className="flex items-center justify-center gap-3 mb-8">
                {supportedChains.map(chain => (
                  <button
                    key={chain.chainId}
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all hover:scale-105"
                    style={{
                      borderColor: `${chain.color}30`,
                      background: `${chain.color}10`,
                      color: chain.color,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: chain.color }} />
                    {chain.name}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:opacity-90 font-bold px-12 shadow-xl shadow-cyan-500/30 text-base text-white border border-cyan-400/40 h-12"
              >
                <Robot className="mr-2" weight="duotone" size={20} />
                Launch App
                <ArrowRight className="ml-2" size={18} weight="bold" />
              </Button>
            </div>
          </motion.div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-cyan-500/10 bg-[#08091a]/80 py-8">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={maefLogo} alt="ASAJU AI" className="h-7 w-auto object-contain" />
              <span className="text-xs font-bold tracking-widest text-slate-500">ASAJU AI</span>
            </div>

            {/* Contract links — both chains */}
            <div className="flex items-center gap-3 text-[10px] font-mono">
              {supportedChains.map(chain => (
                <a
                  key={chain.chainId}
                  href={`${chain.explorerUrl}/address/${chain.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: chain.color }} />
                  {chain.shortName} contract ↗
                </a>
              ))}
            </div>

            <p className="text-[10px] text-slate-600 font-mono">Testnet · Not financial advice</p>
          </div>
        </footer>
      </div>
    </div>
  )
}