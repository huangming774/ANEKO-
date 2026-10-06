import { createClient } from '@/lib/supabase-server'
import { ok, requireAdmin } from '@/lib/api-utils'
import {
  failNoStore,
  noStoreHeaders,
  requireCatmouseStore,
  setGameEnabled,
} from '@/lib/catmouse-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 切换全局开关。暂停后公开 sync/players 返回 403（玩家端自动显示暂停态），
 * leave 不受影响（暂停也要能离场清理）。
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) {
    auth.response.headers.set('Cache-Control', 'no-store')
    return auth.response
  }

  const body = await request.json().catch(() => null)
  const enabled = body && typeof body === 'object' ? (body as { enabled?: unknown }).enabled : undefined
  if (typeof enabled !== 'boolean') {
    return failNoStore('enabled 必须是布尔值', 400)
  }

  const notReady = requireCatmouseStore()
  if (notReady) return notReady

  try {
    await setGameEnabled(enabled)
    return ok({ enabled }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('[catmouse] 开关设置失败:', error)
    return failNoStore('实时位置服务暂不可用', 500)
  }
}
