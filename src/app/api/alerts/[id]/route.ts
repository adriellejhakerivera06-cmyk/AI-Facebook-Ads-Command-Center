import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status } = body

  if (!status || !['resolved', 'dismissed', 'active'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Get the alert to check workspace access
  const { data: alert } = await supabase
    .from('campaign_alerts')
    .select('workspace_id')
    .eq('id', id)
    .single()

  if (!alert) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  }

  // Verify access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', alert.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const updates: any = { status }
  if (status === 'resolved') {
    updates.resolved_at = new Date().toISOString()
  } else if (status === 'dismissed') {
    updates.dismissed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('campaign_alerts')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
