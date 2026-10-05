import { createAdminClient } from '@/lib/supabase-server'
import { fail, ok } from '@/lib/api-utils'

export const runtime = 'nodejs'
// 活动状态随时变化（admin 开关/时间窗/新建）：必须禁用静态化与边缘缓存，
// 否则 GET 会被 Next/Vercel 冻结成构建时的旧响应（曾导致线上恒为「无活动」）
export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store' }

/**
 * 当前可签到活动（公开，不缓存——admin 开关/改时间须立刻生效）。
 * 多活动时间窗重叠时取最快结束的那个，保证行为确定。
 */
export async function GET() {
  if (!process.env.SUPABASE_SECRET_KEY) {
    return fail('服务端 SUPABASE_SECRET_KEY 未配置', 500)
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: activity, error } = await admin
    .from('checkin_activities')
    .select('id, title, note, starts_at, ends_at')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('ends_at')
    .limit(1)
    .maybeSingle()

  if (error) {
    // 表未创建时按「无活动」处理（与 hero-slides 公开接口容错一致）
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return ok(null, { headers: noStore })
    }
    return fail(normalizeOrMessage(error), 500)
  }

  if (!activity) {
    return ok(null, { headers: noStore })
  }

  const { count } = await admin
    .from('checkins')
    .select('id', { count: 'exact', head: true })
    .eq('activity_id', activity.id)

  return ok(
    {
      ...activity,
      checked_in_count: count ?? 0,
      server_time: new Date().toISOString(),
    },
    { headers: noStore },
  )
}

function normalizeOrMessage(error: { message?: string }): string {
  if (error.message?.includes('Invalid API key')) {
    return '服务端 SUPABASE_SECRET_KEY 无效或已过期，请联系管理员更新配置'
  }
  return error.message || '查询失败'
}
