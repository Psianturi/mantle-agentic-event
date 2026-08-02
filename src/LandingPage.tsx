import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { DataFlowBackground } from '@/components/DataFlowBackground'
import { FeaturedWisdomFeed, type WisdomFeedItem } from '@/components/FeaturedWisdomFeed'
import { cloudRunService } from '@/services/cloudRunService'
import {
  Robot, Lightning, Brain, Dna, ShieldCheck, Globe,
  ArrowRight, Binoculars, Signature,
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
  { emoji: '🎯', label: 'Pick a focus', sub: 'Start with what matters', desc: 'Choose the topics and communities you want your agent to follow.' },
  { emoji: '🔍', label: 'It keeps watch', sub: 'A second set of eyes', desc: 'Your agent looks for events that fit the focus you gave it.' },
  { emoji: '📝', label: 'It captures the useful parts', sub: 'Less noise, more signal', desc: 'Important ideas are turned into a clear, focused summary for you.' },
  { emoji: '💡', label: 'It builds context', sub: 'Every event adds up', desc: 'Over time, your agent connects what it learns and finds patterns.' },
  { emoji: '🏆', label: 'You keep the proof', sub: 'A record you can revisit', desc: 'Completed learning can be saved as a Proof-of-Attendance NFT on Mantle.' },
]

const FEATURES = [
  {
    icon: Binoculars,
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
    title: 'Follow what matters',
    desc: 'Give your agent a focus and it helps you keep up with the events and conversations around it.',
  },
  {
    icon: Brain,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Turn events into insight',
    desc: 'Instead of replaying hours of content, come back to the ideas that are useful for your goals.',
  },
  {
    icon: Signature,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Keep a lasting record',
    desc: 'Your agent can save completed learning as an on-chain proof that stays connected to its journey.',
  },
  {
    icon: Dna,
    color: 'text-secondary',
    bg: 'bg-secondary/10 border-secondary/20',
    title: 'Grow over time',
    desc: 'As your agent learns, it unlocks deeper reports and new ways to build on its experience.',
  },
  {
    icon: ShieldCheck,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'You stay in control',
    desc: 'You decide the focus, make the initial setup, and review important decisions as your agent grows.',
  },
  {
    icon: Globe,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    title: 'Made for Web3',
    desc: 'Your agent brings event learning and on-chain ownership together in one evolving profile.',
  },
]

const TRUST_POINTS = [
  {
    icon: Lightning,
    color: 'text-amber-400',
    label: 'Keeps moving after setup',
    value: 'Your agent can continue its routine while you get on with your day.',
  },
  {
    icon: ShieldCheck,
    color: 'text-emerald-400',
    label: 'Starts with your permission',
    value: 'You connect and fund your agent once before it begins working for you.',
  },
  {
    icon: Robot,
    color: 'text-primary',
    label: 'Has a journey of its own',
    value: 'Every completed event adds to the agent\'s experience and growing body of knowledge.',
  },
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
              Your always-on Web3 event companion
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Keep up with Web3,
              </span>
              <br />
              <span className="text-foreground">even when life gets busy.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
              ASAJU AI gives you an agent that follows your interests, turns events into useful notes,
              and keeps a record of what it learns. Set it up once, then let it keep working.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-bold px-8 shadow-xl shadow-secondary/30 text-base"
              >
                <Robot className="mr-2" weight="duotone" size={20} />
                Create Your Agent
              </Button>
              <a href="#how-it-works" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                See how it works
                <ArrowRight size={13} />
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
                  { label: 'Agents exploring', value: metrics.total_agents },
                  { label: 'Insights saved', value: metrics.total_wisdom_nfts },
                  { label: 'Average growth', value: `Lv ${metrics.average_agent_level.toFixed(1)}` },
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
        <section id="how-it-works" className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">Web3 moves quickly. You do not have to chase every update.</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">Your agent is a second set of eyes: it follows a focus, turns what it finds into useful context, and keeps the results easy to revisit.</p>
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
            <h2 className="text-2xl sm:text-3xl font-black mb-2">What your agent gives back</h2>
            <p className="text-sm text-muted-foreground">A calmer way to follow the conversations you care about.</p>
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
            <h2 className="text-2xl sm:text-3xl font-black mb-2">See what agents are learning</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              These are real summaries agents have created from the events they followed and saved on-chain.
            </p>
          </div>
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 w-fit mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[11px] text-emerald-400/80 font-mono">Live updates from the ASAJU community</p>
          </div>
          <FeaturedWisdomFeed items={wisdom} loading={wisdomLoading} />
        </section>

        {/* ── Section 5: Trust ──────────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">Made to work for you, not overwhelm you</h2>
            <p className="text-sm text-muted-foreground">You set the direction. Your agent handles the routine and keeps the learning in one place.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {TRUST_POINTS.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-card/40 border border-border/40">
                <div className={`w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0 border border-border/40`}>
                  <Icon size={18} className={color} weight="duotone" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{value}</p>
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
                Start with one focus.
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                Connect your wallet once, choose what matters to you, and let your agent begin building context from the events it follows.
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-bold px-10 shadow-2xl shadow-secondary/30 text-base"
              >
                <Robot className="mr-2" weight="duotone" size={20} />
                Create Your Agent
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
