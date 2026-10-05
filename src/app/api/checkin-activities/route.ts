import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import type { CheckinActivity } from '@/lib/app-types'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { data, error } = await supabase
    .from('checkin_activities')
    .select('*, checkins(count)')
    .order('created_at', { ascending: false })

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  const activities: CheckinActivity[] = (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    note: row.note,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    is_active: row.is_active,
    checkin_count: row.checkins?.[0]?.count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  return ok(activities, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const title = readString(body.title)
  const note = readString(body.note)
  const startsAt = parseIso(body.starts_at)
  const endsAt = parseIso(body.ends_at)

  if (!title || title.length > 80) return fail('请填写活动标题（1-80 字符）')
  if (note.length > 500) return fail('备注最多 500 字符')
  if (!startsAt || !endsAt) return fail('请填写有效的开始/结束时间')
  if (endsAt <= startsAt) return fail('结束时间必须晚于开始时间')

  const { data, error } = await supabase
    .from('checkin_activities')
    .insert({
      title,
      note,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      is_active: body.is_active === undefined ? true : Boolean(body.is_active),
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({ ...data, checkin_count: 0 }, { status: 201 })
}

function parseIso(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
