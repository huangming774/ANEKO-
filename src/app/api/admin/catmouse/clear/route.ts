import { createClient } from '@/lib/supabase-server'
import { ok, requireAdmin } from '@/lib/api-utils'
import {
  clearAllPlayers,
  failNoStore,
  noStoreHeaders,
  requireCatmouseStore,
} from '@/lib/catmouse-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 清空全部玩家位置（玩家端下一轮上报会重新上线，仅清当前快照）。
 */
export async function POST() {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) {
    auth.response.headers.set('Cache-Control', 'no-store')
    return auth.response
  }

  const notReady = requireCatmouseStore()
  if (notReady) return notReady

  try {
    await clearAllPlayers()
    return ok({ ok: true }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('[catmouse] 清空失败:', error)
    return failNoStore('实时位置服务暂不可用', 500)
  }
}
