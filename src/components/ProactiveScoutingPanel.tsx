import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Agent, ScoutLogEntry } from '@/lib/types'
import { MagnifyingGlass, Globe, CheckCircle, ListBullets, Link, Spinner, EnvelopeSimple } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ScoutDecisionTable } from '@/components/ScoutDecisionTable'
import { cloudRunService } from '@/services/cloudRunService'

interface ProactiveScoutingPanelProps {
  agent: Agent
  onToggleScout: (agentId: string, enabled: boolean) => void
  onApproveEvent: (agentId: string, eventId: string) => void
}

export function ProactiveScoutingPanel({ agent, onToggleScout, onApproveEvent }: ProactiveScoutingPanelProps) {
  const canScout = agent.level >= 2
  const isScoutEnabled = agent.autoScoutEnabled && canScout
  const scoutedEvents = agent.scoutedOpportunities || []

  const [showLog, setShowLog] = useState(false)
  const [logs, setLogs] = useState<ScoutLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Luma Connect state
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connectMode, setConnectMode] = useState<'otp' | 'password'>('otp')
  const [connectStep, setConnectStep] = useState<'email' | 'waiting' | 'otp'>('email')
  const [connectEmail, setConnectEmail] = useState('')
  const [connectPassword, setConnectPassword] = useState('')
  const [connectOtp, setConnectOtp] = useState('')
  const [connectSessionId, setConnectSessionId] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectProgress, setConnectProgress] = useState('Starting secure Luma session...')
  const [lumaConnected, setLumaConnected] = useState(agent.lumaConnected ?? false)

  useEffect(() => {
    if (logs.length > 0) return
    setLogsLoading(true)
    cloudRunService.getAgentScoutLogs(agent.id)
      .then(data => setLogs(data))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false))
  }, [agent.id])

  const handleToggle = (enabled: boolean) => {
    if (!canScout) {
      toast.error('Proactive Scouting requires Level 2+')
      return
    }
    onToggleScout(agent.id, enabled)
    if (enabled) {
      toast.success('Proactive Scouting Enabled', {
        description: 'Agent will now scan for relevant events automatically'
      })
    } else {
      toast.info('Proactive Scouting Disabled')
    }
  }

  const handleApprove = (eventId: string) => {
    onApproveEvent(agent.id, eventId)
    toast.success('Event approved! Agent will register automatically.')
  }

  const handleRefreshLog = () => {
    setLogsLoading(true)
    cloudRunService.getAgentScoutLogs(agent.id)
      .then(data => setLogs(data))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false))
  }

  const resetConnectState = () => {
    setConnectEmail('')
    setConnectPassword('')
    setConnectOtp('')
    setConnectSessionId('')
    setConnectStep('email')
    setConnectProgress('Starting secure Luma session...')
  }

  const getConnectProgressMessage = (status: string, email: string, mode: 'otp' | 'password') => {
    switch (status) {
      case 'launching_browser':
        return 'Launching secure browser worker…'
      case 'loading_signin':
        return 'Opening Luma sign-in…'
      case 'submitting_email':
        return mode === 'otp'
          ? `Submitting ${email} and asking Luma to send a code…`
          : `Submitting ${email} and preparing password login…`
      case 'waiting_password':
        return 'Waiting for the password form from Luma…'
      case 'authenticating_password':
        return `Verifying password for ${email}…`
      case 'verifying_otp':
        return 'Verifying your 6-digit code with Luma…'
      case 'capturing_session':
        return 'Login accepted. Capturing session cookies…'
      case 'starting':
      default:
        return mode === 'otp'
          ? `Preparing Luma sign-in for ${email}… this can take 1-4 minutes.`
          : `Connecting ${email}… this can take 1-3 minutes.`
    }
  }

  const pollConnectStatus = async (sessionId: string, mode: 'otp' | 'password') => {
    const deadline = Date.now() + 300_000
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const res = await cloudRunService.lumaConnectStatus(agent.id, sessionId)
        setConnectProgress(getConnectProgressMessage(res.status, connectEmail, mode))
        if (res.status === 'waiting_otp' && mode === 'otp') {
          setConnectStep('otp')
          setConnecting(false)
          toast.info('Code sent!', { description: `Check your inbox at ${connectEmail}` })
          return
        }
        if (res.status === 'connected') {
          setConnecting(false)
          setLumaConnected(true)
          setShowConnectModal(false)
          resetConnectState()
          toast.success('Luma account connected!', {
            description: `${agent.name} can now autonomously RSVP to Luma events.`,
          })
          return
        }
        if (res.status === 'error') {
          toast.error('Connection failed', { description: res.error || 'Unknown error' })
          setConnectStep('email')
          setConnecting(false)
          return
        }
      } catch { /* ignore transient network errors */ }
    }
    toast.error('Timeout', { description: 'Could not reach Luma. Please try again.' })
    setConnectStep('email')
    setConnecting(false)
  }

  const handleStartConnect = async () => {
    if (!connectEmail.trim()) return
    if (connectMode === 'password' && !connectPassword.trim()) return
    setConnecting(true)
    setConnectProgress(getConnectProgressMessage('starting', connectEmail.trim(), connectMode))
    try {
      const res = await cloudRunService.lumaConnectStart(
        agent.id,
        connectEmail.trim(),
        connectMode === 'password' ? connectPassword.trim() : undefined,
      )
      setConnectSessionId(res.session_id)
      setConnectStep('waiting')
      void pollConnectStatus(res.session_id, connectMode)
    } catch (err: unknown) {
      toast.error('Failed to start connection', { description: err instanceof Error ? err.message : 'Unknown error' })
      setConnecting(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!connectOtp.trim() || !connectSessionId) return
    setConnecting(true)
    try {
      await cloudRunService.lumaConnectVerify(agent.id, connectSessionId, connectOtp.trim())
      setLumaConnected(true)
      setShowConnectModal(false)
      resetConnectState()
      toast.success('Luma account connected!', {
        description: `${agent.name} can now autonomously RSVP to Luma events.`,
      })
    } catch (err: unknown) {
      toast.error('Verification failed', { description: err instanceof Error ? err.message : 'Invalid code' })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Card className="glass-card-hover p-5 border-2 border-primary/30">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                <MagnifyingGlass className="text-primary" weight="duotone" size={18} />
              </div>
              <Label htmlFor={`scout-${agent.id}`} className="text-base font-semibold cursor-pointer">
                Proactive Event Scouting
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {canScout
                ? `Auto-scan and recommend events based on: ${agent.customAgenda || agent.niche}`
                : 'Unlock at Level 2 to enable autonomous event discovery'
              }
            </p>
            {!canScout && (
              <Badge variant="outline" className="mt-2 text-xs">
                Requires Level 2+ (Current: Level {agent.level})
              </Badge>
            )}
          </div>
          <Switch
            id={`scout-${agent.id}`}
            checked={isScoutEnabled}
            onCheckedChange={handleToggle}
            disabled={!canScout}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <AnimatePresence>
          {isScoutEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 pt-4 border-t border-border/50"
            >
              {/* Last Auto-Minted */}
              {(() => {
                const lastMint = logs.find(l => l.action === 'MINTED')
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h5 className="text-sm font-semibold">Last Auto-Minted</h5>
                      {logsLoading && <span className="text-xs text-muted-foreground animate-pulse">loading...</span>}
                    </div>
                    {!lastMint ? (
                      <div className="text-center py-4">
                        <MagnifyingGlass size={36} className="mx-auto mb-2 text-muted-foreground opacity-40 animate-pulse" weight="duotone" />
                        <p className="text-xs text-muted-foreground">No autonomous mint yet</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          Next run based on: {agent.customAgenda || agent.niche}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border bg-green-500/5 border-green-500/20 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Globe size={14} className="text-red-500 shrink-0" weight="duotone" />
                          <p className="text-xs font-semibold line-clamp-1 flex-1" title={lastMint.candidateTitle ?? ''}>
                            {lastMint.candidateTitle ?? 'Event'}
                          </p>
                          {lastMint.candidateUrl && (
                            <a href={lastMint.candidateUrl} target="_blank" rel="noopener noreferrer" className="text-primary/50 hover:text-primary shrink-0">
                              <CheckCircle size={14} weight="fill" className="text-green-500" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{new Date(lastMint.runAt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span>Score: {lastMint.score}/{lastMint.thresholdApplied}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-400 border-green-500/30 bg-green-500/10">
                            Minted ✓
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Decision Log toggle */}
              <div className="pt-2 border-t border-border/30">
                <button
                  onClick={() => setShowLog(v => !v)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <ListBullets size={13} weight="duotone" />
                  <span className="font-semibold">Decision Log</span>
                  {logs.length > 0 && !logsLoading && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
                      {logs.length}
                    </Badge>
                  )}
                  <span className="ml-auto text-muted-foreground/50">{showLog ? '▲' : '▼'}</span>
                </button>

                <AnimatePresence>
                  {showLog && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] text-muted-foreground/60">
                          Each Auto Scout decision — mint or skip — is recorded here.
                        </p>
                        <button
                          onClick={handleRefreshLog}
                          className="text-[10px] text-primary/60 hover:text-primary transition-colors"
                        >
                          Refresh
                        </button>
                      </div>
                      <ScoutDecisionTable logs={logs} loading={logsLoading} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Luma Connect ─────────────────────────────────────── */}
        <div className="pt-3 border-t border-border/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Link size={13} className={lumaConnected ? 'text-emerald-400' : 'text-muted-foreground'} weight="bold" />
              <span className="text-xs font-semibold">Luma Account</span>
              {lumaConnected ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  Connected ✓
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  Not connected
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 border-primary/30 hover:border-primary/60"
              onClick={() => setShowConnectModal(v => !v)}
            >
              {lumaConnected ? 'Re-connect' : 'Connect'}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            {lumaConnected
              ? `${agent.name} can autonomously RSVP to Luma events using stored session cookies.`
              : 'Connect your Luma account so this agent can autonomously RSVP to events.'}
          </p>

          <AnimatePresence>
            {showConnectModal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                {connectStep === 'email' && (
                  <>
                    {/* Mode toggle */}
                    <div className="flex gap-1 mb-2">
                      {(['otp', 'password'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setConnectMode(m)}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                            connectMode === m
                              ? 'border-primary/60 bg-primary/10 text-primary'
                              : 'border-border/40 text-muted-foreground/60 hover:text-muted-foreground'
                          }`}
                        >
                          {m === 'otp' ? 'Email code' : 'Password'}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="email"
                      placeholder="you@email.com"
                      value={connectEmail}
                      onChange={e => setConnectEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && connectMode === 'password' && handleStartConnect()}
                      className="h-8 text-xs bg-muted/30 border-border/50 focus:border-primary/50"
                      disabled={connecting}
                    />
                    {connectMode === 'password' && (
                      <Input
                        type="password"
                        placeholder="Your Luma password"
                        value={connectPassword}
                        onChange={e => setConnectPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleStartConnect()}
                        className="h-8 text-xs bg-muted/30 border-border/50 focus:border-primary/50"
                        disabled={connecting}
                      />
                    )}
                    <Button
                      size="sm"
                      onClick={handleStartConnect}
                      disabled={connecting || !connectEmail.trim() || (connectMode === 'password' && !connectPassword.trim())}
                      className="h-8 text-xs w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      {connectMode === 'otp'
                        ? <><EnvelopeSimple size={12} /> Send Code</>
                        : <><CheckCircle size={12} /> Connect</>
                      }
                    </Button>
                    <p className="text-[10px] text-muted-foreground/50">
                      {connectMode === 'otp'
                        ? "We'll send a 6-digit login code to your inbox."
                        : 'Use the password set on your Luma account.'}
                    </p>
                  </>
                )}

                {connectStep === 'waiting' && (
                  <div className="flex items-center gap-2 py-2">
                    <Spinner size={14} className="animate-spin text-emerald-400 shrink-0" />
                    <p className="text-[11px] text-muted-foreground/70">
                      {connectProgress}
                    </p>
                  </div>
                )}

                {connectStep === 'otp' && (
                  <>
                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                      Check <strong className="text-foreground/70">{connectEmail}</strong> for a 6-digit code from Luma.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="123456"
                        maxLength={6}
                        value={connectOtp}
                        onChange={e => setConnectOtp(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                        className="h-8 text-xs font-mono tracking-widest bg-muted/30 border-border/50 focus:border-primary/50"
                        disabled={connecting}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleVerifyOtp}
                        disabled={connecting || connectOtp.length < 6}
                        className="h-8 text-xs px-3 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      >
                        {connecting
                          ? <><Spinner size={12} className="animate-spin" /> Verifying...</>
                          : <><CheckCircle size={12} /> Verify</>
                        }
                      </Button>
                    </div>
                    <button
                      onClick={() => { setConnectStep('email'); setConnectOtp('') }}
                      className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      ← Use a different email
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </Card>
  )
}
