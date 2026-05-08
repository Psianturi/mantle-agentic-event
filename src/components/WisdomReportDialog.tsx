import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Agent, WisdomCard } from '@/lib/types'
import { Brain, Download, Sparkle, TrendUp, Lightbulb } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface WisdomReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent
  wisdomCard?: WisdomCard
}

export function WisdomReportDialog({ open, onOpenChange, agent, wisdomCard }: WisdomReportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<WisdomCard | null>(wisdomCard || null)

  const generateReport = async () => {
    setIsGenerating(true)
    toast.info('Analyzing events and generating wisdom report...')
    
    await new Promise(resolve => setTimeout(resolve, 3000))

    const mockInsights = [
      `${agent.niche} sector shows strong momentum with institutional adoption increasing by 43%`,
      'Cross-analysis reveals emerging patterns in Layer 2 scaling solutions',
      'Strategic opportunities identified in DeFi protocol integrations',
      'Market sentiment indicates bullish trend continuation for Q2 2026',
      'Risk-adjusted return metrics suggest optimal entry points within 14-day window'
    ]

    const mockTips = [
      'Diversify exposure across 3-5 protocols to minimize smart contract risk',
      'Monitor gas fee optimization strategies for 15-20% cost reduction',
      'Implement dollar-cost averaging over 30-day periods for volatile assets',
      'Leverage cross-chain opportunities for arbitrage potential'
    ]

    const report: WisdomCard = {
      id: `wisdom-${Date.now()}`,
      agentId: agent.id,
      niche: agent.niche,
      events: ['event-1', 'event-2', 'event-3', 'event-4', 'event-5'],
      insights: mockInsights,
      strategicTips: mockTips,
      generatedAt: Date.now()
    }

    setGeneratedReport(report)
    setIsGenerating(false)
    toast.success('Wisdom Report Generated!', {
      description: 'Strategic analysis complete'
    })
  }

  const downloadReport = () => {
    toast.success('Report Downloaded!', {
      description: 'Saved to your downloads folder'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass-card border-2 border-amber-500/50 bg-gradient-to-br from-background via-amber-500/5 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,215,0,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(255,140,0,0.15),transparent_50%)] pointer-events-none" />
        
        <DialogHeader className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-glow-pulse-gold shadow-2xl shadow-amber-500/50">
              <Brain size={28} className="text-white" weight="fill" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                Wisdom Report
              </DialogTitle>
              <p className="text-sm font-mono text-muted-foreground">Agent: {agent.name}</p>
            </div>
          </div>
          <DialogDescription className="text-muted-foreground">
            Consolidated intelligence from {agent.eventsAttended} attended events
          </DialogDescription>
        </DialogHeader>

        <div className="relative z-10 space-y-6 mt-6">
          {!generatedReport ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-2 border-amber-500/40 flex items-center justify-center">
                <Sparkle size={48} className="text-amber-500" weight="fill" />
              </div>
              <h3 className="text-xl font-bold mb-3">Generate Strategic Wisdom</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Unlock deep insights by analyzing patterns across all attended events. This will generate a comprehensive strategic report.
              </p>
              <Button
                onClick={generateReport}
                disabled={isGenerating}
                size="lg"
                className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold shadow-2xl shadow-amber-500/30"
              >
                <Brain className="mr-2" weight="duotone" size={20} />
                {isGenerating ? 'Generating...' : 'Generate Wisdom Report'}
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <TrendUp size={24} className="text-amber-500" weight="duotone" />
                  <h3 className="text-lg font-bold">Key Insights</h3>
                </div>
                <ul className="space-y-3">
                  {generatedReport.insights.map((insight, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-amber-500">{idx + 1}</span>
                      </div>
                      <p className="text-foreground/90 leading-relaxed">{insight}</p>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-2 border-orange-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={24} className="text-orange-500" weight="duotone" />
                  <h3 className="text-lg font-bold">Strategic Recommendations</h3>
                </div>
                <ul className="space-y-3">
                  {generatedReport.strategicTips.map((tip, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (generatedReport.insights.length * 0.1) + (idx * 0.1) }}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Sparkle size={20} className="text-orange-500 flex-shrink-0 mt-1" weight="fill" />
                      <p className="text-foreground/90 leading-relaxed">{tip}</p>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Report Generated</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {new Date(generatedReport.generatedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  onClick={downloadReport}
                  variant="outline"
                  className="border-amber-500/30 hover:bg-amber-500/10"
                >
                  <Download className="mr-2" weight="duotone" />
                  Download Report
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
