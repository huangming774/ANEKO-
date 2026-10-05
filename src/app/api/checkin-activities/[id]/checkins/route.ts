import { createClient, createAdminClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import { enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// CN 允许中英文数字与常用昵称符号；拒绝换行/控制符/零宽字符
const CN_PATTERN = /^[一-龥A-Za-z0-9 _.\-()（）]{1,32}$/

/**
 * 匿名签到提交（公开 + 限流）。坐标属隐私，checkins 表 RLS 仅管理员，
 * 这里走 service role 显式列写入；响应不含他人坐标。
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // 两档限流：同活动密集提交 + 跨活动全局扫射
  const limitedActivity = await enforceRateLimit(request, {
    namespace: `checkin-submit:${params.id}`,
    limit: 5,
    windowSeconds: 300,
  })
  if (limitedActivity) return limitedActivity

  const limitedGlobal = await enforceRateLimit(request, {
    namespace: 'checkin-submit',
    limit: 20,
    windowSeconds: 600,
  })
  if (limitedGlobal) return limitedGlobal

  if (!process.env.SUPABASE_SECRET_KEY) {
    return fail('服务端 SUPABASE_SECRET_KEY 未配置', 500)
  }

  const body = await request.json().catch(() => ({}))
  const cn = readString(body.cn)
  const latitude = body.latitude
  const longitude = body.longitude

  if (!CN_PATTERN.test(cn)) {
    return fail('CN 需为 1-32 个字符（中英文、数字或 _.-()）')
  }

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude) || (latitude === 0 && longitude === 0)) {
    return fail('定位坐标无效，请重新定位后再提交')
  }

  const accuracy = normalizeAccuracy(body.accuracy)

  const admin = createAdminClient()
  const { data: activity, error: activityError } = await admin
    .from('checkin_activities')
    .select('id, is_active, starts_at, ends_at')
    .eq('id', params.id)
    .maybeSingle()

  if (activityError) {
    if (activityError.code === '42P01' || activityError.code === 'PGRST205') {
      return fail('活动不存在', 404)
    }
    return fail(normalizeSupabaseError(activityError), 500, activityError)
  }
  if (!activity) return fail('活动不存在', 404)

  const now = Date.now()
  if (!activity.is_active) return fail('活动未开启', 403)
  if (now < new Date(activity.starts_at).getTime()) return fail('签到尚未开始', 403)
  if (now > new Date(activity.ends_at).getTime()) return fail('签到已结束', 403)

  // 预查重复（友好路径）；并发竞态由唯一索引 23505 兜底
  const { data: existing, error: existsError } = await admin
    .from('checkins')
    .select('id')
    .eq('activity_id', params.id)
    .eq('cn', cn)
    .maybeSingle()

  if (existsError) {
    return fail(normalizeSupabaseError(existsError), 500, existsError)
  }
  if (existing) return fail('已签到', 409)

  const { data, error } = await admin
    .from('checkins')
    .insert({
      activity_id: params.id,
      cn,
      latitude,
      longitude,
      accuracy,
    })
    .select('id, cn, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return fail('已签到', 409)
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data, { status: 201 })
}

/** 管理端签到列表（含坐标） */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { data, error } = await supabase
    .from('checkins')
    .select('id, cn, latitude, longitude, accuracy, created_at')
    .eq('activity_id', params.id)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data || [], { headers: { 'Cache-Control': 'no-store' } })
}

function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180
}

function normalizeAccuracy(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 50000) return null
  return value
}
