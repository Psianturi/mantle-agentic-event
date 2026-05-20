import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Agent, ScoutLogEntry } from '@/lib/types'
import { MagnifyingGlass, Globe, CheckCircle, ListBullets, Link, Spinner, Warning } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
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
  const [cookiesJson, setCookiesJson] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [lumaConnected, setLumaConnected] = useState(agent.lumaConnected ?? false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleLumaConnect = async () => {
    let cookies: object[]
    try {
      cookies = JSON.parse(cookiesJson)
      if (!Array.isArray(cookies) || cookies.length === 0) throw new Error('Empty')
    } catch {
      toast.error('Invalid cookies JSON. Paste the full array from luma_cookies_test.json.')
      return
    }
    setConnecting(true)
    try {
      await cloudRunService.lumaConnect(agent.id, cookies)
      setLumaConnected(true)
      setShowConnectModal(false)
      setCookiesJson('')
      toast.success('Luma account connected!', {
        description: `${cookies.length} session cookies stored securely for ${agent.name}.`,
      })
    } catch (err: unknown) {
      toast.error('Connection failed', { description: err instanceof Error ? err.message : 'Unknown error' })
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
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/80 leading-relaxed">
                  <p className="font-semibold mb-1 flex items-center gap-1">
                    <Warning size={12} weight="fill" /> How to connect:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-amber-200/70">
                    <li>Run <code className="bg-amber-500/10 px-1 rounded">python test_luma_rsvp_local.py</code> (CAPTURE step only)</li>
                    <li>Open <code className="bg-amber-500/10 px-1 rounded">backend/luma_cookies_test.json</code></li>
                    <li>Copy the full JSON array and paste below</li>
                  </ol>
                </div>
                <textarea
                  ref={textareaRef}
                  value={cookiesJson}
                  onChange={e => setCookiesJson(e.target.value)}
                  placeholder='[{"name":"__session","value":"...","domain":".lu.ma",...}]'
                  className="w-full h-24 text-[10px] font-mono bg-muted/30 border border-border/50 rounded p-2 resize-none focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/30"
                />
                <Button
                  size="sm"
                  onClick={handleLumaConnect}
                  disabled={connecting || !cookiesJson.trim()}
                  className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {connecting ? (
                    <><Spinner size={12} className="animate-spin mr-1.5" />Encrypting &amp; storing...</>
                  ) : 'Save Cookies to Agent'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </Card>
  )
}
