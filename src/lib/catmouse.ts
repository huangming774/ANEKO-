// 猫鼠游戏：共享契约（类型 / 校验 / 距离计算）。
// 实时位置存 Redis（ZSET 时间戳 + HASH 载荷），过期玩家自动下线，不落库。
// 通信走 HTTP 轮询（POST /api/catmouse/sync 上报位置并拉全员），不用 WebSocket。

/** 在线时长：超过该毫秒数未上报视为离线（服务端同步时裁剪） */
export const CATMOUSE_STALE_MS = 45_000

/** 客户端轮询间隔（毫秒）。兼顾实时性与请求量 */
export const CATMOUSE_POLL_MS = 2_500

/** 载荷里的 CN 字段长度限制（与签到 CN_MAX 一致） */
export const CATMOUSE_CN_MAX = 32

/** CN 字符白名单：中英文、数字与 _.-()（与签到 CN_PATTERN 一致） */
export const CATMOUSE_CN_PATTERN = /^[一-龥A-Za-z0-9 _.\-()（）]{1,32}$/

/** 前端表单/服务端载荷共用的 CN 合法性判定 */
export function isValidCn(cn: string): boolean {
  return CATMOUSE_CN_PATTERN.test(cn)
}

export type CatMousePlayer = {
  id: string
  cn: string
  lat: number
  lng: number
  /** GPS 精度（米），可缺省 */
  accuracy?: number
  /** 最后上报时间（epoch ms） */
  ts: number
}

export type CatMouseSyncRequest = {
  id: string
  cn: string
  lat: number
  lng: number
  accuracy?: number
}

/** id：宽松校验（字母数字与连字符下划线，8-64 位，客户端用 crypto.randomUUID 生成） */
const ID_RE = /^[a-zA-Z0-9_-]{8,64}$/

export function validateSyncBody(body: unknown): { ok: true; data: CatMouseSyncRequest } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: '请求体格式错误' }
  }
  const { id, cn, lat, lng, accuracy } = body as Record<string, unknown>

  if (typeof id !== 'string' || !ID_RE.test(id)) {
    return { ok: false, error: 'id 非法' }
  }
  if (typeof cn !== 'string') {
    return { ok: false, error: 'cn 必须是字符串' }
  }
  const trimmedCn = cn.trim()
  if (!isValidCn(trimmedCn)) {
    return { ok: false, error: `CN 需为 1-${CATMOUSE_CN_MAX} 个字符（中英文、数字或 _.-()）` }
  }
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, error: '纬度非法' }
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { ok: false, error: '经度非法' }
  }
  const data: CatMouseSyncRequest = { id, cn: trimmedCn, lat, lng }
  if (typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0) {
    data.accuracy = accuracy
  }
  return { ok: true, data }
}

/** haversine 球面距离（米）。两端均为 WGS-84 */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371008.8
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** 距离展示：< 1000 米用「约 N 米」，否则「约 N.N 公里」 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '未知'
  if (meters < 1000) return `约 ${Math.round(meters)} 米`
  return `约 ${(meters / 1000).toFixed(1)} 公里`
}
