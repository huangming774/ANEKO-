// Upstash Redis 缓存层（服务端）
// 开关链路：hasRedisConfig()（零 I/O）→ site_settings.redis_enabled（未缓存的单行读，保证开关实时生效）
// 未配置环境变量或开关关闭时，行为与不接缓存完全一致（BYPASS）。
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'
import { hasRedisConfig, redisDelMany, redisGetJSON, redisKeys, redisSetJSON } from '@/lib/redis'

export const CACHE_TTL_SECONDS = 60

/** 读取 Redis 开关：任一环节不满足即关闭（fail-safe） */
export async function isRedisEnabled(supabase: SupabaseClient<Database>): Promise<boolean> {
  if (!hasRedisConfig()) return false

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('redis_enabled')
      .eq('id', true)
      .maybeSingle()

    if (error) return false
    return data?.redis_enabled === true
  } catch {
    return false
  }
}

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

  try {
    const hit = await redisGetJSON<unknown>(key)
    if (hit !== null && hit !== undefined) {
      return NextResponse.json(hit, { headers: { 'X-Cache': 'HIT' } })
    }
  } catch {
    // Redis 不可用 → 降级为直读
  }

  const res = await load()
  if (res.status < 400) {
    try {
      // clone：本体还要返回给客户端
      const body = await res.clone().json()
      await redisSetJSON(key, body as object, CACHE_TTL_SECONDS)
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
 * 资源级失效：只看 hasRedisConfig()，不看开关（关闭期间也保持 Redis 干净，避免重开时读到旧键）。
 * 绝不抛错，best-effort。
 */
export async function clearCache(resource: string): Promise<void> {
  if (!hasRedisConfig()) return

  try {
    const keys = await redisKeys(`cache:${resource}:*`)
    if (keys.length > 0) {
      await redisDelMany(keys)
    }
  } catch {
    // best effort
  }
}
