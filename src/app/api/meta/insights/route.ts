import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const connectionId = searchParams.get('connection_id')
  const entityType = searchParams.get('entity_type') || 'campaign'
  const entityId = searchParams.get('entity_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  if (!connectionId) {
    return NextResponse.json({ error: 'connection_id is required' }, { status: 400 })
  }

  // Verify access
  const { data: connection } = await supabase
    .from('meta_connections')
    .select('workspace_id')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', connection.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Build query
  let query = supabase
    .from('meta_insights')
    .select('*')
    .eq('meta_connection_id', connectionId)
    .eq('entity_type', entityType)
    .order('date', { ascending: false })

  if (entityId) {
    query = query.eq('entity_id', entityId)
  }

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: insights, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate insights by entity
  const aggregated = (insights || []).reduce((acc: Record<string, any>, insight: any) => {
    const key = insight.entity_id_meta
    if (!acc[key]) {
      acc[key] = {
        entity_id_meta: key,
        entity_type: insight.entity_type,
        impressions: 0,
        clicks: 0,
        spend: 0,
        reach: 0,
        conversions: 0,
        purchase_value: 0,
        date_count: 0
      }
    }
    acc[key].impressions += insight.impressions || 0
    acc[key].clicks += insight.clicks || 0
    acc[key].spend += insight.spend || 0
    acc[key].reach += insight.reach || 0
    acc[key].conversions += insight.conversions || 0
    acc[key].purchase_value += insight.purchase_value || 0
    acc[key].date_count += 1
    return acc
  }, {})

  // Calculate derived metrics
  Object.values(aggregated).forEach((entity: any) => {
    entity.ctr = entity.impressions > 0 ? (entity.clicks / entity.impressions) * 100 : 0
    entity.cpc = entity.clicks > 0 ? entity.spend / entity.clicks : 0
    entity.cpm = entity.impressions > 0 ? (entity.spend / entity.impressions) * 1000 : 0
    entity.roas = entity.spend > 0 ? entity.purchase_value / entity.spend : 0
  })

  return NextResponse.json({
    insights: Object.values(aggregated),
    raw: insights
  })
}
