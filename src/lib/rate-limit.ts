import { NextResponse } from 'next/server'
import { hasRedisConfig, redisExpire, redisIncr, redisTTL } from '@/lib/redis'

/**
 * 公开写接口的轻量频控（无新依赖）。
 * - 有 Upstash 时用固定窗口计数（key: rl:{namespace}:{identifier}）
 * - 无 Redis / Redis 调用出错时降级为进程内内存桶（多实例部署下为每实例各自限流）
 * 安全控制：只看 hasRedisConfig()，不受设置页「启用 Redis 缓存」开关影响。
 */

type RateLimitOptions = {
  namespace: string
  limit: number
  windowSeconds: number
  identifier?: string
}

type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number }

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

// 进程内内存桶（Redis 缺失/故障时的降级后端）
const memoryBuckets = new Map<string, { count: number; expiresAt: number }>()

function memoryCheck(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now()

  // 惰性清理过期项，防止 Map 无限增长（tsconfig target 为 es5，用 forEach 而非 for...of）
  if (memoryBuckets.size > 1000) {
    memoryBuckets.forEach((bucket, entryKey) => {
      if (bucket.expiresAt <= now) memoryBuckets.delete(entryKey)
    })
  }

  const bucket = memoryBuckets.get(key)
  if (!bucket || bucket.expiresAt <= now) {
    memoryBuckets.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 })
    return { ok: true, remaining: limit - 1 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000))
    return { ok: false, retryAfterSeconds }
  }
  return { ok: true, remaining: limit - bucket.count }
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { namespace, limit, windowSeconds, identifier = '' } = options
  const key = `rl:${namespace}:${identifier}`

  if (hasRedisConfig()) {
    try {
      const count = await redisIncr(key)
      if (count === 1) {
        await redisExpire(key, windowSeconds)
      }
      if (count > limit) {
        const ttl = await redisTTL(key)
        return { ok: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds }
      }
      return { ok: true, remaining: Math.max(0, limit - count) }
    } catch {
      // Redis 异常降级到内存桶：Redis 故障不等于解除限流
    }
  }

  return memoryCheck(key, limit, windowSeconds)
}

/** 超限时返回 429 Response，未超限返回 null。调用方：const limited = await enforceRateLimit(...); if (limited) return limited */
export async function enforceRateLimit(
  request: Request,
  options: Omit<RateLimitOptions, 'identifier'> & { identifier?: string }
): Promise<Response | null> {
  const identifier = options.identifier ?? getClientIp(request)
  const result = await checkRateLimit({ ...options, identifier })

  if (result.ok) return null

  return NextResponse.json(
    { error: '请求过于频繁，请稍后再试' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
  )
}
