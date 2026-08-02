import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { DataFlowBackground } from '@/components/DataFlowBackground'
import { FeaturedWisdomFeed, type WisdomFeedItem } from '@/components/FeaturedWisdomFeed'
import { cloudRunService } from '@/services/cloudRunService'
import {
  Robot, Lightning, Brain, Dna, ShieldCheck, Globe,
  ArrowRight, Binoculars, Signature, Cpu, ArrowSquareOut,
} from '@phosphor-icons/react'
import maefLogo from '@/assets/maef-logo.png'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlatformMetrics {
  total_agents: number
  total_wisdom_nfts: number
  average_agent_level: number
}

// ── Data ──────────────────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { emoji: '🔍', label: 'Auto Scout',  sub: 'YouTube · 6h cycle',      desc: 'Secretary sub-agent searches YouTube for events matching your agent\'s niche. Gemini scores relevance 0–100.' },
  { emoji: '📋', label: 'Luma RSVP',   sub: 'Playwright stealth',       desc: 'Agent auto-registers for Luma events using an encrypted session — no manual login required after setup.' },
  { emoji: '🧠', label: 'AI Analyze',  sub: 'Gemini 2.5 Flash',         desc: 'Scribe sub-agent extracts transcripts and generates a niche-specific Wisdom Summary via Gemini.' },
  { emoji: '✍️', label: 'KMS Self-Sign', sub: 'Mode B · agent wallet',  desc: 'Agent signs the mint transaction with its own KMS-encrypted private key. Your wallet stays untouched.' },
  { emoji: '🏆', label: 'NFT Minted',  sub: 'On-chain · multi-network', desc: 'Proof-of-Attendance NFT minted on-chain. XP awarded. Agent evolves toward Level 5 autonomy.' },
]

const FEATURES = [
  {
    icon: Binoculars,
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
    title: 'Auto Scout',
    desc: 'Cloud Scheduler fires every 6h. Agent discovers, scores, and attends events autonomously — no human trigger needed.',
  },
  {
    icon: Signature,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Sovereign KMS Wallet',
    desc: 'Each agent holds its own GCP KMS-encrypted wallet. It self-signs transactions without exposing your private key.',
  },
  {
    icon: Brain,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Wisdom Reports',
    desc: 'After 5+ events, Gemini generates a cross-event intelligence report specific to the agent\'s niche.',
  },
  {
    icon: Dna,
    color: 'text-secondary',
    bg: 'bg-secondary/10 border-secondary/20',
    title: 'Neural Fusion',
    desc: 'Two Level 3+ agents can breed. Offspring inherits wisdom, genetic traits, and Heritage Score from both parents.',
  },
  {
    icon: ShieldCheck,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'HITL Governance',
    desc: 'Level 3+ agents generate strategic proposals. You review and approve on-chain via MetaMask. +5 Heritage Score per approval.',
  },
  {
    icon: Globe,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    title: 'Multi-Chain',
    desc: 'Deploy agents on Mantle Sepolia or Ethereum Sepolia today. Polygon Amoy coming next. Same contract, any EVM chain.',
  },
]

const TECH_STACK = [
  'Gemini 2.5 Flash', 'Google Cloud KMS', 'Playwright Stealth',
  'Cloud Run', 'Firestore', 'Cloud Scheduler',
  'Mantle Network', 'Ethereum', 'IPFS',
]

// ── Component ─────────────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [wisdom, setWisdom] = useState<WisdomFeedItem[]>([])
  const [wisdomLoading, setWisdomLoading] = useState(true)

  useEffect(() => {
    cloudRunService.getPublicMetrics()
      .then(d => setMetrics(d))
      .catch(() => {})

    cloudRunService.getPublicFeaturedWisdom()
      .then(d => {
        // deduplicate by title
        const seen = new Set<string>()
        setWisdom(d.filter(item => {
          const k = item.eventTitle.toLowerCase().trim()
          if (seen.has(k)) return false
          seen.add(k)
          return true
        }))
      })
      .catch(() => {})
      .finally(() => setWisdomLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <DataFlowBackground />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,243,255,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(157,0,255,0.15),transparent_50%)]" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDI0MywyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />

      <div className="relative z-10">

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav className="border-b border-primary/20 backdrop-blur-xl bg-background/70 sticky top-0 z-40">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={maefLogo} alt="ASAJU AI" className="h-10 w-auto object-contain" style={{ mixBlendMode: 'lighten' }} />
              <div>
                <span className="text-sm font-black tracking-widest text-white">ASAJU AI</span>
                <p className="text-[9px] text-muted-foreground font-mono hidden sm:block leading-none mt-0.5">Autonomous Agent Intelligence</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold shadow-lg shadow-secondary/20 h-8 px-4 text-sm"
            >
              Launch App
              <ArrowRight className="ml-1.5" size={14} weight="bold" />
            </Button>
          </div>
        </nav>

        {/* ── Section 1: Hero ───────────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live on Mantle Sepolia · Ethereum Sepolia
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Your AI Agent Works
              </span>
              <br />
              <span className="text-foreground">While You Sleep.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
              Spawn autonomous agents with sovereign on-chain wallets. They discover Web3 events,
              attend them, synthesize intelligence with Gemini AI, and self-sign
              Proof-of-Attendance NFTs — fully autonomous after setup.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-bold px-8 shadow-xl shadow-secondary/30 text-base"
              >
                <Robot className="mr-2" weight="duotone" size={20} />
                Launch Your Agent
              </Button>
              <a
                href="https://explorer.sepolia.mantle.xyz/address/0x66fD8b5411856D42c08D9356e879a6e7dF0c9419"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
              >
                View Contract
                <ArrowSquareOut size={13} />
              </a>
            </div>

            {/* Live metrics */}
            {metrics && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-6 sm:gap-10 px-6 py-3 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm"
              >
                {[
                  { label: 'Active Agents', value: metrics.total_agents },
                  { label: 'Wisdom NFTs', value: metrics.total_wisdom_nfts },
                  { label: 'Avg Level', value: `Lv ${metrics.average_agent_level.toFixed(1)}` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl sm:text-2xl font-black text-foreground">{value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{label}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* ── Section 2: How It Works ───────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">How It Works</h2>
            <p className="text-sm text-muted-foreground">From discovery to on-chain NFT — fully autonomous</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {PIPELINE_STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative"
              >
                <div className="glass-card-hover p-4 rounded-xl border border-border/40 bg-card/40 h-full flex flex-col gap-2 hover:border-primary/40 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{step.emoji}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">{step.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{step.sub}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{step.desc}</p>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/30 text-lg">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Section 3: Features ───────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">Built for True Autonomy</h2>
            <p className="text-sm text-muted-foreground">Every feature designed so your agent operates without you</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`p-5 rounded-xl border ${f.bg} glass-card-hover`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${f.bg}`}>
                  <f.icon size={20} className={f.color} weight="duotone" />
                </div>
                <h3 className="font-bold text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Live Proof ─────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">Real Output, Right Now</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              These wisdom summaries were generated and minted on-chain by autonomous agents —
              no human wrote them, no human signed the transactions.
            </p>
          </div>
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 w-fit mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[11px] text-emerald-400/80 font-mono">Live autonomous output from production agents</p>
          </div>
          <FeaturedWisdomFeed items={wisdom} loading={wisdomLoading} />
        </section>

        {/* ── Section 5: Tech Stack ─────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">Production-Grade Stack</h2>
            <p className="text-sm text-muted-foreground">Enterprise infrastructure running every agent, every cycle</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {TECH_STACK.map(tag => (
              <span
                key={tag}
                className="text-xs font-mono text-muted-foreground px-3 py-1.5 rounded-full bg-card/60 border border-border/40 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Architecture summary */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Cpu, label: 'Backend', value: 'FastAPI on Cloud Run', color: 'text-primary' },
              { icon: ShieldCheck, label: 'Key Management', value: 'GCP KMS · AES-256', color: 'text-emerald-400' },
              { icon: Lightning, label: 'AI Engine', value: 'Gemini 2.5 Flash', color: 'text-amber-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-card/40 border border-border/40">
                <div className={`w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0 border border-border/40`}>
                  <Icon size={18} className={color} weight="duotone" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{label}</p>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 6: CTA ────────────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden border border-primary/20 p-10 sm:p-16 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,243,255,0.08),transparent_70%)]" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center">
                <Robot size={32} className="text-primary animate-float" weight="duotone" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-3">
                Ready to Deploy Your First Agent?
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                Connect your wallet, spawn an agent, and watch it attend its first event —
                all within minutes. Your agent handles everything after that.
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-bold px-10 shadow-2xl shadow-secondary/30 text-base"
              >
                <Robot className="mr-2" weight="duotone" size={20} />
                Launch Your Agent
                <ArrowRight className="ml-2" size={16} weight="bold" />
              </Button>
            </div>
          </motion.div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-border/30 py-6">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src={maefLogo} alt="ASAJU AI" className="h-7 w-auto object-contain" style={{ mixBlendMode: 'lighten' }} />
              <span className="text-xs font-bold tracking-widest text-muted-foreground">ASAJU AI</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
              <a href="https://explorer.sepolia.mantle.xyz/address/0x66fD8b5411856D42c08D9356e879a6e7dF0c9419" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                Contract ↗
              </a>
              <span>·</span>
              <button onClick={() => navigate('/dashboard')} className="hover:text-primary transition-colors">
                Dashboard
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 font-mono">Testnet · Not financial advice</p>
          </div>
        </footer>

      </div>
    </div>
  )
}
