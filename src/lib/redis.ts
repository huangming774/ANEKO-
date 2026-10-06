import { Redis } from '@upstash/redis';

/**
 * Upstash Redis REST 客户端
 * 从 .env.local 或环境变量中读取配置
 *
 * 在 Upstash 控制台获取:
 *   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=xxxxx
 */

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export default redis;

// ====== 配置检测 ======

/** 环境变量是否已配置（零 I/O）；未配置时所有 Redis 调用方应直接降级为直连数据库 */
export function hasRedisConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// ====== 常用操作封装 ======

// --- 字符串操作 ---
export async function redisSet(key: string, value: string, ttl?: number) {
  if (ttl) {
    return redis.set(key, value, { ex: ttl });
  }
  return redis.set(key, value);
}

export async function redisGet(key: string): Promise<string | null> {
  return redis.get(key);
}

export async function redisDel(key: string) {
  return redis.del(key);
}

// --- JSON 对象存取 ---
export async function redisSetJSON(key: string, value: object, ttl?: number) {
  return redis.set(key, value, ttl ? { ex: ttl } : undefined);
}

export async function redisGetJSON<T = object>(key: string): Promise<T | null> {
  return redis.get(key);
}

/** MGET 一拍读多个 JSON 键；缺失的键对应位置为 null。比逐键 GET 少 (n-1) 次往返 */
export async function redisMGetJSON<T = unknown>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) {
    return [];
  }
  return redis.mget<T[]>(...keys) as Promise<(T | null)[]>;
}

// --- Hash 操作 ---
export async function redisHSet(key: string, field: string, value: string) {
  return redis.hset(key, { [field]: value });
}

export async function redisHGet(key: string, field: string): Promise<string | null> {
  return redis.hget(key, field);
}

export async function redisHGetAll(key: string): Promise<Record<string, string> | null> {
  return redis.hgetall(key);
}

export async function redisHDel(key: string, ...fields: string[]) {
  if (fields.length === 0) {
    return 0;
  }

  return redis.hdel(key, ...fields);
}

// --- List 操作 ---
export async function redisLPush(key: string, ...values: string[]) {
  return redis.lpush(key, ...values);
}

export async function redisLRange(key: string, start: number, stop: number): Promise<string[]> {
  return redis.lrange(key, start, stop);
}

// --- Set 操作 ---
export async function redisSAdd(key: string, ...members: string[]) {
  if (members.length === 0) {
    return 0;
  }

  const [member, ...rest] = members;
  return redis.sadd(key, member, ...rest);
}

export async function redisSMembers(key: string): Promise<string[]> {
  return redis.smembers(key);
}

// --- 计数器 ---
export async function redisIncr(key: string) {
  return redis.incr(key);
}

export async function redisIncrBy(key: string, increment: number) {
  return redis.incrby(key, increment);
}

// --- 过期时间 ---
export async function redisExpire(key: string, seconds: number) {
  return redis.expire(key, seconds);
}

export async function redisTTL(key: string): Promise<number> {
  return redis.ttl(key);
}

// --- 检查连接 ---
export async function redisCheckConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
