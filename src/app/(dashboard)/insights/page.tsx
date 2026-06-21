'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { RefreshCw, CircleAlert as AlertCircle } from 'lucide-react'
import { AIInsights } from '@/components/analytics/AIInsights'
import type { CampaignAnalysis } from '@/lib/ai-analysis'
import { formatCurrency } from '@/lib/formatters'

const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

export default function InsightsPage() {
  const { currentWorkspace } = useWorkspace()
  const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [datePreset, setDatePreset] = useState(30)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (currentWorkspace && startDate && endDate) {
      loadInsights()
    }
  }, [currentWorkspace, startDate, endDate])

  const loadInsights = async () => {
    if (!currentWorkspace) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        workspace_id: currentWorkspace.id,
        start_date: startDate,
        end_date: endDate,
      })

      const response = await fetch(`/api/insights?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load insights')
      }

      setAnalysis(data.analysis)
      setHasData(data.hasData)
      setMessage(data.message || '')
    } catch (e: any) {
      setError(e.message || 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const handleDatePresetChange = (days: number) => {
    setDatePreset(days)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Insights</h1>
          <p className="text-slate-400 mt-1">
            Automated campaign analysis with actionable recommendations
          </p>
        </div>
        <button
          onClick={loadInsights}
          disabled={loading}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Date Range */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">Analysis period:</span>
          <div className="flex items-center gap-2">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => handleDatePresetChange(preset.days)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  preset.days === datePreset
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* AI Insights */}
      <AIInsights
        analysis={analysis}
        loading={loading}
        hasData={hasData}
        message={message}
      />
    </div>
  )
}
