import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { analyzeCampaigns } from '@/lib/ai-analysis'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

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

  // Get all connections for this workspace
  const { data: connections } = await supabase
    .from('meta_connections')
    .select('id')
    .eq('workspace_id', workspaceId)

  if (!connections || connections.length === 0) {
    return NextResponse.json({
      analysis: null,
      hasData: false,
      message: 'No Meta connections found. Connect an account to get insights.'
    })
  }

  const connectionIds = connections.map(c => c.id)

  // Fetch campaigns
  const { data: campaigns } = await supabase
    .from('meta_campaigns')
    .select('id, campaign_id, name, status, effective_status, meta_connection_id, ad_accounts(name)')
    .in('meta_connection_id', connectionIds)

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({
      analysis: null,
      hasData: false,
      message: 'No campaigns found. Sync your data to get insights.'
    })
  }

  // Fetch insights
  let query = supabase
    .from('meta_insights')
    .select('*')
    .in('meta_connection_id', connectionIds)
    .eq('entity_type', 'campaign')
    .order('date', { ascending: true })

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: insightsData, error: insightsError } = await query

  if (insightsError) {
    return NextResponse.json({ error: insightsError.message }, { status: 500 })
  }

  if (!insightsData || insightsData.length === 0) {
    return NextResponse.json({
      analysis: null,
      hasData: false,
      message: 'No performance data found. Sync insights to get analysis.'
    })
  }

  // Aggregate insights by campaign
  const insightMap: Record<string, any> = {}
  insightsData.forEach((insight: any) => {
    const key = insight.entity_id_meta
    if (!insightMap[key]) {
      insightMap[key] = {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        purchase_value: 0,
        reach: 0,
        add_to_cart: 0,
        checkout: 0,
        leads: 0,
        video_p100_watched: 0,
      }
    }
    insightMap[key].impressions += insight.impressions || 0
    insightMap[key].clicks += insight.clicks || 0
    insightMap[key].spend += insight.spend || 0
    insightMap[key].conversions += insight.conversions || 0
    insightMap[key].purchase_value += insight.purchase_value || 0
    insightMap[key].reach += insight.reach || 0
    insightMap[key].add_to_cart += insight.add_to_cart || 0
    insightMap[key].checkout += insight.checkout || 0
    insightMap[key].leads += insight.leads || 0
    insightMap[key].video_p100_watched += insight.video_p100_watched_actions || 0
  })

  // Calculate derived metrics for each campaign
  Object.keys(insightMap).forEach(key => {
    const ins = insightMap[key]
    ins.ctr = ins.impressions > 0 ? (ins.clicks / ins.impressions) * 100 : 0
    ins.cpc = ins.clicks > 0 ? ins.spend / ins.clicks : 0
    ins.cpm = ins.impressions > 0 ? (ins.spend / ins.impressions) * 1000 : 0
    ins.roas = ins.spend > 0 ? ins.purchase_value / ins.spend : 0
    ins.cpa = ins.conversions > 0 ? ins.spend / ins.conversions : 0
  })

  // Time series for trends
  const timeSeriesMap: Record<string, any> = {}
  insightsData.forEach((insight: any) => {
    const date = insight.date
    if (!timeSeriesMap[date]) {
      timeSeriesMap[date] = {
        date,
        spend: 0,
        purchase_value: 0,
        conversions: 0,
        clicks: 0,
        impressions: 0,
      }
    }
    timeSeriesMap[date].spend += insight.spend || 0
    timeSeriesMap[date].purchase_value += insight.purchase_value || 0
    timeSeriesMap[date].conversions += insight.conversions || 0
    timeSeriesMap[date].clicks += insight.clicks || 0
    timeSeriesMap[date].impressions += insight.impressions || 0
  })

  const timeSeries = Object.values(timeSeriesMap).sort((a: any, b: any) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Run AI analysis
  const analysis = analyzeCampaigns(campaigns, insightMap, timeSeries)

  return NextResponse.json({
    analysis,
    hasData: true,
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: startDate || insightsData[insightsData.length - 1]?.date,
      end: endDate || insightsData[0]?.date
    }
  })
}
