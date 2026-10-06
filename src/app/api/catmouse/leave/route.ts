import { ok } from '@/lib/api-utils'
import {
  failNoStore,
  noStoreHeaders,
  removePlayer,
  requireCatmouseStore,
} from '@/lib/catmouse-store'
import { enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 与 validateSyncBody 的 id 规则一致（字母数字与连字符下划线，8-64 位）
const ID_RE = /^[a-zA-Z0-9_-]{8,64}$/

/**
 * 主动离场（pagehide sendBeacon 调用）。幂等：删除不存在的 id 也回 ok。
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    namespace: 'catmouse-leave',
    limit: 60,
    windowSeconds: 300,
  })
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const id = body && typeof body === 'object' ? (body as { id?: unknown }).id : undefined
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    return failNoStore('id 非法', 400)
  }

  const notReady = requireCatmouseStore()
  if (notReady) return notReady

  try {
    await removePlayer(id)
    return ok({ ok: true }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('[catmouse] leave 删除失败:', error)
    return failNoStore('实时位置服务暂不可用', 502)
  }
}
