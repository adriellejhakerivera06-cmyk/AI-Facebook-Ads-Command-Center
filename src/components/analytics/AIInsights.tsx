'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, TriangleAlert as AlertTriangle, Lightbulb, Eye, CircleCheck as CheckCircle, Circle as XCircle, ArrowUpRight, ArrowDownRight, ChevronRight, Sparkles, Target, CircleAlert as AlertCircle } from 'lucide-react'
import type { CampaignAnalysis, Insight, InsightCategory } from '@/lib/ai-analysis'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters'

interface AIInsightsProps {
  analysis: CampaignAnalysis | null
  loading?: boolean
  hasData?: boolean
  message?: string
}

const categoryConfig: Record<InsightCategory, {
  icon: any
  color: string
  bgColor: string
  borderColor: string
  label: string
}> = {
  strength: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
    label: 'Strength',
  },
  weakness: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/30',
    label: 'Weakness',
  },
  opportunity: {
    icon: Lightbulb,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
    label: 'Opportunity',
  },
  risk: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    label: 'Risk',
  },
  observation: {
    icon: Eye,
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/30',
    label: 'Observation',
  },
}

const priorityStyles = {
  high: 'ring-2 ring-offset-2 ring-offset-slate-900',
  medium: '',
  low: 'opacity-80',
}

export function AIInsights({ analysis, loading, hasData, message }: AIInsightsProps) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
          <h2 className="text-lg font-bold text-white">AI Analysis</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          <div className="h-32 bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!hasData || !analysis) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">AI Analysis</h2>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">{message || 'No data available for analysis'}</p>
        </div>
      </div>
    )
  }

  const { summary, insights, metrics } = analysis

  // Group insights by category
  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.category]) {
      acc[insight.category] = []
    }
    acc[insight.category].push(insight)
    return acc
  }, {} as Record<InsightCategory, Insight[]>)

  const categoryOrder: InsightCategory[] = ['strength', 'opportunity', 'observation', 'weakness', 'risk']

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">AI Analysis</h2>
        </div>
        <p className="text-slate-300 leading-relaxed">{summary}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniMetric
          label="Total Spend"
          value={formatCurrency(metrics.totalSpend)}
          icon={TrendingUp}
        />
        <MiniMetric
          label="Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          icon={Target}
        />
        <MiniMetric
          label="Avg ROAS"
          value={`${metrics.avgRoas.toFixed(2)}x`}
          icon={ArrowUpRight}
          highlight={metrics.avgRoas >= 2}
        />
        <MiniMetric
          label="Conversions"
          value={formatNumber(metrics.totalConversions)}
          icon={CheckCircle}
        />
      </div>

      {/* Top Performers */}
      {metrics.topPerformers.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {metrics.topPerformers.slice(0, 3).map((campaign, index) => (
              <div key={campaign.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-green-400/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium truncate max-w-[200px]">{campaign.name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(campaign.spend)} spent</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">{campaign.roas.toFixed(2)}x</p>
                  <p className="text-xs text-slate-500">ROAS</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Underperformers */}
      {metrics.underPerformers.length > 0 && metrics.underPerformers[0].roas < 1 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            Underperformers
          </h3>
          <div className="space-y-3">
            {metrics.underPerformers.filter(c => c.roas < 1).slice(0, 3).map((campaign, index) => (
              <div key={campaign.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-red-400/20 text-red-400 rounded-full flex items-center justify-center text-xs font-bold">
                    !
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium truncate max-w-[200px]">{campaign.name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(campaign.spend)} spent</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-bold">{campaign.roas.toFixed(2)}x</p>
                  <p className="text-xs text-slate-500">ROAS</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights by Category */}
      {categoryOrder.map(category => {
        const categoryInsights = groupedInsights[category]
        if (!categoryInsights || categoryInsights.length === 0) return null

        const config = categoryConfig[category]
        const Icon = config.icon

        return (
          <div key={category} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <h3 className="text-sm font-medium text-slate-400">
                {config.label}s
                <span className="ml-2 text-slate-500">({categoryInsights.length})</span>
              </h3>
            </div>
            <div className="space-y-3">
              {categoryInsights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MiniMetric({ label, value, icon: Icon, highlight }: {
  label: string
  value: string
  icon: any
  highlight?: boolean
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-green-400' : 'text-slate-500'}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className={`text-lg font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  const config = categoryConfig[insight.category]
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`rounded-lg p-4 border ${config.borderColor} ${config.bgColor} ${priorityStyles[insight.priority]}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-semibold ${config.color}`}>
              {insight.title}
            </span>
            {insight.priority === 'high' && (
              <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded">
                High Priority
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{insight.description}</p>
        </div>
        {insight.value > 0 && (
          <div className="text-right ml-4 flex-shrink-0">
            <p className={`text-lg font-bold ${config.color}`}>
              {typeof insight.value === 'number'
                ? insight.metric.includes('roas') || insight.metric.includes('ctr')
                  ? insight.metric.includes('ctr')
                    ? formatPercent(insight.value)
                    : `${insight.value.toFixed(2)}x`
                  : formatCurrency(insight.value)
                : insight.value}
            </p>
            {insight.benchmark && (
              <p className="text-xs text-slate-500">
                Benchmark: {insight.metric.includes('roas') || insight.metric.includes('ctr')
                  ? insight.metric.includes('ctr')
                    ? formatPercent(insight.benchmark)
                    : `${insight.benchmark.toFixed(2)}x`
                  : formatCurrency(insight.benchmark)}
              </p>
            )}
          </div>
        )}
      </div>

      {insight.recommendation && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-slate-400">
            <span className="font-medium text-white">Recommendation:</span>{' '}
            {insight.recommendation}
          </p>
        </div>
      )}
    </div>
  )
}
