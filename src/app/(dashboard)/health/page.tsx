'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { HealthScore } from '@/components/analytics/HealthScore'
import { formatDateTime } from '@/lib/formatters'
import type { HealthGrade, HealthTier } from '@/lib/health-score'

const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
  { label: 'Last 90 days', days: 90 },
]

interface FactorScore {
  score: number
  value: number | null
  weight: number
  weightedScore: number
  label: string
}

interface CampaignScore {
  campaign_id: string
  campaign_name: string
  status: string
  effective_status: string | null
  score: number
  grade: HealthGrade
  tier: HealthTier
  factors: {
    roas: FactorScore
    cpa: FactorScore
    ctr: FactorScore
    frequency: FactorScore
    conversionRate: FactorScore
  }
  metrics: {
    roas: number | null
    cpa: number | null
    ctr: number | null
    frequency: number | null
    conversionRate: number | null
    spend: number
    impressions: number
    clicks: number
    conversions: number
    purchaseValue: number
  }
  dateRange?: { start: string | null; end: string | null }
  insightsCount?: number
}

interface HistoricalScore {
  id: string
  campaign_id: string
  score: number
  grade: string
  tier: string
  computed_at: string
}

export default function HealthScorePage() {
  const { currentWorkspace } = useWorkspace()
  const [scores, setScores] = useState<CampaignScore[]>([])
  const [hasData, setHasData] = useState(false)
  const [message, setMessage] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [datePreset, setDatePreset] = useState(30)
  const [generatedAt, setGeneratedAt] = useState<string>()
  const [history, setHistory] = useState<HistoricalScore[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const fetchScores = useCallback(async () => {
    if (!currentWorkspace) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        workspace_id: currentWorkspace.id,
        ...(datePreset > 0 && {
          start_date: new Date(Date.now() - datePreset * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        }),
        include_history: 'true',
      })

      const response = await fetch(`/api/health-score?${params}`)
      const data = await response.json()

      setScores(data.scores || [])
      setHasData(data.hasData)
      setMessage(data.message)
      setGeneratedAt(data.generatedAt)
      setHistory(data.history || [])
    } catch (error) {
      console.error('Error fetching health scores:', error)
      setHasData(false)
      setMessage('Failed to load health scores')
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace, datePreset])

  useEffect(() => {
    fetchScores()
  }, [fetchScores])

  const handleSaveScore = async (campaignId: string) => {
    if (!currentWorkspace) return

    setSaving(true)
    try {
      const response = await fetch('/api/health-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          campaign_ids: [campaignId],
        }),
      })

      const data = await response.json()
      if (data.saved > 0) {
        // Refresh the data
        await fetchScores()
      }
    } catch (error) {
      console.error('Error saving score:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAllScores = async () => {
    if (!currentWorkspace || scores.length === 0) return

    setSaving(true)
    try {
      const response = await fetch('/api/health-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
        }),
      })

      const data = await response.json()
      if (data.saved > 0) {
        await fetchScores()
      }
    } catch (error) {
      console.error('Error saving scores:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Campaign Health Score</h1>
          <p className="text-slate-500 mt-1">Monitor and track campaign performance with weighted scoring</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.days} value={preset.days}>
                {preset.label}
              </option>
            ))}
          </select>
          {hasData && (
            <button
              onClick={handleSaveAllScores}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save All Scores'}
            </button>
          )}
        </div>
      </div>

      {/* Formula Documentation */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
          <h2 className="text-sm font-medium text-slate-300">Score Formula: Weighted Composite (0-100)</h2>
          <span className="text-xs text-blue-400">{showHistory ? 'Hide' : 'View'} Formula</span>
        </div>
        {showHistory && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-2">
            <p><span className="text-slate-300 font-medium">ROAS (30% weight):</span> {'>='} 4.0 = 100, {'>='} 2.0 = 75, {'>='} 1.0 = 50, {'>='} 0.5 = 25</p>
            <p><span className="text-slate-300 font-medium">CPA (25% weight):</span> {'<='} $10 = 100, {'<='} $25 = 75, {'<='} $50 = 50, {'<='} $100 = 25</p>
            <p><span className="text-slate-300 font-medium">CTR (20% weight):</span> {'>='} 2% = 100, {'>='} 1% = 75, {'>='} 0.5% = 50, {'>='} 0.25% = 25</p>
            <p><span className="text-slate-300 font-medium">Frequency (15% weight):</span> Optimal 1.5-3.0 = 100, degraded outside range</p>
            <p><span className="text-slate-300 font-medium">Conv. Rate (10% weight):</span> {'>='} 5% = 100, {'>='} 3% = 75, {'>='} 1.5% = 50, {'>='} 0.5% = 25</p>
            <div className="mt-3 pt-3 border-t border-slate-800">
              <p className="text-slate-300 font-medium">Grade Scale:</p>
              <p className="mt-1">A+ (90-100) Excellent, A (80-89) Very Good, B (70-79) Good, C (60-69) Average, D (50-59) Poor, F (0-49) Critical</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
          <p className="text-slate-400">Calculating health scores...</p>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          <HealthScore
            scores={scores}
            hasData={hasData}
            message={message}
            onSaveScore={handleSaveScore}
            saving={saving}
          />

          {generatedAt && (
            <div className="text-center text-xs text-slate-600">
              Scores generated at {formatDateTime(generatedAt)}
            </div>
          )}

          {/* Historical Scores */}
          {history.length > 0 && (
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Recent Score History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left py-2 px-3">Campaign ID</th>
                      <th className="text-left py-2 px-3">Score</th>
                      <th className="text-left py-2 px-3">Grade</th>
                      <th className="text-left py-2 px-3">Computed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 10).map((h) => (
                      <tr key={h.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-400 font-mono text-xs">{h.campaign_id.slice(0, 8)}...</td>
                        <td className="py-2 px-3">
                          <span className={h.score >= 80 ? 'text-emerald-500' : h.score >= 60 ? 'text-amber-500' : 'text-red-500'}>
                            {h.score}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300">{h.grade}</td>
                        <td className="py-2 px-3 text-slate-500">{formatDateTime(h.computed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
