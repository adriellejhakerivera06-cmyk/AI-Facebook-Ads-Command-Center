'use client'

import { useState } from 'react'
import { TrendingDown, TrendingUp, Eye, RefreshCw, DollarSign, TriangleAlert as AlertTriangle, BookOpen, Check, X, ChevronDown, ChevronUp, Bell, ListFilter as Filter, Clock, ArrowRight } from 'lucide-react'
import type { CampaignAlert, AlertType, AlertSeverity, AlertStatus } from '@/lib/alerts'
import { getAlertIcon, getAlertColor, getAlertSeverityColor, getAlertLabel } from '@/lib/alerts'
import { formatCurrency, formatPercent, formatNumber, formatDateTime } from '@/lib/formatters'

interface AlertsPanelProps {
  alerts: CampaignAlert[]
  loading?: boolean
  hasData?: boolean
  message?: string
  onResolve?: (id: string) => void
  onDismiss?: (id: string) => void
}

const iconMap: Record<string, any> = {
  TrendingDown, TrendingUp, Eye, RefreshCw, DollarSign, AlertTriangle, BookOpen,
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const colors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${colors[severity]}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  )
}

function AlertCard({
  alert,
  onResolve,
  onDismiss
}: {
  alert: CampaignAlert
  onResolve?: (id: string) => void
  onDismiss?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [processing, setProcessing] = useState(false)

  const Icon = iconMap[getAlertIcon(alert.alertType)] || AlertTriangle
  const colorClass = getAlertColor(alert.severity)

  const handleAction = async (action: 'resolved' | 'dismissed') => {
    setProcessing(true)
    try {
      const response = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      })
      if (response.ok) {
        if (action === 'resolved') onResolve?.(alert.id)
        else onDismiss?.(alert.id)
      }
    } catch (e) {
      console.error('Failed to update alert:', e)
    } finally {
      setProcessing(false)
    }
  }

  const formatMetric = () => {
    if (alert.metricValue === undefined) return null
    switch (alert.alertType) {
      case 'roas_drop':
        return `${alert.metricValue.toFixed(2)}x`
      case 'cpa_spike':
      case 'spend_anomaly':
      case 'pixel_issue':
        return formatCurrency(alert.metricValue)
      case 'high_frequency':
        return alert.metricValue.toFixed(1)
      case 'creative_fatigue':
        return formatPercent(alert.metricValue)
      default:
        return formatNumber(alert.metricValue)
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClass.replace('text-', 'border-').split(' ')[1] || 'border-slate-700'} bg-slate-800/30`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${colorClass.split(' ')[1] || 'bg-slate-700'}`}>
            <Icon className={`w-5 h-5 ${colorClass.split(' ')[0] || 'text-slate-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={alert.severity} />
              <span className="text-sm font-medium text-white truncate">{alert.title}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">{getAlertLabel(alert.alertType)}</span>
              {alert.metricValue !== undefined && (
                <span className="text-xs text-slate-400">
                  {alert.metricName}: <span className={getAlertSeverityColor(alert.severity)}>{formatMetric()}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => handleAction('resolved')}
            disabled={processing || alert.status !== 'active'}
            className="p-1.5 text-slate-500 hover:text-green-400 transition-colors"
            title="Resolve"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAction('dismissed')}
            disabled={processing || alert.status !== 'active'}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-500 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
          <p className="text-sm text-slate-300">{alert.message}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {alert.metricValue !== undefined && (
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500">Current {alert.metricName}</p>
                <p className="text-sm font-medium text-white">{formatMetric()}</p>
              </div>
            )}
            {alert.thresholdValue !== undefined && (
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500">Threshold</p>
                <p className="text-sm font-medium text-white">
                  {alert.alertType === 'roas_drop' ? `${alert.thresholdValue?.toFixed(2)}x` :
                   alert.alertType === 'cpa_spike' ? formatCurrency(alert.thresholdValue || 0) :
                   alert.thresholdValue?.toFixed(2)}
                </p>
              </div>
            )}
            {alert.previousValue !== undefined && (
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500">Previous</p>
                <p className="text-sm font-medium text-slate-300">
                  {alert.alertType === 'roas_drop' ? `${alert.previousValue?.toFixed(2)}x` :
                   alert.alertType === 'cpa_spike' ? formatCurrency(alert.previousValue || 0) :
                   alert.previousValue?.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {formatDateTime(alert.createdAt)}
          </div>
        </div>
      )}
    </div>
  )
}

export function AlertsPanel({
  alerts,
  loading,
  hasData,
  message,
  onResolve,
  onDismiss
}: AlertsPanelProps) {
  const [filter, setFilter] = useState<'all' | AlertSeverity>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('active')

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-amber-400 animate-pulse" />
          <h2 className="text-lg font-bold text-white">Alerts</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-700 rounded-lg"></div>
          <div className="h-20 bg-slate-700 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!hasData || alerts.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Alerts</h2>
        </div>
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">{message || 'No alerts at this time.'}</p>
        </div>
      </div>
    )
  }

  const filtered = alerts.filter((a) => {
    if (filter !== 'all' && a.severity !== filter) return false
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    return true
  })

  const activeCount = alerts.filter((a) => a.status === 'active').length
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Alerts</h2>
          {activeCount > 0 && (
            <span className="bg-amber-500/20 text-amber-400 text-xs font-medium px-2 py-0.5 rounded">
              {activeCount} active
            </span>
          )}
          {criticalCount > 0 && (
            <span className="bg-red-500/20 text-red-400 text-xs font-medium px-2 py-0.5 rounded">
              {criticalCount} critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 text-sm"
          >
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onResolve={onResolve}
            onDismiss={onDismiss}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No alerts match the selected filters.
        </div>
      )}
    </div>
  )
}
