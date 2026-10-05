import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import type { Database } from '@/database.types'

type CheckinActivityUpdate = Database['public']['Tables']['checkin_activities']['Update']

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const updates: CheckinActivityUpdate = {}

  if (body.title !== undefined) {
    const title = readString(body.title)
    if (!title || title.length > 80) return fail('请填写活动标题（1-80 字符）')
    updates.title = title
  }
  if (body.note !== undefined) {
    const note = readString(body.note)
    if (note.length > 500) return fail('备注最多 500 字符')
    updates.note = note
  }
  if (body.starts_at !== undefined) {
    const startsAt = parseIso(body.starts_at)
    if (!startsAt) return fail('开始时间格式不正确')
    updates.starts_at = startsAt.toISOString()
  }
  if (body.ends_at !== undefined) {
    const endsAt = parseIso(body.ends_at)
    if (!endsAt) return fail('结束时间格式不正确')
    updates.ends_at = endsAt.toISOString()
  }
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)

  if (Object.keys(updates).length === 0) {
    return fail('没有需要更新的内容')
  }

  // 交叉校验时间窗（可能只改一端，需读现存行补全）
  if (updates.starts_at !== undefined || updates.ends_at !== undefined) {
    const { data: existing, error: readError } = await supabase
      .from('checkin_activities')
      .select('starts_at, ends_at')
      .eq('id', params.id)
      .single()

    if (readError) {
      return fail(normalizeSupabaseError(readError), 500, readError)
    }

    const nextStart = updates.starts_at ?? existing.starts_at
    const nextEnd = updates.ends_at ?? existing.ends_at
    if (new Date(nextEnd) <= new Date(nextStart)) {
      return fail('结束时间必须晚于开始时间')
    }
  }

  const { data, error } = await supabase
    .from('checkin_activities')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { error } = await supabase.from('checkin_activities').delete().eq('id', params.id)

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({ success: true })
}

function parseIso(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
