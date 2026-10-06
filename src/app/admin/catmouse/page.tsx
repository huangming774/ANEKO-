'use client'

// 猫鼠游戏后台：实时查看全部在线玩家的位置与数据，支持暂停/恢复、清空、踢人。
// 3 秒轮询（链式 setTimeout），页面切后台暂停；玩家数据 45 秒无上报自动下线。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Pause, Play, RefreshCw, Trash2, UserX, Users } from 'lucide-react'
import CatMouseMap, { type CatMouseMapFocus, type CatMouseMapMarker } from '@/components/CatMouseMap'
import { apiRequest } from '@/lib/client-api'
import { distanceMeters, formatDistance, type CatMousePlayer } from '@/lib/catmouse'

const POLL_MS = 3_000
/** 展示层新鲜度阈值（服务端 45s 才剔除） */
const STALE_MS = 15_000

type Message = { type: 'error' | 'success' | 'info'; text: string }

function freshText(ts: number, now: number): string {
  const sec = Math.max(0, Math.round((now - ts) / 1000))
  if (sec < 5) return '刚刚'
  if (sec < 60) return `${sec} 秒前`
  return `${Math.floor(sec / 60)} 分钟前`
}

export default function AdminCatMousePage() {
  const [players, setPlayers] = useState<CatMousePlayer[]>([])
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [netDown, setNetDown] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mapFocus, setMapFocus] = useState<CatMouseMapFocus | null>(null)
  const [nowTs, setNowTs] = useState(() => Date.now())
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  // 暂停/恢复进行中时，轮询结果不覆盖乐观值
  const togglingRef = useRef(false)

  // 新鲜度文案秒级刷新
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const pollOnce = useCallback(async () => {
    try {
      const data = await apiRequest<{ players: CatMousePlayer[]; enabled: boolean }>('/api/admin/catmouse')
      setPlayers(Array.isArray(data.players) ? data.players : [])
      if (!togglingRef.current && typeof data.enabled === 'boolean') {
        setEnabled(data.enabled)
      }
      setLastSyncAt(Date.now())
      setNetDown(false)
    } catch {
      // 网络抖动/服务暂不可用：顶部细提示，不弹窗轰炸
      setNetDown(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // 实时轮询：隐身跳过，回前台立即同步
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      if (cancelled) return
      if (!document.hidden) {
        await pollOnce()
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS)
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
  }, [pollOnce])

  const toggleEnabled = async () => {
    const next = !enabled
    setMessage(null)
    setBusyKey('enabled')
    togglingRef.current = true
    setEnabled(next) // 乐观更新
    try {
      const data = await apiRequest<{ enabled: boolean }>('/api/admin/catmouse/enabled', {
        method: 'POST',
        body: JSON.stringify({ enabled: next }),
      })
      setEnabled(typeof data.enabled === 'boolean' ? data.enabled : next)
      setMessage({ type: 'success', text: next ? '游戏已恢复，玩家可继续上报位置' : '游戏已暂停，玩家端将无法进入/上报' })
    } catch (err) {
      setEnabled(!next) // 失败回滚
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '操作失败' })
    } finally {
      togglingRef.current = false
      setBusyKey(null)
    }
  }

  const clearAll = async () => {
    if (!window.confirm('确定清空全部玩家位置吗？所有在线玩家将立即下线。')) return
    setMessage(null)
    setBusyKey('clear')
    try {
      await apiRequest('/api/admin/catmouse/clear', { method: 'POST' })
      setPlayers([])
      setSelectedId(null)
      setMessage({ type: 'success', text: '已清空全部玩家' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '清空失败' })
    } finally {
      setBusyKey(null)
    }
  }

  const kickPlayer = async (player: CatMousePlayer) => {
    if (!window.confirm(`确定将「${player.cn}」踢出游戏吗？`)) return
    setMessage(null)
    setBusyKey(`kick:${player.id}`)
    try {
      await apiRequest('/api/admin/catmouse/kick', {
        method: 'POST',
        body: JSON.stringify({ id: player.id }),
      })
      setPlayers((list) => list.filter((item) => item.id !== player.id))
      if (selectedId === player.id) setSelectedId(null)
      setMessage({ type: 'success', text: `已将「${player.cn}」踢出` })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '踢出失败' })
    } finally {
      setBusyKey(null)
    }
  }

  const selectAndFocus = (player: CatMousePlayer) => {
    setSelectedId(player.id)
    setMapFocus({ lat: player.lat, lng: player.lng, zoom: 16, nonce: Date.now() })
  }

  // 全览：按所有玩家散布范围粗略估算缩放级别
  const focusAll = () => {
    if (players.length === 0) return
    let minLat = players[0].lat
    let maxLat = players[0].lat
    let minLng = players[0].lng
    let maxLng = players[0].lng
    players.forEach((player) => {
      minLat = Math.min(minLat, player.lat)
      maxLat = Math.max(maxLat, player.lat)
      minLng = Math.min(minLng, player.lng)
      maxLng = Math.max(maxLng, player.lng)
    })
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2
    const spanDeg = Math.max(maxLat - minLat, (maxLng - minLng) * Math.cos((centerLat * Math.PI) / 180))
    const zoom = spanDeg > 2 ? 5 : spanDeg > 0.5 ? 8 : spanDeg > 0.1 ? 11 : spanDeg > 0.02 ? 13 : 15
    setMapFocus({ lat: centerLat, lng: centerLng, zoom, nonce: Date.now() })
  }

  const selected = useMemo(
    () => players.filter((item) => item.id === selectedId)[0] || null,
    [players, selectedId],
  )

  // 详情卡「离他最近的玩家」
  const nearest = useMemo(() => {
    if (!selected) return []
    return players
      .filter((item) => item.id !== selected.id)
      .map((item) => ({ player: item, meters: distanceMeters(selected.lat, selected.lng, item.lat, item.lng) }))
      .sort((a, b) => a.meters - b.meters)
      .slice(0, 3)
  }, [players, selected])

  const markers = useMemo<CatMouseMapMarker[]>(
    () =>
      players.map((player) => ({
        id: player.id,
        cn: player.cn,
        lat: player.lat,
        lng: player.lng,
        variant: 'other' as const,
        stale: nowTs - player.ts > STALE_MS,
        selected: player.id === selectedId,
      })),
    [players, nowTs, selectedId],
  )

  return (
    <div className="space-y-6">
      {/* 头部 + 统计 + 操作 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white">猫鼠游戏</h1>
          <p className="mt-1 text-sm text-gray-500">实时查看全部玩家位置与数据。暂停后玩家端无法进入/上报；清空或踢人可让玩家立即下线。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleEnabled}
            disabled={busyKey === 'enabled'}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${
              enabled
                ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
            }`}
          >
            {busyKey === 'enabled' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : enabled ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
            {enabled ? '暂停游戏' : '恢复游戏'}
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={busyKey === 'clear' || players.length === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-40"
          >
            {busyKey === 'clear' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            清空全部玩家
          </button>
        </div>
      </div>

      {/* 统计条 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-[#23233a] px-3 py-1.5 text-xs text-gray-300">
          <Users size={14} className="text-anime-pink" />
          在线 {players.length} 人
        </span>
        <span className={`rounded-full px-3 py-1.5 text-xs ${enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
          {enabled ? '游戏进行中' : '游戏已暂停'}
        </span>
        <span className="text-xs text-gray-500">
          {lastSyncAt ? `最后刷新 ${new Date(lastSyncAt).toLocaleTimeString('zh-CN')}` : '尚未加载'}
        </span>
        <button
          type="button"
          onClick={() => pollOnce()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#23233a] px-3 py-2 text-xs text-gray-300 hover:text-white"
        >
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      {netDown && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          网络不稳定或服务不可用，正在重试…
        </div>
      )}
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : message.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : 'border-blue-500/30 bg-blue-500/10 text-blue-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 地图 + 数据面板：桌面两栏、移动端纵向 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">实时位置</h2>
            <button
              type="button"
              onClick={focusAll}
              disabled={players.length === 0}
              className="rounded-lg bg-[#23233a] px-3 py-2 text-xs text-gray-300 hover:text-white disabled:opacity-40"
            >
              全览
            </button>
          </div>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center gap-2 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] text-gray-400 sm:h-[420px] lg:h-[560px]">
              <Loader2 size={18} className="animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#2a2a4a]">
              <CatMouseMap
                markers={markers}
                focus={mapFocus}
                onMarkerClick={setSelectedId}
                className="h-[300px] sm:h-[420px] lg:h-[560px]"
              />
            </div>
          )}
          <p className="text-xs text-gray-500">点击地图上的 CN 标签或列表行查看详情；灰色标签表示超过 15 秒未上报。</p>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4 sm:p-6">
          <h2 className="text-base font-semibold text-white">玩家数据（{players.length}）</h2>

          {/* 选中详情卡 */}
          {selected && (
            <div className="rounded-xl border border-anime-pink/40 bg-[#23233a] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">{selected.cn}</p>
                  <p className="mt-1 font-mono text-xs text-gray-400">
                    {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
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
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-gray-400 hover:text-white"
                >
                  关闭
                </button>
              </div>
              {nearest.length > 0 && (
                <div className="mt-3 border-t border-[#2a2a4a] pt-3">
                  <p className="text-xs text-gray-500">离他最近的玩家</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {nearest.map(({ player, meters }) => (
                      <li key={player.id} className="flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => selectAndFocus(player)}
                          className="min-w-0 truncate text-gray-300 hover:text-anime-pink"
                        >
                          {player.cn}
                        </button>
                        <span className="shrink-0 text-anime-pink">{formatDistance(meters)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {players.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2a2a4a] px-4 py-10 text-center text-sm text-gray-500">
              当前没有在线玩家
              <br />
              45 秒无上报会自动下线
            </div>
          ) : (
            <>
              {/* 桌面端表格 */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a4a] text-gray-400">
                      <th className="px-3 py-3 font-medium">CN</th>
                      <th className="px-3 py-3 font-medium">纬度</th>
                      <th className="px-3 py-3 font-medium">经度</th>
                      <th className="px-3 py-3 font-medium">精度</th>
                      <th className="px-3 py-3 font-medium">最后上报</th>
                      <th className="px-3 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => {
                      const stale = nowTs - player.ts > STALE_MS
                      return (
                        <tr
                          key={player.id}
                          onClick={() => selectAndFocus(player)}
                          className={`cursor-pointer border-b border-[#2a2a4a]/50 transition-colors hover:bg-[#23233a]/60 ${
                            selectedId === player.id ? 'bg-[#23233a]' : ''
                          } ${stale ? 'opacity-50' : ''}`}
                        >
                          <td className="max-w-[140px] truncate px-3 py-3 font-medium text-white">{player.cn}</td>
                          <td className="px-3 py-3 font-mono text-xs text-gray-400">{player.lat.toFixed(6)}</td>
                          <td className="px-3 py-3 font-mono text-xs text-gray-400">{player.lng.toFixed(6)}</td>
                          <td className="px-3 py-3 text-gray-400">
                            {player.accuracy != null ? `${Math.round(player.accuracy)} 米` : '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-400">{freshText(player.ts, nowTs)}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                kickPlayer(player)
                              }}
                              disabled={busyKey === `kick:${player.id}`}
                              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {busyKey === `kick:${player.id}` ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <UserX size={12} />
                              )}
                              踢出
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 移动端卡片列表 */}
              <div className="space-y-3 md:hidden">
                {players.map((player) => {
                  const stale = nowTs - player.ts > STALE_MS
                  return (
                    <div
                      key={player.id}
                      onClick={() => selectAndFocus(player)}
                      className={`rounded-xl border p-3 transition-colors ${
                        selectedId === player.id ? 'border-anime-pink/60 bg-[#23233a]' : 'border-[#2a2a4a] bg-[#0f0f1a]'
                      } ${stale ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium text-white">{player.cn}</p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            kickPlayer(player)
                          }}
                          disabled={busyKey === `kick:${player.id}`}
                          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {busyKey === `kick:${player.id}` ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <UserX size={12} />
                          )}
                          踢出
                        </button>
                      </div>
                      <p className="mt-1.5 font-mono text-xs text-gray-400">
                        {player.lat.toFixed(6)}, {player.lng.toFixed(6)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {player.accuracy != null ? `精度约 ${Math.round(player.accuracy)} 米 · ` : ''}
                        {freshText(player.ts, nowTs)}更新
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
