import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateAlerts, generateDedupKey, ALERT_RULES } from '@/lib/alerts'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const status = searchParams.get('status') || 'active'
  const limit = parseInt(searchParams.get('limit') || '50')

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

  // Fetch alerts
  let query = supabase
    .from('campaign_alerts')
    .select(`
      *,
      campaign:meta_campaigns(campaign_id, name)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: alerts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    alerts: alerts || [],
    hasData: (alerts || []).length > 0,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')

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

  // Get connections
  const { data: connections } = await supabase
    .from('meta_connections')
    .select('id')
    .eq('workspace_id', workspaceId)

  if (!connections || connections.length === 0) {
    return NextResponse.json({
      alerts: [],
      hasData: false,
      message: 'No Meta connections found.',
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
      alerts: [],
      hasData: false,
      message: 'No campaigns found.',
    })
  }

  // Get date ranges for current and previous periods
  const today = new Date()
  const currentStart = new Date(today)
  currentStart.setDate(today.getDate() - 7)
  const previousStart = new Date(today)
  previousStart.setDate(today.getDate() - 14)
  const previousEnd = new Date(today)
  previousEnd.setDate(today.getDate() - 7)

  // Fetch current period insights
  const { data: currentInsightsData } = await supabase
    .from('meta_insights')
    .select('*')
    .in('meta_connection_id', connectionIds)
    .eq('entity_type', 'campaign')
    .gte('date', currentStart.toISOString().split('T')[0])
    .lte('date', today.toISOString().split('T')[0])

  // Fetch previous period insights
  const { data: previousInsightsData } = await supabase
    .from('meta_insights')
    .select('*')
    .in('meta_connection_id', connectionIds)
    .eq('entity_type', 'campaign')
    .gte('date', previousStart.toISOString().split('T')[0])
    .lte('date', previousEnd.toISOString().split('T')[0])

  // Aggregate insights by campaign
  function aggregateInsights(data: any[] | null): Record<string, any> {
    const map: Record<string, any> = {}
    if (!data) return map
    data.forEach((insight: any) => {
      const key = insight.entity_id_meta
      if (!map[key]) {
        map[key] = {
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          purchase_value: 0,
          reach: 0,
        }
      }
      map[key].impressions += insight.impressions || 0
      map[key].clicks += insight.clicks || 0
      map[key].spend += insight.spend || 0
      map[key].conversions += insight.conversions || 0
      map[key].purchase_value += insight.purchase_value || 0
      map[key].reach += insight.reach || 0
    })
    return map
  }

  const currentMap = aggregateInsights(currentInsightsData)
  const previousMap = aggregateInsights(previousInsightsData)

  // Generate alerts
  const alerts = generateAlerts(campaigns, currentMap, previousMap)

  // Store alerts with deduplication
  const storedAlerts = []
  for (const alert of alerts) {
    const rule = ALERT_RULES.find((r) => r.type === alert.alertType)
    const dedupKey = generateDedupKey(alert.alertType, alert.campaignId, rule?.dedupWindowHours || 24)

    // Check for existing dedup entry
    const { data: existingDedup } = await supabase
      .from('alert_dedup')
      .select('id')
      .eq('alert_key', dedupKey)
      .single()

    if (existingDedup) {
      // Skip duplicate
      continue
    }

    // Insert alert
    const { data: insertedAlert, error: insertError } = await supabase
      .from('campaign_alerts')
      .insert({
        campaign_id: campaigns.find((c: any) => c.campaign_id === alert.campaignId)?.id,
        workspace_id: workspaceId,
        alert_type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metric_name: alert.metricName,
        metric_value: alert.metricValue,
        threshold_value: alert.thresholdValue,
        previous_value: alert.previousValue,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert alert:', insertError)
      continue
    }

    // Insert dedup record
    await supabase.from('alert_dedup').insert({
      alert_key: dedupKey,
      alert_id: insertedAlert?.id,
    })

    storedAlerts.push(insertedAlert)
  }

  return NextResponse.json({
    alerts: storedAlerts,
    generated: alerts.length,
    stored: storedAlerts.length,
    hasData: storedAlerts.length > 0,
  })
}
