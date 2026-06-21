export type InsightCategory = 'strength' | 'weakness' | 'opportunity' | 'risk' | 'observation'

export type InsightPriority = 'high' | 'medium' | 'low'

export interface Insight {
  id: string
  category: InsightCategory
  priority: InsightPriority
  title: string
  description: string
  metric: string
  value: number
  benchmark?: number
  recommendation?: string
  entityId?: string
  entityName?: string
}

export interface CampaignAnalysis {
  summary: string
  insights: Insight[]
  metrics: {
    totalSpend: number
    totalRevenue: number
    totalConversions: number
    avgRoas: number
    avgCpa: number
    avgCtr: number
    avgCpc: number
    totalCampaigns: number
    activeCampaigns: number
    topPerformers: any[]
    underPerformers: any[]
  }
}

// Benchmark thresholds based on industry standards
const BENCHMARKS = {
  roas: {
    excellent: 4.0,
    good: 2.0,
    average: 1.0,
    poor: 0.5,
  },
  ctr: {
    excellent: 2.0,
    good: 1.0,
    average: 0.5,
    poor: 0.2,
  },
  cpa: {
    // Lower is better, these are multipliers of avg order value
    excellent: 0.1,
    good: 0.2,
    average: 0.5,
    poor: 1.0,
  },
  cpc: {
    excellent: 0.5,
    good: 1.0,
    average: 2.0,
    poor: 5.0,
  },
  frequency: {
    optimal: 2.0,
    high: 5.0,
  },
  conversionRate: {
    excellent: 5.0,
    good: 2.0,
    average: 1.0,
    poor: 0.5,
  },
}

function generateId(): string {
  return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function prioritize(value: number, benchmarks: { excellent: number; good: number; average: number; poor: number }, higherIsBetter: boolean): InsightPriority {
  if (higherIsBetter) {
    if (value >= benchmarks.excellent) return 'high'
    if (value >= benchmarks.good) return 'medium'
    if (value >= benchmarks.average) return 'low'
    return 'low'
  } else {
    if (value <= benchmarks.excellent) return 'high'
    if (value <= benchmarks.good) return 'medium'
    if (value <= benchmarks.average) return 'low'
    return 'low'
  }
}

export function analyzeCampaigns(
  campaigns: any[],
  insights: Record<string, any>,
  timeSeries?: any[]
): CampaignAnalysis {
  const allInsights: Insight[] = []
  let totalSpend = 0
  let totalRevenue = 0
  let totalConversions = 0
  let totalClicks = 0
  let totalImpressions = 0
  let activeCampaigns = 0

  // Aggregate metrics
  campaigns.forEach(campaign => {
    const ins = insights[campaign.campaign_id]
    if (!ins) return

    totalSpend += ins.spend || 0
    totalRevenue += ins.purchase_value || 0
    totalConversions += ins.conversions || 0
    totalClicks += ins.clicks || 0
    totalImpressions += ins.impressions || 0

    if (campaign.status === 'ACTIVE' || campaign.effective_status === 'ACTIVE') {
      activeCampaigns++
    }
  })

  // Calculate averages
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0

  // Identify top and under performers
  const campaignPerformance = campaigns
    .map(c => ({
      campaign: c,
      insight: insights[c.campaign_id],
      roas: insights[c.campaign_id]?.spend > 0
        ? (insights[c.campaign_id]?.purchase_value || 0) / insights[c.campaign_id]?.spend
        : 0,
      spend: insights[c.campaign_id]?.spend || 0,
    }))
    .filter(c => c.insight && c.spend > 0)
    .sort((a, b) => b.roas - a.roas)

  const topPerformers = campaignPerformance.slice(0, 5)
  const underPerformers = campaignPerformance.slice(-5).reverse()

  // Generate Insights

  // STRENGTH: High ROAS
  if (avgRoas >= BENCHMARKS.roas.good) {
    allInsights.push({
      id: generateId(),
      category: 'strength',
      priority: avgRoas >= BENCHMARKS.roas.excellent ? 'high' : 'medium',
      title: avgRoas >= BENCHMARKS.roas.excellent ? 'Excellent ROAS Performance' : 'Strong ROAS Performance',
      description: `Your campaigns are generating ${avgRoas.toFixed(2)}x return on ad spend, which is ${avgRoas >= BENCHMARKS.roas.excellent ? 'above industry excellence benchmarks' : 'above average performance'}.`,
      metric: 'roas',
      value: avgRoas,
      benchmark: BENCHMARKS.roas.good,
      recommendation: avgRoas >= BENCHMARKS.roas.excellent
        ? 'Consider scaling successful campaigns to maximize returns while maintaining efficiency.'
        : 'Analyze top-performing campaigns to replicate their success across the account.',
    })
  }

  // STRENGTH: High CTR
  if (avgCtr >= BENCHMARKS.ctr.good) {
    allInsights.push({
      id: generateId(),
      category: 'strength',
      priority: avgCtr >= BENCHMARKS.ctr.excellent ? 'high' : 'medium',
      title: 'High Click-Through Rate',
      description: `Your average CTR of ${avgCtr.toFixed(2)}% indicates strong ad relevance and compelling creative.`,
      metric: 'ctr',
      value: avgCtr,
      benchmark: BENCHMARKS.ctr.good,
      recommendation: 'Your ads are resonating with the audience. Consider expanding reach to similar audiences.',
    })
  }

  // STRENGTH: Top performer identified
  if (topPerformers.length > 0 && topPerformers[0].roas > 2) {
    const top = topPerformers[0]
    allInsights.push({
      id: generateId(),
      category: 'strength',
      priority: 'medium',
      title: 'Top Performing Campaign',
      description: `"${top.campaign.name}" has a ROAS of ${top.roas.toFixed(2)}x with $${top.spend.toFixed(2)} spend.`,
      metric: 'roas',
      value: top.roas,
      entityId: top.campaign.campaign_id,
      entityName: top.campaign.name,
      recommendation: 'Consider increasing budget for this campaign and testing its creative/targeting approach on other campaigns.',
    })
  }

  // WEAKNESS: Low ROAS
  if (avgRoas < BENCHMARKS.roas.average && totalSpend > 0) {
    allInsights.push({
      id: generateId(),
      category: 'weakness',
      priority: 'high',
      title: 'Low Return on Ad Spend',
      description: `Your campaigns are generating only ${avgRoas.toFixed(2)}x return, below the ${BENCHMARKS.roas.average}x benchmark for profitable campaigns.`,
      metric: 'roas',
      value: avgRoas,
      benchmark: BENCHMARKS.roas.average,
      recommendation: 'Review targeting parameters, ad creatives, and landing page experience. Consider pausing lowest-performing campaigns.',
    })
  }

  // WEAKNESS: High CPA
  if (avgCpa > 0 && totalSpend > 10) {
    const avgOrderValue = totalRevenue / totalConversions || 50
    const cpaRatio = avgCpa / avgOrderValue
    if (cpaRatio > BENCHMARKS.cpa.poor) {
      allInsights.push({
        id: generateId(),
        category: 'weakness',
        priority: 'high',
        title: 'High Cost Per Acquisition',
        description: `Your CPA of $${avgCpa.toFixed(2)} represents ${((cpaRatio) * 100).toFixed(0)}% of estimated average order value, indicating potential profitability issues.`,
        metric: 'cpa',
        value: avgCpa,
        benchmark: avgOrderValue * BENCHMARKS.cpa.good,
        recommendation: 'Focus on conversion optimization. Test different audience segments and review conversion tracking setup.',
      })
    }
  }

  // WEAKNESS: Low CTR
  if (avgCtr < BENCHMARKS.ctr.average && totalImpressions > 0) {
    allInsights.push({
      id: generateId(),
      category: 'weakness',
      priority: 'medium',
      title: 'Below Average Click-Through Rate',
      description: `Your ${avgCtr.toFixed(2)}% CTR is below the ${BENCHMARKS.ctr.average}% benchmark, suggesting ads may not be resonating with the target audience.`,
      metric: 'ctr',
      value: avgCtr,
      benchmark: BENCHMARKS.ctr.average,
      recommendation: 'Test new ad creatives, refine targeting, and review ad copy. A/B test different headlines and images.',
    })
  }

  // WEAKNESS: Under performers
  if (underPerformers.length > 0 && underPerformers[0].roas < 1 && underPerformers[0].spend > 10) {
    const worst = underPerformers[0]
    allInsights.push({
      id: generateId(),
      category: 'weakness',
      priority: 'high',
      title: 'Underperforming Campaign Identified',
      description: `"${worst.campaign.name}" has a ROAS of ${worst.roas.toFixed(2)}x with $${worst.spend.toFixed(2)} spend, representing potential budget waste.`,
      metric: 'roas',
      value: worst.roas,
      entityId: worst.campaign.campaign_id,
      entityName: worst.campaign.name,
      recommendation: 'Consider pausing or significantly restructuring this campaign to improve efficiency.',
    })
  }

  // OPPORTUNITY: Low spend, potential for scaling
  if (avgRoas >= BENCHMARKS.roas.good && totalSpend < 1000) {
    allInsights.push({
      id: generateId(),
      category: 'opportunity',
      priority: 'medium',
      title: 'Scale Potential Identified',
      description: `Strong ROAS (${avgRoas.toFixed(2)}x) with modest total spend ($${totalSpend.toFixed(2)}) suggests room for scaling.`,
      metric: 'spend',
      value: totalSpend,
      recommendation: 'Consider increasing budgets on top-performing campaigns by 20-30% to capture more market opportunity.',
    })
  }

  // OPPORTUNITY: Inactive campaigns
  const inactiveCampaigns = campaigns.filter(c =>
    c.status === 'PAUSED' || c.effective_status === 'PAUSED'
  ).length

  if (inactiveCampaigns > 0) {
    allInsights.push({
      id: generateId(),
      category: 'opportunity',
      priority: 'low',
      title: 'Paused Campaigns Available',
      description: `${inactiveCampaigns} campaigns are currently paused. Review if any can be reactivated with improved settings.`,
      metric: 'paused_campaigns',
      value: inactiveCampaigns,
      recommendation: 'Analyze historical performance of paused campaigns. Consider relaunching with updated targeting or creative.',
    })
  }

  // OPPORTUNITY: High impressions, low clicks (awareness opportunity)
  if (totalImpressions > 10000 && avgCtr < 0.5) {
    allInsights.push({
      id: generateId(),
      category: 'opportunity',
      priority: 'medium',
      title: 'Brand Awareness Potential',
      description: `High impression volume (${formatNumber(totalImpressions)}) with low CTR suggests potential for brand awareness value, or targeting that\'s too broad.`,
      metric: 'impressions',
      value: totalImpressions,
      recommendation: 'Narrow targeting to improve CTR, or embrace awareness goals if that\'s the objective. Consider using brand lift studies.',
    })
  }

  // RISK: High frequency (ad fatigue)
  const avgFrequency = totalImpressions > 0 && totalSpend > 0 ? totalImpressions / (totalSpend / 10) : 0
  if (avgFrequency > BENCHMARKS.frequency.high) {
    allInsights.push({
      id: generateId(),
      category: 'risk',
      priority: 'medium',
      title: 'Potential Ad Fatigue',
      description: `High frequency indicates users may be seeing your ads too often, potentially leading to diminishing returns.`,
      metric: 'frequency',
      value: avgFrequency,
      benchmark: BENCHMARKS.frequency.optimal,
      recommendation: 'Rotate creative more frequently or expand audience targeting to reduce frequency.',
    })
  }

  // RISK: All spend in few campaigns
  if (campaigns.length > 0) {
    const top5spend = topPerformers.slice(0, 5).reduce((sum, c) => sum + (c.spend || 0), 0)
    const concentration = totalSpend > 0 ? top5spend / totalSpend : 0
    if (concentration > 0.8 && campaigns.length > 5) {
      allInsights.push({
        id: generateId(),
        category: 'risk',
        priority: 'medium',
        title: 'Budget Concentration Risk',
        description: `${(concentration * 100).toFixed(0)}% of budget is concentrated in top 5 campaigns, creating dependency risk.`,
        metric: 'budget_concentration',
        value: concentration * 100,
        recommendation: 'Diversify spend across more campaigns to mitigate risk and discover new opportunities.',
      })
    }
  }

  // RISK: No conversions but significant spend
  if (totalConversions === 0 && totalSpend > 100) {
    allInsights.push({
      id: generateId(),
      category: 'risk',
      priority: 'high',
      title: 'No Conversions Recorded',
      description: `Significant spend ($${totalSpend.toFixed(2)}) with zero conversions. Tracking or targeting may be broken.`,
      metric: 'conversions',
      value: 0,
      recommendation: 'Immediately verify conversion tracking setup (pixel, API integration). Review targeting and landing pages.',
    })
  }

  // OBSERVATION: General performance summary
  allInsights.push({
    id: generateId(),
    category: 'observation',
    priority: 'low',
    title: 'Campaign Overview',
    description: `${campaigns.length} total campaigns (${activeCampaigns} active) with $${totalSpend.toFixed(2)} spent generating $${totalRevenue.toFixed(2)} in revenue.`,
    metric: 'overview',
    value: campaigns.length,
  })

  // OBSERVATION: Time-based trends
  if (timeSeries && timeSeries.length > 7) {
    const recent = timeSeries.slice(-7)
    const previous = timeSeries.slice(-14, -7)

    if (recent.length > 0 && previous.length > 0) {
      const recentSpend = recent.reduce((sum, d) => sum + (d.spend || 0), 0)
      const previousSpend = previous.reduce((sum, d) => sum + (d.spend || 0), 0)
      const spendChange = previousSpend > 0 ? ((recentSpend - previousSpend) / previousSpend) * 100 : 0

      const recentRoas = recent.reduce((sum, d) => sum + (d.purchase_value || d.revenue || 0), 0) / recentSpend || 0
      const previousRoas = previous.reduce((sum, d) => sum + (d.purchase_value || d.revenue || 0), 0) / previousSpend || 0

      if (Math.abs(spendChange) > 10) {
        allInsights.push({
          id: generateId(),
          category: 'observation',
          priority: 'low',
          title: 'Spend Trend Detected',
          description: `Spend ${spendChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(spendChange).toFixed(0)}% in the last 7 days compared to the previous week.`,
          metric: 'spend_trend',
          value: spendChange,
          recommendation: spendChange > 50 ? 'Rapid budget increase may require monitoring for efficiency changes.' : undefined,
        })
      }

      if (previousRoas > 0 && Math.abs(recentRoas - previousRoas) / previousRoas > 0.2) {
        const roasChange = ((recentRoas - previousRoas) / previousRoas) * 100
        allInsights.push({
          id: generateId(),
          category: roasChange > 0 ? 'strength' : 'weakness',
          priority: 'medium',
          title: 'ROAS Trend Detected',
          description: `ROAS ${roasChange > 0 ? 'improved' : 'declined'} by ${Math.abs(roasChange).toFixed(0)}% week-over-week.`,
          metric: 'roas_trend',
          value: roasChange,
          recommendation: roasChange < 0 ? 'Investigate recent changes - check for creative fatigue, audience saturation, or external factors.' : 'Continue current strategies while monitoring for sustainability.',
        })
      }
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  allInsights.sort((a, b) => {
    if (a.category !== b.category) {
      const categoryOrder = { strength: 0, opportunity: 1, observation: 2, weakness: 3, risk: 4 }
      return categoryOrder[a.category] - categoryOrder[b.category]
    }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Generate summary
  const summary = generateSummary(allInsights, {
    totalSpend,
    totalRevenue,
    avgRoas,
    campaigns: campaigns.length,
    activeCampaigns,
  })

  return {
    summary,
    insights: allInsights,
    metrics: {
      totalSpend,
      totalRevenue,
      totalConversions,
      avgRoas,
      avgCpa,
      avgCtr,
      avgCpc,
      totalCampaigns: campaigns.length,
      activeCampaigns,
      topPerformers: topPerformers.slice(0, 5).map(p => ({
        id: p.campaign.campaign_id,
        name: p.campaign.name,
        roas: p.roas,
        spend: p.spend,
      })),
      underPerformers: underPerformers.slice(0, 5).map(p => ({
        id: p.campaign.campaign_id,
        name: p.campaign.name,
        roas: p.roas,
        spend: p.spend,
      })),
    },
  }
}

function generateSummary(insights: Insight[], metrics: any): string {
  const strengthCount = insights.filter(i => i.category === 'strength').length
  const weaknessCount = insights.filter(i => i.category === 'weakness').length
  const opportunityCount = insights.filter(i => i.category === 'opportunity').length
  const riskCount = insights.filter(i => i.category === 'risk').length

  let summary = `Analysis of ${metrics.campaigns} campaigns shows `

  if (metrics.avgRoas >= 2) {
    summary += `strong performance with ${metrics.avgRoas.toFixed(1)}x ROAS and $${metrics.totalRevenue.toFixed(0)} in revenue from $${metrics.totalSpend.toFixed(0)} spend. `
  } else if (metrics.avgRoas >= 1) {
    summary += `moderate performance with ${metrics.avgRoas.toFixed(1)}x ROAS. `
  } else {
    summary += `performance below targets with ${metrics.avgRoas.toFixed(1)}x ROAS, requiring optimization. `
  }

  if (strengthCount > 0) {
    summary += `${strengthCount} strength${strengthCount > 1 ? 's' : ''} identified. `
  }
  if (weaknessCount > 0) {
    summary += `${weaknessCount} area${weaknessCount > 1 ? 's' : ''} needing improvement. `
  }
  if (opportunityCount > 0) {
    summary += `${opportunityCount} opportunity${opportunityCount > 1 ? 'ies' : ''} for growth. `
  }
  if (riskCount > 0) {
    summary += `${riskCount} risk${riskCount > 1 ? 's' : ''} to monitor.`
  }

  return summary.trim()
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(0)
}
