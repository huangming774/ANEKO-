import { ok } from '@/lib/api-utils'
import { validateSyncBody } from '@/lib/catmouse'
import {
  failNoStore,
  noStoreHeaders,
  requireCatmouseStore,
  requireGameEnabled,
  syncPlayer,
} from '@/lib/catmouse-store'
import { enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
// 位置每秒在变：禁用静态化与边缘缓存，轮询必须拿到实时响应
export const dynamic = 'force-dynamic'

/**
 * 上报自身位置并拉取在线全员（HTTP 轮询，约 2.5s/次；不用 WebSocket）。
 * 响应 { data: { players } }，含自己，ts 降序。
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const validated = validateSyncBody(body)
  if (!validated.ok) return failNoStore(validated.error, 400)
  const data = validated.data

  // 拒绝 null island：GPS 未就绪时的假坐标（checkins 同款校验）
  if (data.lat === 0 && data.lng === 0) {
    return failNoStore('定位坐标无效，请重新定位后再试')
  }

  // 两档限流：每 id 常态轮询额度（2.5s/次 ≈ 24 次/分钟）+ 每 IP 全局扫射额度
  const limitedId = await enforceRateLimit(request, {
    namespace: 'catmouse-sync',
    limit: 60,
    windowSeconds: 60,
    identifier: data.id,
  })
  if (limitedId) return limitedId

  const limitedIp = await enforceRateLimit(request, {
    namespace: 'catmouse-sync-ip',
    limit: 300,
    windowSeconds: 300,
  })
  if (limitedIp) return limitedIp

  const notReady = requireCatmouseStore()
  if (notReady) return notReady

  // 后台暂停闸门：玩家端以 403 识别暂停态
  const paused = await requireGameEnabled()
  if (paused) return paused

  try {
    const players = await syncPlayer(data)
    return ok({ players }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('[catmouse] sync 写入失败:', error)
    return failNoStore('实时位置服务暂不可用', 502)
  }
}
