export type AlertType =
  | 'roas_drop'
  | 'cpa_spike'
  | 'high_frequency'
  | 'creative_fatigue'
  | 'spend_anomaly'
  | 'pixel_issue'
  | 'learning_limited'

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'active' | 'resolved' | 'dismissed'

export interface CampaignAlert {
  id: string
  campaignId: string
  campaignName: string
  alertType: AlertType
  severity: AlertSeverity
  title: string
  message: string
  metricName?: string
  metricValue?: number
  thresholdValue?: number
  previousValue?: number
  status: AlertStatus
  createdAt: string
}

interface CampaignMetrics {
  campaign_id: string
  campaign_name: string
  status: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  purchaseValue: number
  reach: number
  roas: number | null
  cpa: number | null
  ctr: number | null
  frequency: number | null
  conversionRate: number | null
  // Historical comparison
  previousSpend?: number
  previousRoas?: number
  previousCpa?: number
  previousCtr?: number
  previousConversions?: number
}

interface AlertRule {
  type: AlertType
  check: (metrics: CampaignMetrics) => { triggered: boolean; severity: AlertSeverity; metricValue?: number; thresholdValue?: number; previousValue?: number } | null
  title: (metrics: CampaignMetrics) => string
  message: (metrics: CampaignMetrics, details: any) => string
  dedupWindowHours: number
}

function generateDedupKey(type: AlertType, campaignId: string, windowHours: number): string {
  const windowStart = new Date()
  windowStart.setHours(windowStart.getHours() - (windowStart.getHours() % windowHours), 0, 0, 0)
  return `${type}:${campaignId}:${windowStart.toISOString()}`
}

const ALERT_RULES: AlertRule[] = [
  // ROAS Drop: ROAS dropped by 30% or more from previous period
  {
    type: 'roas_drop',
    check: (m) => {
      if (m.previousRoas === undefined || m.previousRoas === 0 || m.roas === null) return null
      const dropPercent = ((m.previousRoas - m.roas) / m.previousRoas) * 100
      if (dropPercent >= 30) {
        return {
          triggered: true,
          severity: dropPercent >= 50 ? 'critical' : 'warning',
          metricValue: m.roas,
          thresholdValue: m.previousRoas * 0.7,
          previousValue: m.previousRoas,
        }
      }
      return null
    },
    title: (m) => `ROAS dropped for "${m.campaign_name}"`,
    message: (m, d) => `ROAS dropped from ${d.previousValue.toFixed(2)}x to ${d.metricValue.toFixed(2)}x (${(((d.previousValue - d.metricValue) / d.previousValue) * 100).toFixed(0)}% decrease). Consider reviewing targeting and creative.`,
    dedupWindowHours: 24,
  },

  // CPA Spike: CPA increased by 40% or more
  {
    type: 'cpa_spike',
    check: (m) => {
      if (m.previousCpa === undefined || m.previousCpa === 0 || m.cpa === null) return null
      const spikePercent = ((m.cpa - m.previousCpa) / m.previousCpa) * 100
      if (spikePercent >= 40) {
        return {
          triggered: true,
          severity: spikePercent >= 80 ? 'critical' : 'warning',
          metricValue: m.cpa,
          thresholdValue: m.previousCpa * 1.4,
          previousValue: m.previousCpa,
        }
      }
      return null
    },
    title: (m) => `CPA spike detected in "${m.campaign_name}"`,
    message: (m, d) => `CPA increased from $${d.previousValue.toFixed(2)} to $${d.metricValue.toFixed(2)} (${(((d.metricValue - d.previousValue) / d.previousValue) * 100).toFixed(0)}% increase). Review audience targeting and landing page.`,
    dedupWindowHours: 24,
  },

  // High Frequency: Frequency above 5
  {
    type: 'high_frequency',
    check: (m) => {
      if (m.frequency === null || m.frequency < 5) return null
      return {
        triggered: true,
        severity: m.frequency > 8 ? 'critical' : 'warning',
        metricValue: m.frequency,
        thresholdValue: 5,
        previousValue: undefined,
      }
    },
    title: (m) => `High ad frequency in "${m.campaign_name}"`,
    message: (m, d) => `Frequency reached ${d.metricValue.toFixed(1)} (threshold: ${d.thresholdValue}). Users are seeing your ads too often, which may cause ad fatigue and higher costs.`,
    dedupWindowHours: 48,
  },

  // Creative Fatigue: CTR dropped by 40% with high impressions
  {
    type: 'creative_fatigue',
    check: (m) => {
      if (m.previousCtr === undefined || m.previousCtr === 0 || m.ctr === null) return null
      if (m.impressions < 5000) return null
      const dropPercent = ((m.previousCtr - m.ctr) / m.previousCtr) * 100
      if (dropPercent >= 40) {
        return {
          triggered: true,
          severity: 'warning',
          metricValue: m.ctr,
          thresholdValue: m.previousCtr * 0.6,
          previousValue: m.previousCtr,
        }
      }
      return null
    },
    title: (m) => `Creative fatigue in "${m.campaign_name}"`,
    message: (m, d) => `CTR dropped from ${d.previousValue.toFixed(2)}% to ${d.metricValue.toFixed(2)}% with ${m.impressions.toLocaleString()} impressions. Refresh creatives to re-engage your audience.`,
    dedupWindowHours: 72,
  },

  // Spend Anomaly: Spend changed by more than 50% day-over-day
  {
    type: 'spend_anomaly',
    check: (m) => {
      if (m.previousSpend === undefined || m.previousSpend === 0) return null
      const changePercent = Math.abs(((m.spend - m.previousSpend) / m.previousSpend) * 100)
      if (changePercent >= 50 && m.spend > 10) {
        const isIncrease = m.spend > m.previousSpend
        return {
          triggered: true,
          severity: changePercent >= 100 ? 'critical' : 'warning',
          metricValue: m.spend,
          thresholdValue: m.previousSpend * (isIncrease ? 1.5 : 0.5),
          previousValue: m.previousSpend,
        }
      }
      return null
    },
    title: (m) => `Spend anomaly in "${m.campaign_name}"`,
    message: (m, d) => `Daily spend ${m.spend > d.previousValue ? 'increased' : 'decreased'} from $${d.previousValue.toFixed(2)} to $${d.metricValue.toFixed(2)} (${Math.abs(((d.metricValue - d.previousValue) / d.previousValue) * 100).toFixed(0)}% change). Verify budget settings and delivery.`,
    dedupWindowHours: 12,
  },

  // Pixel Issue: Significant spend but zero conversions
  {
    type: 'pixel_issue',
    check: (m) => {
      if (m.spend < 50 || m.conversions > 0) return null
      // If we've spent $50+ with 0 conversions and have clicks, potential tracking issue
      if (m.clicks > 10) {
        return {
          triggered: true,
          severity: 'critical',
          metricValue: m.spend,
          thresholdValue: 50,
          previousValue: undefined,
        }
      }
      return null
    },
    title: (m) => `Possible tracking issue in "${m.campaign_name}"`,
    message: (m, d) => `Spent $${d.metricValue.toFixed(2)} with ${m.clicks} clicks but zero conversions. Verify your Meta Pixel and conversion API are properly configured.`,
    dedupWindowHours: 24,
  },

  // Learning Limited: Low impressions relative to spend (simulated via low reach)
  {
    type: 'learning_limited',
    check: (m) => {
      // Campaign is active but getting very few impressions relative to spend
      // or has been running for a while with low volume
      if (m.status !== 'ACTIVE' && m.status !== 'active') return null
      if (m.impressions < 100 && m.spend > 5) {
        return {
          triggered: true,
          severity: 'info',
          metricValue: m.impressions,
          thresholdValue: 100,
          previousValue: undefined,
        }
      }
      return null
    },
    title: (m) => `Low delivery in "${m.campaign_name}"`,
    message: (m, d) => `Campaign is active but only received ${d.metricValue} impressions. This may indicate Learning Limited status. Check audience size, budget, and bid strategy.`,
    dedupWindowHours: 48,
  },
]

export function generateAlerts(
  campaigns: any[],
  currentInsights: Record<string, any>,
  previousInsights: Record<string, any>
): CampaignAlert[] {
  const alerts: CampaignAlert[] = []

  for (const campaign of campaigns) {
    const current = currentInsights[campaign.campaign_id]
    const previous = previousInsights[campaign.campaign_id]

    if (!current) continue

    const metrics: CampaignMetrics = {
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.name,
      status: campaign.status,
      spend: current.spend || 0,
      impressions: current.impressions || 0,
      clicks: current.clicks || 0,
      conversions: current.conversions || 0,
      purchaseValue: current.purchase_value || 0,
      reach: current.reach || 0,
      roas: current.spend > 0 ? (current.purchase_value || 0) / current.spend : null,
      cpa: current.conversions > 0 ? current.spend / current.conversions : null,
      ctr: current.impressions > 0 ? (current.clicks / current.impressions) * 100 : null,
      frequency: current.reach > 0 ? current.impressions / current.reach : null,
      conversionRate: current.clicks > 0 ? (current.conversions / current.clicks) * 100 : null,
      previousSpend: previous?.spend,
      previousRoas: previous?.spend > 0 ? (previous?.purchase_value || 0) / previous.spend : undefined,
      previousCpa: previous?.conversions > 0 ? previous.spend / previous.conversions : undefined,
      previousCtr: previous?.impressions > 0 ? (previous.clicks / previous.impressions) * 100 : undefined,
    }

    for (const rule of ALERT_RULES) {
      const result = rule.check(metrics)
      if (result && result.triggered) {
        alerts.push({
          id: `alert_${rule.type}_${campaign.campaign_id}_${Date.now()}`,
          campaignId: campaign.campaign_id,
          campaignName: campaign.name,
          alertType: rule.type,
          severity: result.severity,
          title: rule.title(metrics),
          message: rule.message(metrics, result),
          metricName: rule.type === 'roas_drop' ? 'ROAS' :
            rule.type === 'cpa_spike' ? 'CPA' :
            rule.type === 'high_frequency' ? 'Frequency' :
            rule.type === 'creative_fatigue' ? 'CTR' :
            rule.type === 'spend_anomaly' ? 'Spend' :
            rule.type === 'pixel_issue' ? 'Spend' :
            'Impressions',
          metricValue: result.metricValue,
          thresholdValue: result.thresholdValue,
          previousValue: result.previousValue,
          status: 'active',
          createdAt: new Date().toISOString(),
        })
      }
    }
  }

  // Sort by severity: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return alerts
}

export function getAlertIcon(type: AlertType): string {
  const icons: Record<AlertType, string> = {
    roas_drop: 'TrendingDown',
    cpa_spike: 'TrendingUp',
    high_frequency: 'Eye',
    creative_fatigue: 'RefreshCw',
    spend_anomaly: 'DollarSign',
    pixel_issue: 'AlertTriangle',
    learning_limited: 'BookOpen',
  }
  return icons[type]
}

export function getAlertColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-red-400 bg-red-400/10 border-red-400/30'
    case 'warning':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/30'
    case 'info':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
  }
}

export function getAlertSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-red-400'
    case 'warning':
      return 'text-amber-400'
    case 'info':
      return 'text-blue-400'
  }
}

export function getAlertLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    roas_drop: 'ROAS Drop',
    cpa_spike: 'CPA Spike',
    high_frequency: 'High Frequency',
    creative_fatigue: 'Creative Fatigue',
    spend_anomaly: 'Spend Anomaly',
    pixel_issue: 'Tracking Issue',
    learning_limited: 'Low Delivery',
  }
  return labels[type]
}

export { generateDedupKey, ALERT_RULES }
