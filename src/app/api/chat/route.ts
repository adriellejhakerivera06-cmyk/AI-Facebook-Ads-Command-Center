import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { processChatQuery } from '@/lib/ai-chat'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { query, workspace_id } = body

  if (!query || !workspace_id) {
    return NextResponse.json({ error: 'query and workspace_id are required' }, { status: 400 })
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
    return NextResponse.json({
      response: 'No Meta connections found for this workspace. Please connect a Meta account first.',
      sources: [],
    })
  }

  const connectionIds = connections.map((c) => c.id)

  // Fetch campaigns
  const { data: campaigns } = await supabase
    .from('meta_campaigns')
    .select('id, campaign_id, name, status, effective_status, meta_connection_id')
    .in('meta_connection_id', connectionIds)

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({
      response: 'No campaigns found. Please sync your data first.',
      sources: [],
    })
  }

  // Fetch insights (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: insightsData } = await supabase
    .from('meta_insights')
    .select('*')
    .in('meta_connection_id', connectionIds)
    .eq('entity_type', 'campaign')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  // Aggregate insights by campaign
  const insightMap: Record<string, any> = {}
  const timeSeries: any[] = []

  if (insightsData) {
    // Aggregate by campaign for totals
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
        }
      }
      insightMap[key].impressions += insight.impressions || 0
      insightMap[key].clicks += insight.clicks || 0
      insightMap[key].spend += insight.spend || 0
      insightMap[key].conversions += insight.conversions || 0
      insightMap[key].purchase_value += insight.purchase_value || 0
      insightMap[key].reach += insight.reach || 0
    })

    // Aggregate by date for time series
    const byDate: Record<string, any> = {}
    insightsData.forEach((insight: any) => {
      const date = insight.date
      if (!byDate[date]) {
        byDate[date] = { date, spend: 0, revenue: 0, purchase_value: 0, clicks: 0, impressions: 0, conversions: 0 }
      }
      byDate[date].spend += insight.spend || 0
      byDate[date].revenue += insight.purchase_value || 0
      byDate[date].purchase_value += insight.purchase_value || 0
      byDate[date].clicks += insight.clicks || 0
      byDate[date].impressions += insight.impressions || 0
      byDate[date].conversions += insight.conversions || 0
    })
    timeSeries.push(...Object.values(byDate).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ))
  }

  // Process query
  const result = processChatQuery(query, {
    campaigns,
    insights: insightMap,
    timeSeries,
  })

  return NextResponse.json({
    response: result.response,
    sources: result.sources,
  })
}
