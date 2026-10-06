// 猫鼠游戏：Redis 存取层（仅服务端，前端不得引入）。
// 位置共享不落库：全量存 HASH catmouse:players（field=id，value=JSON 字符串），
// 每次读取惰性清理过期/脏条目，玩家离线 45s 自然下线，无需定时任务。
// 不用 KEYS/SCAN（项目惯例）；单 HASH 读写，百人内量级无性能问题。

import { fail } from '@/lib/api-utils'
import { CATMOUSE_STALE_MS, type CatMousePlayer, type CatMouseSyncRequest } from '@/lib/catmouse'
import { hasRedisConfig, redisDel, redisGet, redisHDel, redisHGetAll, redisHSet, redisSet } from '@/lib/redis'

const PLAYERS_KEY = 'catmouse:players'

/** 全局开关键：字符串 '1'/'0'，缺省视为开启 */
const ENABLED_KEY = 'catmouse:enabled'

/** 同 id 两次上报最小间隔：挡 StrictMode 双触发/双开造成的写放大（服务端时钟判定） */
const MIN_SYNC_INTERVAL_MS = 400

/** 惰性清理分批 HDEL 的批量大小，避免长期无人访问后一次删太多 */
const PRUNE_BATCH_SIZE = 50

export const noStoreHeaders = { 'Cache-Control': 'no-store' }

/** fail() 不支持自定义响应头，这里补 no-store（位置接口任何响应都不可缓存） */
export function failNoStore(message: string, status = 400, details?: unknown) {
  const response = fail(message, status, details)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

/** Redis 未配置时返回 503 响应；已就绪返回 null（与 enforceRateLimit 的返回约定一致） */
export function requireCatmouseStore(): Response | null {
  if (hasRedisConfig()) return null
  return failNoStore('实时位置服务未配置', 503)
}

/**
 * 上报自身位置并返回在线全员（含自己，ts 降序）。
 * 400ms 内的重复上报直接回当前列表不写入，其余路径写入后合成本次响应，省一次回读。
 */
export async function syncPlayer(data: CatMouseSyncRequest): Promise<CatMousePlayer[]> {
  const now = Date.now()
  const live = await readLivePlayers()

  const existing = findById(live, data.id)
  if (existing && now - existing.ts < MIN_SYNC_INTERVAL_MS) {
    return sortByTsDesc(live)
  }

  const self: CatMousePlayer = {
    id: data.id,
    cn: data.cn,
    lat: data.lat,
    lng: data.lng,
    ts: now,
  }
  if (typeof data.accuracy === 'number') {
    self.accuracy = data.accuracy
  }
  await redisHSet(PLAYERS_KEY, self.id, JSON.stringify(self))

  const others = live.filter((player) => player.id !== self.id)
  others.push(self)
  return sortByTsDesc(others)
}

/** 在线全员（ts 降序）。GET /players 用，读取同样触发惰性清理 */
export async function listLivePlayers(): Promise<CatMousePlayer[]> {
  return sortByTsDesc(await readLivePlayers())
}

/** 主动离场。幂等：条目不存在时 HDEL 空操作 */
export async function removePlayer(id: string): Promise<void> {
  await redisHDel(PLAYERS_KEY, id)
}

/** 读全量 → 解析丢脏数据 → 过期条目分批 HDEL → 返回在线列表 */
async function readLivePlayers(): Promise<CatMousePlayer[]> {
  const all = await redisHGetAll(PLAYERS_KEY)
  const now = Date.now()
  const live: CatMousePlayer[] = []
  const dropIds: string[] = []

  if (all) {
    Object.keys(all).forEach((field) => {
      const player = parsePlayer(all[field])
      // 脏数据（解析失败/field 与 id 不一致）与过期条目一并清掉，自愈
      if (!player || player.id !== field || now - player.ts > CATMOUSE_STALE_MS) {
        dropIds.push(field)
        return
      }
      live.push(player)
    })
  }

  for (let i = 0; i < dropIds.length; i += PRUNE_BATCH_SIZE) {
    await redisHDel(PLAYERS_KEY, ...dropIds.slice(i, i + PRUNE_BATCH_SIZE))
  }

  return live
}

/** 值是 JSON 字符串；容错历史脏数据（对象/坏 JSON/缺字段一律丢弃） */
function parsePlayer(raw: unknown): CatMousePlayer | null {
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!obj || typeof obj !== 'object') return null
    const candidate = obj as Partial<CatMousePlayer>
    if (typeof candidate.id !== 'string' || typeof candidate.cn !== 'string') return null
    if (
      typeof candidate.lat !== 'number' ||
      typeof candidate.lng !== 'number' ||
      typeof candidate.ts !== 'number' ||
      !Number.isFinite(candidate.lat) ||
      !Number.isFinite(candidate.lng) ||
      !Number.isFinite(candidate.ts)
    ) {
      return null
    }
    const player: CatMousePlayer = {
      id: candidate.id,
      cn: candidate.cn,
      lat: candidate.lat,
      lng: candidate.lng,
      ts: candidate.ts,
    }
    if (typeof candidate.accuracy === 'number' && Number.isFinite(candidate.accuracy)) {
      player.accuracy = candidate.accuracy
    }
    return player
  } catch {
    return null
  }
}

// tsconfig target 为 es5，避免 Array.prototype.find 等新运行时 API，用过滤取首项
function findById(players: CatMousePlayer[], id: string): CatMousePlayer | undefined {
  const matched = players.filter((player) => player.id === id)
  return matched.length > 0 ? matched[0] : undefined
}

function sortByTsDesc(players: CatMousePlayer[]): CatMousePlayer[] {
  return players.slice().sort((a, b) => b.ts - a.ts)
}

// ---- 全局开关（后台可暂停游戏；公开 sync/players 经 requireGameEnabled 拦截） ----

/** 游戏是否开启：键缺省视为开启，仅显式 '0' 为暂停 */
export async function isGameEnabled(): Promise<boolean> {
  const value = await redisGet(ENABLED_KEY)
  return value !== '0'
}

export async function setGameEnabled(enabled: boolean): Promise<void> {
  await redisSet(ENABLED_KEY, enabled ? '1' : '0')
}

/** 暂停闸门：已暂停返回 403 响应（玩家端以 res.status===403 识别），否则 null。
 *  Redis 异常时 502——与 sync/players 的 Redis 故障口径一致，不误放行为开。 */
export async function requireGameEnabled(): Promise<Response | null> {
  try {
    if (await isGameEnabled()) return null
  } catch (error) {
    console.error('[catmouse] 开关读取失败:', error)
    return failNoStore('实时位置服务暂不可用', 502)
  }
  return failNoStore('游戏已暂停，请稍后再来', 403)
}

// ---- 管理端（/api/admin/catmouse/*） ----

/** 管理端在线名单：与玩家端同口径（仅 45s 内活跃），ts 降序 */
export async function listAllPlayersAdmin(): Promise<CatMousePlayer[]> {
  return listLivePlayers()
}

/** 清空全部玩家（DEL 整键最简单可靠） */
export async function clearAllPlayers(): Promise<void> {
  await redisDel(PLAYERS_KEY)
}

/** 踢出单个玩家（幂等：不存在的 id 空操作） */
export async function kickPlayer(id: string): Promise<void> {
  await removePlayer(id)
}
