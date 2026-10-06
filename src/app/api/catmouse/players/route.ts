import { ok } from '@/lib/api-utils'
import {
  failNoStore,
  noStoreHeaders,
  listLivePlayers,
  requireCatmouseStore,
  requireGameEnabled,
} from '@/lib/catmouse-store'
import { enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
// 在线名单随时变化：禁用静态化与边缘缓存
export const dynamic = 'force-dynamic'

/**
 * 在线全员（公开只读，供未开定位/仅围观的客户端轮询）。
 * 响应 { data: { players } }，ts 降序；过期条目读取时已惰性清理。
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, {
    namespace: 'catmouse-players',
    limit: 120,
    windowSeconds: 60,
  })
  if (limited) return limited

  const notReady = requireCatmouseStore()
  if (notReady) return notReady

  // 后台暂停闸门：玩家端以 403 识别暂停态
  const paused = await requireGameEnabled()
  if (paused) return paused

  try {
    const players = await listLivePlayers()
    return ok({ players }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('[catmouse] players 读取失败:', error)
    return failNoStore('实时位置服务暂不可用', 502)
  }
}
