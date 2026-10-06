import { createClient } from '@/lib/supabase-server'
import { ok, requireAdmin } from '@/lib/api-utils'
import {
  failNoStore,
  isGameEnabled,
  listAllPlayersAdmin,
  noStoreHeaders,
  requireCatmouseStore,
} from '@/lib/catmouse-store'

export const runtime = 'nodejs'
// 实时名单随时变化：禁用静态化与边缘缓存
export const dynamic = 'force-dynamic'

/**
 * 管理端总览：全部在线玩家位置（仅 45s 内活跃）+ 游戏开关状态。
 * 暂停期间管理端仍可查看（闸门只拦公开 sync/players）。
 */
export async function GET() {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) {
    auth.response.headers.set('Cache-Control', 'no-store')
    return auth.response
  }

  const notReady = requireCatmouseStore()
  if (notReady) return notReady

  try {
    const [players, enabled] = await Promise.all([listAllPlayersAdmin(), isGameEnabled()])
    return ok({ players, enabled }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('[catmouse] 管理端读取失败:', error)
    return failNoStore('实时位置服务暂不可用', 500)
  }
}
