import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateHealthScore } from '@/lib/health-score'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const campaignId = searchParams.get('campaign_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const includeHistory = searchParams.get('include_history') === 'true'

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  // Verify access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get campaigns for this workspace
  let campaignQuery = supabase
    .from('meta_campaigns')
    .select('id, campaign_id, name, status, effective_status, meta_connection_id, ad_accounts(name)')
    .eq('meta_connections.workspace_id', workspaceId)

  if (campaignId) {
    campaignQuery = campaignQuery.eq('id', campaignId)
  }

  // Get connections first
  const { data: connections } = await supabase
    .from('meta_connections')
    .select('id')
    .eq('workspace_id', workspaceId)

  if (!connections || connections.length === 0) {
    return NextResponse.json({
      scores: [],
      hasData: false,
      message: 'No Meta connections found. Connect an account to get health scores.'
    })
  }

  const connectionIds = connections.map(c => c.id)

  // Fetch campaigns
  const { data: campaigns } = await supabase
    .from('meta_campaigns')
    .select('id, campaign_id, name, status, effective_status, meta_connection_id')
    .in('meta_connection_id', connectionIds)

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({
      scores: [],
      hasData: false,
      message: 'No campaigns found.'
    })
  }

  if (campaignId) {
    const filtered = campaigns.filter(c => c.id === campaignId)
    if (filtered.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
  }

  // Build insights query
  let query = supabase
    .from('meta_insights')
    .select('entity_id_meta, impressions, clicks, spend, conversions, purchase_value, reach, date')
    .in('meta_connection_id', connectionIds)
    .eq('entity_type', 'campaign')
    .order('date', { ascending: true })

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: insights, error: insightsError } = await query

  if (insightsError) {
    return NextResponse.json({ error: insightsError.message }, { status: 500 })
  }

  if (!insights || insights.length === 0) {
    return NextResponse.json({
      scores: [],
      hasData: false,
      message: 'No performance data found.'
    })
  }

  // Aggregate insights by campaign
  const campaignMetrics: Record<string, {
    campaign_id: string
    campaign_name: string
    status: string
    effective_status: string | null
    spend: number
    impressions: number
    clicks: number
    conversions: number
    purchaseValue: number
    reach: number
    insightsCount: number
    dateStart: string | null
    dateEnd: string | null
  }> = {}

  // Initialize from campaigns
  campaigns.forEach((c: any) => {
    campaignMetrics[c.campaign_id] = {
      campaign_id: c.id,
      campaign_name: c.name,
      status: c.status,
      effective_status: c.effective_status,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      purchaseValue: 0,
      reach: 0,
      insightsCount: 0,
      dateStart: null,
      dateEnd: null,
    }
  })

  // Aggregate insights
  insights.forEach((insight: any) => {
    const key = insight.entity_id_meta
    if (campaignMetrics[key]) {
      campaignMetrics[key].spend += insight.spend || 0
      campaignMetrics[key].impressions += insight.impressions || 0
      campaignMetrics[key].clicks += insight.clicks || 0
      campaignMetrics[key].conversions += insight.conversions || 0
      campaignMetrics[key].purchaseValue += insight.purchase_value || 0
      campaignMetrics[key].reach += insight.reach || 0
      campaignMetrics[key].insightsCount += 1
      if (!campaignMetrics[key].dateStart || insight.date < campaignMetrics[key].dateStart) {
        campaignMetrics[key].dateStart = insight.date
      }
      if (!campaignMetrics[key].dateEnd || insight.date > campaignMetrics[key].dateEnd) {
        campaignMetrics[key].dateEnd = insight.date
      }
    }
  })

  // Calculate health scores
  const scores = []
  for (const [campaignId, metrics] of Object.entries(campaignMetrics)) {
    // Skip campaigns with no spend (no data)
    if (metrics.spend === 0) continue

    const healthScore = calculateHealthScore({
      spend: metrics.spend,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      conversions: metrics.conversions,
      purchaseValue: metrics.purchaseValue,
      reach: metrics.reach,
    })

    scores.push({
      campaign_id: metrics.campaign_id,
      campaign_meta_id: campaignId,
      campaign_name: metrics.campaign_name,
      status: metrics.status,
      effective_status: metrics.effective_status,
      ...healthScore,
      dateRange: {
        start: metrics.dateStart,
        end: metrics.dateEnd,
      },
      insightsCount: metrics.insightsCount,
    })
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  // Fetch historical scores if requested
  let history: any[] = []
  if (includeHistory && scores.length > 0) {
    const campaignDbIds = scores.map(s => s.campaign_id)

    const { data: historicalScores } = await supabase
      .from('campaign_health_scores')
      .select('*')
      .in('campaign_id', campaignDbIds)
      .order('computed_at', { ascending: false })
      .limit(100)

    history = historicalScores || []
  }

  return NextResponse.json({
    scores,
    hasData: scores.length > 0,
    history: includeHistory ? history : undefined,
    dateRange: {
      start: startDate || insights[insights.length - 1]?.date,
      end: endDate || insights[0]?.date,
    },
    generatedAt: new Date().toISOString(),
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { workspace_id, campaign_ids } = body

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  // Verify access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get connections
  const { data: connections } = await supabase
    .from('meta_connections')
    .select('id')
    .eq('workspace_id', workspace_id)

  if (!connections || connections.length === 0) {
    return NextResponse.json({ error: 'No connections found' }, { status: 400 })
  }

  const connectionIds = connections.map(c => c.id)

  // Get campaigns
  let campaignQuery = supabase
    .from('meta_campaigns')
    .select('id, campaign_id, name, status, effective_status, meta_connection_id')
    .in('meta_connection_id', connectionIds)

  if (campaign_ids && campaign_ids.length > 0) {
    campaignQuery = campaignQuery.in('id', campaign_ids)
  }

  const { data: campaigns } = await campaignQuery

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ error: 'No campaigns found' }, { status: 400 })
  }

  // Get last 30 days of insights
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const startDateStr = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: insights } = await supabase
    .from('meta_insights')
    .select('entity_id_meta, impressions, clicks, spend, conversions, purchase_value, reach, date')
    .in('meta_connection_id', connectionIds)
    .eq('entity_type', 'campaign')
    .gte('date', startDateStr)
    .order('date', { ascending: true })

  if (!insights || insights.length === 0) {
    return NextResponse.json({ error: 'No insight data available' }, { status: 400 })
  }

  // Aggregate by campaign
  const campaignMetrics: Record<string, any> = {}

  campaigns.forEach((c: any) => {
    campaignMetrics[c.campaign_id] = {
      db_id: c.id,
      name: c.name,
      status: c.status,
      effective_status: c.effective_status,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      purchaseValue: 0,
      reach: 0,
      insightsCount: 0,
    }
  })

  insights.forEach((insight: any) => {
    const key = insight.entity_id_meta
    if (campaignMetrics[key]) {
      campaignMetrics[key].spend += insight.spend || 0
      campaignMetrics[key].impressions += insight.impressions || 0
      campaignMetrics[key].clicks += insight.clicks || 0
      campaignMetrics[key].conversions += insight.conversions || 0
      campaignMetrics[key].purchaseValue += insight.purchase_value || 0
      campaignMetrics[key].reach += insight.reach || 0
      campaignMetrics[key].insightsCount += 1
    }
  })

  // Calculate and store scores
  const savedScores = []
  const now = new Date().toISOString()

  for (const [metaId, metrics] of Object.entries(campaignMetrics)) {
    if (metrics.spend === 0) continue

    const healthScore = calculateHealthScore({
      spend: metrics.spend,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      conversions: metrics.conversions,
      purchaseValue: metrics.purchaseValue,
      reach: metrics.reach,
    })

    // Store in database
    const { error: insertError } = await supabase
      .from('campaign_health_scores')
      .insert({
        campaign_id: metrics.db_id,
        workspace_id,
        score: healthScore.score,
        grade: healthScore.grade,
        tier: healthScore.tier,
        roas_score: healthScore.factors.roas.score,
        cpa_score: healthScore.factors.cpa.score,
        ctr_score: healthScore.factors.ctr.score,
        frequency_score: healthScore.factors.frequency.score,
        conversion_rate_score: healthScore.factors.conversionRate.score,
        roas_value: healthScore.metrics.roas,
        cpa_value: healthScore.metrics.cpa,
        ctr_value: healthScore.metrics.ctr,
        frequency_value: healthScore.metrics.frequency,
        conversion_rate_value: healthScore.metrics.conversionRate,
        spend_value: healthScore.metrics.spend,
        impressions_value: healthScore.metrics.impressions,
        clicks_value: healthScore.metrics.clicks,
        conversions_value: healthScore.metrics.conversions,
        purchase_value: healthScore.metrics.purchaseValue,
        campaign_status: metrics.status,
        effective_status: metrics.effective_status,
        date_range_start: startDateStr,
        date_range_end: new Date().toISOString().split('T')[0],
        insights_count: metrics.insightsCount,
        computed_at: now,
      })

    if (!insertError) {
      savedScores.push({
        campaign_id: metrics.db_id,
        campaign_name: metrics.name,
        ...healthScore,
      })
    }
  }

  return NextResponse.json({
    saved: savedScores.length,
    scores: savedScores,
    computedAt: now,
  })
}
