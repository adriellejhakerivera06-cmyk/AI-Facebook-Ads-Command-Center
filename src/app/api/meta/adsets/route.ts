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
  const campaignId = searchParams.get('campaign_id')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '100')

  // Build query
  let query = supabase
    .from('meta_ad_sets')
    .select(`
      id,
      adset_id,
      name,
      campaign_id,
      campaign_id_meta,
      status,
      effective_status,
      optimization_goal,
      daily_budget,
      lifetime_budget,
      start_time,
      end_time,
      last_synced_at,
      campaign:meta_campaigns(id, name, campaign_id),
      ad_account:meta_ad_accounts(id, name, currency)
    `)
    .order('name', { ascending: true })
    .limit(limit)

  if (connectionId) {
    query = query.eq('meta_connection_id', connectionId)
  }

  if (campaignId) {
    query = query.eq('campaign_id', campaignId)
  }

  if (status && status !== 'all') {
    query = query.or(`status.eq.${status},effective_status.eq.${status}`)
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data: adsets, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(adsets)
}
