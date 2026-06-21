'use client'

import { useMemo } from 'react'
import { formatNumber, formatCurrency, formatPercent } from '@/lib/formatters'
import {
  getScoreColor,
  getScoreBgColor,
  getGradeColor,
  type HealthGrade,
  type HealthTier,
} from '@/lib/health-score'

interface FactorScore {
  score: number
  value: number | null
  weight: number
  weightedScore: number
  label: string
}

interface CampaignHealthData {
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
}

interface CampaignWithHealth {
  campaign_id: string
  campaign_name: string
  status: string
  effective_status: string | null
  score: number
  grade: HealthGrade
  tier: HealthTier
  factors: CampaignHealthData['factors']
  metrics: CampaignHealthData['metrics']
  dateRange?: { start: string | null; end: string | null }
  insightsCount?: number
}

interface HealthScoreProps {
  scores: CampaignWithHealth[]
  hasData: boolean
  message?: string
  onSaveScore?: (campaignId: string) => void
  saving?: boolean
}

function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const radius = size === 'lg' ? 60 : 40
  const strokeWidth = size === 'lg' ? 10 : 6
  const normalizedScore = Math.min(100, Math.max(0, score))
  const offset = (normalizedScore / 100) * (2 * Math.PI * radius)
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className={`relative ${size === 'lg' ? 'w-36 h-36' : 'w-20 h-20'}`}>
      <svg className="transform -rotate-90" viewBox={`0 0 ${radius * 2 + strokeWidth} ${radius * 2 + strokeWidth}`}>
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700"
        />
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${offset} ${2 * Math.PI * radius - offset}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold ${getScoreColor(score)} ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
          {score}
        </span>
      </div>
    </div>
  )
}

function GradeBadge({ grade }: { grade: HealthGrade }) {
  const colorClass = getGradeColor(grade)

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${colorClass}`}>
      {grade}
    </span>
  )
}

function FactorBar({ factor, format }: { factor: FactorScore; format: 'currency' | 'percent' | 'number' | 'ratio' }) {
  const percentage = factor.score
  const barColor = factor.score >= 80 ? 'bg-emerald-500' : factor.score >= 60 ? 'bg-amber-500' : 'bg-red-500'

  const formatValue = (val: number | null) => {
    if (val === null) return 'N/A'
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percent':
        return formatPercent(val)
      case 'number':
        return val.toFixed(2)
      case 'ratio':
        return val.toFixed(2) + 'x'
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-400">{factor.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-300">{formatValue(factor.value)}</span>
          <span className={`text-xs font-medium ${getScoreColor(factor.score)}`}>
            {factor.score}
          </span>
        </div>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Weight: {(factor.weight * 100).toFixed(0)}%</span>
        <span>Weighted: {factor.weightedScore.toFixed(1)}</span>
      </div>
    </div>
  )
}

function CampaignHealthCard({ campaign, onSaveScore, saving }: { campaign: CampaignWithHealth; onSaveScore?: (id: string) => void; saving?: boolean }) {
  return (
    <div className={`rounded-lg border p-5 ${getScoreBgColor(campaign.score)}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <GradeBadge grade={campaign.grade} />
            <span className="text-slate-400 text-sm">{campaign.tier}</span>
          </div>
          <h3 className="font-semibold text-slate-200 truncate">{campaign.campaign_name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <span className={` inline-flex items-center px-2 py-0.5 rounded text-xs ${
              campaign.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
            }`}>
              {campaign.status}
            </span>
            {campaign.effective_status && (
              <span className="text-slate-600">{campaign.effective_status}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ScoreGauge score={campaign.score} size="lg" />
          {onSaveScore && (
            <button
              onClick={() => onSaveScore(campaign.campaign_id)}
              disabled={saving}
              className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Score'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Spend</span>
            <span className="text-slate-300">{formatCurrency(campaign.metrics.spend)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Impressions</span>
            <span className="text-slate-300">{formatNumber(campaign.metrics.impressions)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Clicks</span>
            <span className="text-slate-300">{formatNumber(campaign.metrics.clicks)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Conversions</span>
            <span className="text-slate-300">{formatNumber(campaign.metrics.conversions)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">ROAS</span>
            <span className="text-slate-300">
              {campaign.metrics.roas !== null ? `${campaign.metrics.roas.toFixed(2)}x` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">CPA</span>
            <span className="text-slate-300">
              {campaign.metrics.cpa !== null ? formatCurrency(campaign.metrics.cpa) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">CTR</span>
            <span className="text-slate-300">
              {campaign.metrics.ctr !== null ? formatPercent(campaign.metrics.ctr) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Conv. Rate</span>
            <span className="text-slate-300">
              {campaign.metrics.conversionRate !== null ? formatPercent(campaign.metrics.conversionRate) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-slate-300">Factor Breakdown</h4>
          <span className="text-xs text-slate-500">Score breakdown by weight</span>
        </div>
        <FactorBar factor={campaign.factors.roas} format="ratio" />
        <FactorBar factor={campaign.factors.cpa} format="currency" />
        <FactorBar factor={campaign.factors.ctr} format="percent" />
        <FactorBar factor={campaign.factors.frequency} format="number" />
        <FactorBar factor={campaign.factors.conversionRate} format="percent" />
      </div>
    </div>
  )
}

export function HealthScore({ scores, hasData, message, onSaveScore, saving }: HealthScoreProps) {
  const summary = useMemo(() => {
    if (!hasData || scores.length === 0) {
      return null
    }

    const total = scores.length
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / total
    const excellentCount = scores.filter(s => s.score >= 80).length
    const poorCount = scores.filter(s => s.score < 60).length

    return {
      total,
      avgScore: Math.round(avgScore),
      excellentCount,
      poorCount,
      healthyPercent: Math.round(((total - poorCount) / total) * 100),
    }
  }, [scores, hasData])

  if (!hasData) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 text-center">
        <div className="text-slate-500 mb-2">
          <svg className="w-16 h-16 mx-auto text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-400">{message || 'No health score data available'}</p>
        <p className="text-slate-500 text-sm mt-2">Sync your campaigns to generate health scores.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="text-sm text-slate-500">Total Campaigns</div>
            <div className="text-2xl font-bold text-slate-200">{summary.total}</div>
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="text-sm text-slate-500">Average Score</div>
            <div className={`text-2xl font-bold ${getScoreColor(summary.avgScore)}`}>
              {summary.avgScore}
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="text-sm text-slate-500">Excellent (80+)</div>
            <div className="text-2xl font-bold text-emerald-500">{summary.excellentCount}</div>
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="text-sm text-slate-500">Health Rate</div>
            <div className="text-2xl font-bold text-blue-500">{summary.healthyPercent}%</div>
          </div>
        </div>
      )}

      {/* Score Distribution */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Score Distribution</h3>
        <div className="flex gap-1 h-8">
          {['A+', 'A', 'B', 'C', 'D', 'F'].map((grade) => {
            const count = scores.filter(s => s.grade === grade).length
            const percent = scores.length > 0 ? (count / scores.length) * 100 : 0
            const colors: Record<string, string> = {
              'A+': 'bg-emerald-500',
              'A': 'bg-emerald-600',
              'B': 'bg-blue-500',
              'C': 'bg-amber-500',
              'D': 'bg-orange-500',
              'F': 'bg-red-500',
            }

            return (
              <div
                key={grade}
                className={`${colors[grade]} rounded flex items-center justify-center text-xs font-medium`}
                style={{ width: `${percent}%`, minWidth: percent > 0 ? '24px' : '0' }}
                title={`${grade}: ${count} campaigns (${percent.toFixed(1)}%)`}
              >
                {percent >= 10 && `${count}`}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          {['A+', 'A', 'B', 'C', 'D', 'F'].map((grade) => (
            <span key={grade}>{grade}</span>
          ))}
        </div>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scores.map((campaign) => (
          <CampaignHealthCard
            key={campaign.campaign_id}
            campaign={campaign}
            onSaveScore={onSaveScore}
            saving={saving}
          />
        ))}
      </div>
    </div>
  )
}
