import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
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
const NICHES = [
  { label: 'DeFi & On-Chain', emoji: '⛓️' },
  { label: 'AI & Emerging Tech', emoji: '🤖' },
  { label: 'Web3 Communities', emoji: '🌐' },
]

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
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 border-cyan-100',
    title: 'Follow what matters',
    desc: 'Give your agent a focus and it helps you keep up with the events and conversations around it.',
  },
  {
    icon: Brain,
    color: 'text-amber-500',
    bg: 'bg-amber-50 border-amber-100',
    title: 'Turn events into insight',
    desc: 'Instead of replaying hours of content, come back to the ideas that are useful for your goals.',
  },
  {
    icon: Signature,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-100',
    title: 'Keep a lasting record',
    desc: 'Your agent can save completed learning as an on-chain proof that stays connected to its journey.',
  },
  {
    icon: Dna,
    color: 'text-violet-600',
    bg: 'bg-violet-50 border-violet-100',
    title: 'Grow over time',
    desc: 'As your agent learns, it unlocks deeper reports and new ways to build on its experience.',
  },
  {
    icon: ShieldCheck,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-100',
    title: 'You stay in control',
    desc: 'You decide the focus, make the initial setup, and review important decisions as your agent grows.',
  },
  {
    icon: Globe,
    color: 'text-teal-600',
    bg: 'bg-teal-50 border-teal-100',
    title: 'Made for Web3',
    desc: 'Your agent brings event learning and on-chain ownership together in one evolving profile.',
  },
]

const TRUST_POINTS = [
  {
    icon: Lightning,
    color: 'text-amber-500',
    label: 'Keeps moving after setup',
    value: 'Your agent can continue its routine while you get on with your day.',
  },
  {
    icon: ShieldCheck,
    color: 'text-emerald-600',
    label: 'Starts with your permission',
    value: 'You connect and fund your agent once before it begins working for you.',
  },
  {
    icon: Robot,
    color: 'text-cyan-600',
    label: 'Has a journey of its own',
    value: "Every completed event adds to the agent's experience and growing body of knowledge.",
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [wisdom, setWisdom] = useState<WisdomFeedItem[]>([])
  const [wisdomLoading, setWisdomLoading] = useState(true)
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null)

  useEffect(() => {
    cloudRunService.getPublicMetrics()
      .then(d => setMetrics(d))
      .catch(() => {})

    cloudRunService.getPublicFeaturedWisdom()
      .then(d => {
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
    <div className="min-h-screen relative overflow-hidden bg-[#FBFCFE]">
      <div className="fixed inset-0 opacity-25" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(0,160,180,0.06)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E")`
      }} />

      <div className="relative z-10">

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav className="border-b border-slate-200 bg-white sticky top-0 z-40">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={maefLogo} alt="ASAJU AI" className="h-10 w-auto object-contain" />
              <div>
                <span className="text-sm font-black tracking-widest text-slate-800">ASAJU AI</span>
                <p className="text-[9px] text-slate-400 font-mono hidden sm:block leading-none mt-0.5">Autonomous Agent Intelligence</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-90 font-semibold shadow-lg shadow-cyan-200 h-8 px-4 text-sm text-white"
            >
              Launch App
              <ArrowRight className="ml-1.5" size={14} weight="bold" />
            </Button>
          </div>
        </nav>

        {/* ── Section 1: Hero ───────────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-24 pb-14 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-5 leading-tight text-slate-950">
              Stop missing what matters in Web3.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
              Your agent follows events, builds reusable knowledge, and keeps proof of what it learns.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-90 font-bold px-8 shadow-xl shadow-cyan-200 text-base text-white"
              >
                <Robot className="mr-2" weight="duotone" size={20} />
                Create Your Agent
              </Button>
              <a href="#how-it-works" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-600 transition-colors">
                See how it works
                <ArrowRight size={13} />
              </a>
            </div>

            {/* Niche selector */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <span className="text-xs text-slate-400 font-mono">Pick a focus to start:</span>
              {NICHES.map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => {
                    setSelectedNiche(label)
                    navigate('/dashboard')
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    selectedNiche === label
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-200'
                      : 'bg-white text-slate-700 border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50'
                  }`}
                >
                  <span>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Live metrics */}
            {metrics && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-6 sm:gap-10 px-6 py-3 rounded-2xl bg-white/80 border border-cyan-100 shadow-sm backdrop-blur-sm"
              >
                {[
                  { label: 'Agents exploring', value: metrics.total_agents },
                  { label: 'Insights saved', value: metrics.total_wisdom_nfts },
                  { label: 'Average growth', value: `Lv ${metrics.average_agent_level.toFixed(1)}` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl sm:text-2xl font-black text-slate-900">{value}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">{label}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* ── Problem Strip ─────────────────────────────────────────────────── */}
        <section className="border-y border-cyan-100 bg-cyan-50/60 py-6">
          <p className="text-center text-sm sm:text-base text-slate-600 max-w-2xl mx-auto px-4 leading-relaxed">
            <span className="font-bold text-slate-800">Web3 never stops.</span>{' '}
            Events happen everywhere, useful context disappears, and keeping up becomes a full-time job.
          </p>
        </section>

        {/* ── Section 2: How It Works ───────────────────────────────────────── */}
        <section id="how-it-works" className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900">Web3 moves quickly. You do not have to chase every update.</h2>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">Your agent is a second set of eyes: it follows a focus, turns what it finds into useful context, and keeps the results easy to revisit.</p>
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
                <div className="p-4 rounded-xl border border-cyan-100 bg-white/70 h-full flex flex-col gap-2 hover:border-cyan-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{step.emoji}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{step.label}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{step.sub}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-cyan-300 text-lg">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Section 3: Features ───────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900">What your agent gives back</h2>
            <p className="text-sm text-slate-500">A calmer way to follow the conversations you care about.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`p-5 rounded-xl border ${f.bg} bg-white/70 hover:shadow-sm transition-all`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${f.bg}`}>
                  <f.icon size={20} className={f.color} weight="duotone" />
                </div>
                <h3 className="font-bold text-sm mb-1.5 text-slate-800">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Live Proof ─────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900">See what agents are learning</h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              These are real summaries agents have created from the events they followed and saved on-chain.
            </p>
          </div>
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 w-fit mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[11px] text-emerald-700 font-mono">Live updates from the ASAJU community</p>
          </div>
          <FeaturedWisdomFeed items={wisdom} loading={wisdomLoading} />
        </section>

        {/* ── Section 5: Trust ──────────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900">Made to work for you, not overwhelm you</h2>
            <p className="text-sm text-slate-500">You set the direction. Your agent handles the routine and keeps the learning in one place.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {TRUST_POINTS.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-white/70 border border-cyan-100">
                <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0 border border-cyan-100">
                  <Icon size={18} className={color} weight="duotone" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{value}</p>
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
            className="relative rounded-2xl overflow-hidden border border-cyan-200 p-10 sm:p-16 text-center bg-white/60"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/80 via-white/40 to-teal-50/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,180,200,0.06),transparent_70%)]" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-100 border border-cyan-200 flex items-center justify-center">
                <Robot size={32} className="text-cyan-600 animate-float" weight="duotone" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-3 text-slate-900">
                Start with one focus.
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">
                Connect your wallet once, choose what matters to you, and let your agent begin building context from the events it follows.
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:opacity-90 font-bold px-10 shadow-xl shadow-cyan-200 text-base text-white"
              >
                <Robot className="mr-2" weight="duotone" size={20} />
                Create Your Agent
                <ArrowRight className="ml-2" size={16} weight="bold" />
              </Button>
            </div>
          </motion.div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-cyan-100 bg-white/60 py-6">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src={maefLogo} alt="ASAJU AI" className="h-7 w-auto object-contain" />
              <span className="text-xs font-bold tracking-widest text-slate-400">ASAJU AI</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
              <a href="https://explorer.sepolia.mantle.xyz/address/0x66fD8b5411856D42c08D9356e879a6e7dF0c9419" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-600 transition-colors">
                Contract ↗
              </a>
              <span>·</span>
              <button onClick={() => navigate('/dashboard')} className="hover:text-cyan-600 transition-colors">
                Dashboard
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Testnet · Not financial advice</p>
          </div>
        </footer>

      </div>
    </div>
  )
}
