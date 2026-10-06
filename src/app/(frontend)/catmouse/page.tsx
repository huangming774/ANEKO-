'use client'

// 猫鼠游戏：实时位置共享。填 CN 入场 → 地图显示自己与全员 CN，点人看离自己多少米。
// 通信走 HTTP 轮询（POST /api/catmouse/sync 上报位置并拉全员，不用 WebSocket）；
// 坐标仅实时共享，45 秒无上报自动下线，不落库。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Loader2, MapPin, Pencil, RotateCcw, Users, X } from 'lucide-react'
import CatMouseMap, { type CatMouseMapFocus, type CatMouseMapMarker } from '@/components/CatMouseMap'
import {
  CATMOUSE_CN_MAX,
  CATMOUSE_POLL_MS,
  distanceMeters,
  formatDistance,
  isValidCn,
  type CatMousePlayer,
} from '@/lib/catmouse'

type Message = { type: 'error' | 'success' | 'info'; text: string }
type LocateState = 'idle' | 'locating' | 'located' | 'denied' | 'unavailable' | 'insecure'
type Coords = { lat: number; lng: number; accuracy: number | null }
type Identity = { id: string; cn: string }

const SELF_KEY = 'catmouse:self'
/** 展示层新鲜度阈值（服务端 45s 才剔除） */
const STALE_MS = 15_000

/** 客户端生成会话 id（服务端校验 [a-zA-Z0-9_-]{8,64}） */
function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function freshText(ts: number, now: number): string {
  const sec = Math.max(0, Math.round((now - ts) / 1000))
  if (sec < 5) return '刚刚'
  if (sec < 60) return `${sec} 秒前`
  return `${Math.floor(sec / 60)} 分钟前`
}

export default function CatMousePage() {
  const [joined, setJoined] = useState(false)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [editing, setEditing] = useState(false)
  const [joinCn, setJoinCn] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [locateState, setLocateState] = useState<LocateState>('idle')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [players, setPlayers] = useState<CatMousePlayer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [netDown, setNetDown] = useState(false)
  const [paused, setPaused] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [mapFocus, setMapFocus] = useState<CatMouseMapFocus | null>(null)
  const [nowTs, setNowTs] = useState(() => Date.now())
  // watchPosition 重启计数（「重试」按钮触发）
  const [watchTick, setWatchTick] = useState(0)

  const identityRef = useRef<Identity | null>(null)
  const coordsRef = useRef<Coords | null>(null)
  const netDownRef = useRef(false)
  const pausedRef = useRef(false)
  const flewToSelfRef = useRef(false)

  // 恢复本地身份
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SELF_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed?.id === 'string' && typeof parsed?.cn === 'string') {
          const restored: Identity = { id: parsed.id, cn: parsed.cn }
          identityRef.current = restored
          setIdentity(restored)
          setJoinCn(restored.cn)
        }
      }
    } catch {
      // localStorage 不可用时走加入流程
    }
    setJoined(true)
  }, [])

  // 新鲜度文案秒级刷新
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 持续定位：入场后一直 watch，首个定位到手才开始上报
  useEffect(() => {
    if (!identity) return
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocateState('insecure')
      return
    }
    let stopped = false
    setLocateState((prev) => (prev === 'located' ? prev : 'locating'))
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (stopped) return
        const next: Coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        }
        coordsRef.current = next
        setCoords(next)
        setLocateState('located')
        if (!flewToSelfRef.current) {
          flewToSelfRef.current = true
          setMapFocus({ lat: next.lat, lng: next.lng, zoom: 16, nonce: Date.now() })
        }
      },
      (error) => {
        if (stopped) return
        if (error.code === error.PERMISSION_DENIED) setLocateState('denied')
        else setLocateState('unavailable')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )
    return () => {
      stopped = true
      navigator.geolocation.clearWatch(watchId)
    }
  }, [identity, watchTick])

  // 轮询上报 + 拉全员：隐身暂停，回前台立即同步一次
  const pollOnce = useCallback(async () => {
    const self = identityRef.current
    if (!self) return
    const c = coordsRef.current
    try {
      const res = c
        ? await fetch('/api/catmouse/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: self.id,
              cn: self.cn,
              lat: c.lat,
              lng: c.lng,
              ...(c.accuracy != null ? { accuracy: c.accuracy } : {}),
            }),
          })
        : await fetch('/api/catmouse/players')
      const payload = (await res.json().catch(() => ({}))) as {
        data?: { players?: CatMousePlayer[] }
        error?: string
      }
      if (res.status === 403) {
        // 管理员暂停了游戏：清空他人位置、持续轮询以便恢复后自动回来
        if (!pausedRef.current) {
          pausedRef.current = true
          setPaused(true)
        }
        setPlayers([])
        return
      }
      if (!res.ok) throw new Error(payload.error || '同步失败')
      if (pausedRef.current) {
        pausedRef.current = false
        setPaused(false)
      }
      const list = payload.data?.players
      setPlayers(Array.isArray(list) ? list : [])
      if (netDownRef.current) {
        netDownRef.current = false
        setNetDown(false)
        setMessage({ type: 'success', text: '网络已恢复，位置同步继续' })
      }
    } catch {
      // 网络抖动静默重试，不弹窗轰炸
      if (!netDownRef.current) {
        netDownRef.current = true
        setNetDown(true)
      }
    }
  }, [])

  useEffect(() => {
    if (!identity) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      if (cancelled) return
      if (!document.hidden) {
        await pollOnce()
      }
      if (!cancelled) timer = setTimeout(tick, CATMOUSE_POLL_MS)
    }
    tick()

    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') {
        void pollOnce()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [identity, pollOnce])

  // 离场通知（best-effort，下次 sync 会重新上线）
  useEffect(() => {
    const onLeave = () => {
      const self = identityRef.current
      if (!self || !navigator.sendBeacon) return
      try {
        navigator.sendBeacon('/api/catmouse/leave', JSON.stringify({ id: self.id }))
      } catch {
        // 忽略：服务端 45s 无上报会自动下线
      }
    }
    window.addEventListener('pagehide', onLeave)
    return () => window.removeEventListener('pagehide', onLeave)
  }, [])

  const persist = (next: Identity) => {
    identityRef.current = next
    setIdentity(next)
    try {
      localStorage.setItem(SELF_KEY, JSON.stringify(next))
    } catch {
      // localStorage 不可用时忽略（刷新后需重新填写）
    }
  }

  const startGame = () => {
    const cn = joinCn.trim()
    if (!cn) {
      setMessage({ type: 'error', text: '请填写你的 CN' })
      return
    }
    if (!isValidCn(cn)) {
      setMessage({ type: 'error', text: `CN 需为 1-${CATMOUSE_CN_MAX} 个字符（中英文、数字或 _.-()）` })
      return
    }
    if (editing && identity) {
      persist({ ...identity, cn })
      setEditing(false)
      setMessage({ type: 'success', text: 'CN 已更新' })
    } else {
      persist({ id: makeId(), cn })
      setMessage({ type: 'info', text: '已加入游戏，正在同步位置…' })
    }
  }

  const openEdit = () => {
    if (!identity) return
    setJoinCn(identity.cn)
    setEditing(true)
    setMessage(null)
  }

  const cancelEdit = () => {
    setEditing(false)
    setJoinCn(identity?.cn ?? '')
  }

  const recenterSelf = () => {
    const c = coordsRef.current
    if (!c) return
    setMapFocus({ lat: c.lat, lng: c.lng, zoom: 16, nonce: Date.now() })
  }

  const focusPlayer = (p: CatMousePlayer) => {
    setSelectedId(p.id)
    setMapFocus({ lat: p.lat, lng: p.lng, zoom: 16, nonce: Date.now() })
  }

  const selfId = identity?.id ?? null
  const sortedOthers = useMemo(() => {
    const list = players.filter((p) => p.id !== selfId)
    if (coords) {
      list.sort(
        (a, b) =>
          distanceMeters(coords.lat, coords.lng, a.lat, a.lng) -
          distanceMeters(coords.lat, coords.lng, b.lat, b.lng),
      )
    } else {
      list.sort((a, b) => b.ts - a.ts)
    }
    return list
  }, [players, coords, selfId])

  const markers = useMemo<CatMouseMapMarker[]>(() => {
    return players.map((p) => {
      const isSelf = p.id === selfId
      return {
        id: p.id,
        cn: isSelf ? `${p.cn}（我）` : p.cn,
        lat: p.lat,
        lng: p.lng,
        variant: isSelf ? 'self' : 'other',
        stale: !isSelf && nowTs - p.ts > STALE_MS,
        selected: p.id === selectedId,
      }
    })
  }, [players, selfId, nowTs, selectedId])

  const selected = players.find((p) => p.id === selectedId) ?? null
  const selectedIsSelf = selected !== null && selected.id === selfId
  const selectedDist =
    selected && coords && !selectedIsSelf
      ? distanceMeters(coords.lat, coords.lng, selected.lat, selected.lng)
      : null

  const locateBadge = (() => {
    switch (locateState) {
      case 'located':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            已定位{coords?.accuracy != null ? `（±${Math.round(coords.accuracy)}m）` : ''}
          </span>
        )
      case 'locating':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-600">
            <Loader2 size={12} className="animate-spin" />
            定位中…
          </span>
        )
      case 'denied':
      case 'unavailable':
      case 'insecure':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            {locateState === 'denied' ? '定位被拒绝' : locateState === 'insecure' ? '非 HTTPS 无法定位' : '定位失败'}
            {locateState !== 'insecure' && (
              <button
                type="button"
                onClick={() => setWatchTick((n) => n + 1)}
                className="font-medium text-anime-pink underline"
              >
                重试
              </button>
            )}
          </span>
        )
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-400">未定位</span>
        )
    }
  })()

  const messageBanner = message && (
    <div
      className={`rounded-xl border px-4 py-2.5 text-sm ${
        message.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : message.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-blue-200 bg-blue-50 text-blue-700'
      }`}
    >
      {message.text}
    </div>
  )

  // 水合前不渲染，避免加入卡片闪现
  if (!joined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        <Loader2 size={20} className="mr-2 animate-spin" />
        加载中...
      </div>
    )
  }

  // 加入 / 改 CN 卡片
  if (!identity || editing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="relative overflow-hidden bg-gradient-to-r from-anime-pink to-anime-purple py-16">
          <div className="mx-auto max-w-7xl px-4 text-center text-white">
            <h1 className="mb-4 text-5xl font-bold font-round md:text-7xl">猫鼠游戏</h1>
            <p className="text-lg text-white/80">填入你的 CN，地图上实时追踪彼此的位置</p>
          </div>
        </div>

        <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
          {messageBanner}
          <section className="rounded-2xl border border-gray-100 bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
              <MapPin size={20} className="text-anime-pink" />
              {editing ? '修改 CN' : '加入游戏'}
            </h2>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-600">
                你的 CN <span className="text-red-400">*</span>
              </span>
              <input
                value={joinCn}
                maxLength={CATMOUSE_CN_MAX}
                placeholder="填写你的 CN（Cosplay 名 / 昵称）"
                onChange={(event) => setJoinCn(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') startGame()
                }}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-anime-pink focus:outline-none"
              />
            </label>
            <p className="mt-2 text-right text-xs text-gray-400">
              {joinCn.trim().length}/{CATMOUSE_CN_MAX}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startGame}
                className="flex-1 rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple py-3 font-medium text-white transition-opacity hover:opacity-90"
              >
                {editing ? '保存' : '开始游戏'}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  取消
                </button>
              )}
            </div>

            <p className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-400">
              隐私说明：位置仅在游戏期间实时共享给其他玩家，约 45 秒无更新自动下线；坐标不落库、不保留历史。进入游戏即代表同意以上说明。
            </p>
          </section>
        </div>
      </div>
    )
  }

  // 游戏主视图
  return (
    <div className="flex flex-col bg-gray-50" style={{ height: '100dvh', paddingTop: '4rem' }}>
      {/* 顶部工具栏 */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 bg-white/95 px-3 py-2">
        <h1 className="flex items-center gap-1.5 text-lg font-bold text-gray-800">
          <MapPin size={18} className="text-anime-pink" />
          猫鼠游戏
        </h1>
        <span className="flex items-center gap-1 rounded-full bg-anime-pink/10 px-2.5 py-1 text-xs font-medium text-anime-pink">
          <Users size={12} />
          在线 {players.length} 人
        </span>
        <button
          type="button"
          onClick={openEdit}
          className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:border-anime-pink hover:text-anime-pink"
        >
          <span className="max-w-[9rem] truncate">{identity.cn}</span>
          <Pencil size={11} />
        </button>
        {locateBadge}
        <button
          type="button"
          onClick={recenterSelf}
          disabled={!coords}
          className="ml-auto flex items-center gap-1 rounded-full border border-anime-pink px-3 py-1.5 text-xs font-medium text-anime-pink hover:bg-anime-pink hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-anime-pink"
        >
          <Crosshair size={13} />
          回到我
        </button>
      </header>

      {/* 状态细条 */}
      {paused && (
        <div className="shrink-0 bg-red-50 px-4 py-1.5 text-center text-xs text-red-500">
          游戏已被管理员暂停，稍后自动恢复…
        </div>
      )}
      {netDown && (
        <div className="shrink-0 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-600">
          网络不稳定，正在重试…
        </div>
      )}
      {!netDown && !coords && locateState !== 'locating' && (
        <div className="shrink-0 bg-blue-50 px-4 py-1.5 text-center text-xs text-blue-600">
          开启定位后可显示每个人离你多少米
        </div>
      )}
      {message && <div className="shrink-0 px-3 pt-2">{messageBanner}</div>}

      {/* 地图区 */}
      <div className="relative min-h-0 flex-1">
        <CatMouseMap
          markers={markers}
          focus={mapFocus}
          onMarkerClick={setSelectedId}
          className="absolute inset-0"
        />

        {/* 点人详情卡片 */}
        {selected && (
          <div className="absolute inset-x-3 top-3 z-20 rounded-2xl border border-gray-100 bg-white/95 p-4 shadow-lg md:right-auto md:w-80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-gray-800">{selected.cn}</p>
                <p className="mt-1 text-lg font-semibold text-anime-pink">
                  {selectedIsSelf
                    ? '这是你'
                    : selectedDist != null
                      ? `距离你 ${formatDistance(selectedDist)}`
                      : coords
                        ? '暂无距离信息'
                        : '开启定位后可显示距离'}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {selected.accuracy != null ? `精度约 ${Math.round(selected.accuracy)} 米 · ` : ''}
                  {freshText(selected.ts, nowTs)}更新
                  {nowTs - selected.ts > STALE_MS ? '（可能已离开）' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="关闭"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 玩家列表：移动端底部面板 / 桌面端右侧栏 */}
        <aside
          className="absolute inset-x-0 bottom-0 z-10 flex max-h-[45dvh] flex-col overflow-hidden rounded-t-2xl border-t border-gray-100 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur md:inset-auto md:bottom-3 md:right-3 md:top-3 md:w-80 md:rounded-2xl md:border md:shadow-lg"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">在线玩家（{players.length}）</p>
            <button
              type="button"
              onClick={() => setPanelOpen((open) => !open)}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 md:hidden"
            >
              {panelOpen ? '收起' : '展开'}
            </button>
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto ${panelOpen ? '' : 'hidden md:block'}`}>
            {/* 自己置顶 */}
            <button
              type="button"
              onClick={() => {
                setSelectedId(selfId)
                recenterSelf()
              }}
              className={`flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-anime-pink/5 ${
                selectedId === selfId ? 'bg-anime-pink/10' : ''
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/90 text-xs font-bold text-white">
                我
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-800">{identity.cn}</span>
                <span className="block text-xs text-gray-400">
                  {coords ? '点击回到我的位置' : '未开启定位'}
                </span>
              </span>
            </button>

            {sortedOthers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                暂无其他玩家在线
                <br />
                把页面分享给伙伴，一起来玩吧～
              </p>
            ) : (
              sortedOthers.map((p) => {
                const stale = nowTs - p.ts > STALE_MS
                const dist =
                  coords != null ? distanceMeters(coords.lat, coords.lng, p.lat, p.lng) : null
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => focusPlayer(p)}
                    className={`flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-anime-pink/5 ${
                      selectedId === p.id ? 'bg-anime-pink/10' : ''
                    } ${stale ? 'opacity-50' : ''}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-anime-pink/85 text-xs font-bold text-white">
                      {p.cn.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-800">{p.cn}</span>
                      <span className="block text-xs text-gray-400">{freshText(p.ts, nowTs)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-anime-pink">
                      {dist != null ? formatDistance(dist) : '—'}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
