import { createClient } from '@/lib/supabase-server'
import { ok, requireAdmin } from '@/lib/api-utils'
import {
  failNoStore,
  kickPlayer,
  noStoreHeaders,
  requireCatmouseStore,
} from '@/lib/catmouse-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 与 validateSyncBody / leave 的 id 规则一致（字母数字与连字符下划线，8-64 位）
const ID_RE = /^[a-zA-Z0-9_-]{8,64}$/

/**
 * 踢出单个玩家（幂等）。该玩家下一轮上报会重新上线，需配合暂停开关彻底禁入。
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) {
    auth.response.headers.set('Cache-Control', 'no-store')
    return auth.response
  }

  const body = await request.json().catch(() => null)
  const id = body && typeof body === 'object' ? (body as { id?: unknown }).id : undefined
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    return failNoStore('id 非法', 400)
  }

  const notReady = requireCatmouseStore()
  if (notReady) return notReady

  try {
    await kickPlayer(id)
    return ok({ ok: true }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('[catmouse] 踢出失败:', error)
    return failNoStore('实时位置服务暂不可用', 500)
  }
}
