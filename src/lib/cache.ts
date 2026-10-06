// Upstash Redis 缓存层（服务端）
// 开关链路：hasRedisConfig()（零 I/O）→ site_settings.redis_enabled（进程内 memo 5s：不再每请求查一次 DB，开关切换最迟 5s 生效）
// 未配置环境变量或开关关闭时，行为与不接缓存完全一致（BYPASS）。
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'
import { hasRedisConfig, redisExpire, redisIncr, redisMGetJSON, redisSetJSON } from '@/lib/redis'

export const CACHE_TTL_SECONDS = 60

// 版本键只是个计数器，给个长 TTL 防止无期限残留；即使过期从 0 重来也安全（旧条目版本失配只会 MISS，不会脏读）
const VERSION_KEY_TTL_SECONDS = 30 * 24 * 3600

// ====== 开关读取（进程内 memo） ======

const SWITCH_MEMO_TTL_MS = 5_000
let switchMemo: { enabled: boolean; expiresAt: number } | null = null

/**
 * 读取 Redis 开关：任一环节不满足即关闭（fail-safe）。
 * 结果进程内 memo 5 秒（serverless 各实例独立），换掉「每个缓存请求都先查一次 DB」；
 * 代价是后台切换开关最迟 5 秒生效。
 */
export async function isRedisEnabled(supabase: SupabaseClient<Database>): Promise<boolean> {
  if (!hasRedisConfig()) return false

  const now = Date.now()
  if (switchMemo && now < switchMemo.expiresAt) return switchMemo.enabled

  let enabled = false
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('redis_enabled')
      .eq('id', true)
      .maybeSingle()

    if (!error) enabled = data?.redis_enabled === true
  } catch {
    // fail-safe：查不到即关闭
  }
  switchMemo = { enabled, expiresAt: now + SWITCH_MEMO_TTL_MS }
  return enabled
}

// ====== 版本号失效（O(1) 替代 KEYS 扫描） ======

// key 约定 cache:{resource}:{variant}；版本键按 resource 划分，clearCache 一次 INCR 即让该资源全部条目失配
const versionKey = (resource: string) => `cache:ver:${resource}`
const resourceOf = (key: string) => key.split(':')[1] ?? key

// 条目信封：v = 写入时的资源版本号。旧版本/旧格式（裸 body 无 v）都会版本失配，只会 MISS 不会脏读
type CacheEnvelope = { v: number; body: unknown }

/**
 * 包装 GET 处理逻辑。loader 返回完整 Response（沿用 ok()/fail() 惯例）：
 * - fail()（≥400）原样返回、绝不缓存；loader 抛出的异常原样向上传播
 * - HIT 时重放缓存的 `{ data }` envelope
 * - 响应带 X-Cache: HIT | MISS | BYPASS 头便于排查
 */
export async function cachedJSON(
  supabase: SupabaseClient<Database>,
  key: string,
  load: () => Promise<Response>,
): Promise<Response> {
  if (!(await isRedisEnabled(supabase))) {
    return tag(await load(), 'BYPASS')
  }

  let version = 0
  let redisOk = true

  try {
    // MGET 一拍读齐条目与当前版本号
    const [hit, ver] = await redisMGetJSON<unknown>([key, versionKey(resourceOf(key))])
    if (typeof ver === 'number') version = ver
    const envelope = hit as Partial<CacheEnvelope> | null
    if (envelope && envelope.v === version && envelope.body !== undefined) {
      return NextResponse.json(envelope.body, { headers: { 'X-Cache': 'HIT' } })
    }
  } catch {
    // Redis 不可用 → 降级为直读；版本未知，本次不再写缓存
    redisOk = false
  }

  const res = await load()
  if (redisOk && res.status < 400) {
    try {
      // clone：本体还要返回给客户端。版本用读取时刻的快照——
      // 若 load 期间发生 clearCache，条目一写入即失配（宁可 MISS，不缓存脏数据）
      const body = await res.clone().json()
      await redisSetJSON(key, { v: version, body } as CacheEnvelope, CACHE_TTL_SECONDS)
    } catch {
      // 写缓存失败不影响响应
    }
  }
  return tag(res, 'MISS')
}

function tag(res: Response, value: string) {
  res.headers.set('X-Cache', value)
  return res
}

/**
 * 资源级失效：资源版本号 +1，该资源下全部条目立即失配，旧条目靠 TTL 自灭。
 * 只看 hasRedisConfig()，不看开关（关闭期间照常自增版本，重开后旧条目天然不可见）。
 * O(1)，不再 KEYS 扫全键空间。绝不抛错，best-effort。
 */
export async function clearCache(resource: string): Promise<void> {
  if (!hasRedisConfig()) return

  try {
    const key = versionKey(resource)
    await redisIncr(key)
    await redisExpire(key, VERSION_KEY_TTL_SECONDS)
  } catch {
    // best effort
  }
}
