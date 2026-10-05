'use client'

// 活动签到：限时定位打卡。不登录，填 CN + 定位即可提交（限流防刷）。
// 坐标来自浏览器 Geolocation API，与地图渲染解耦——地图挂了也能签到。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Loader2, MapPin, Navigation, RotateCcw } from 'lucide-react'
import CheckinMap, { type CheckinMapMarker } from '@/components/CheckinMap'
import type { CheckinActivityPublic } from '@/lib/app-types'

type Message = { type: 'error' | 'success' | 'info'; text: string }
type LocateState = 'idle' | 'locating' | 'located' | 'denied' | 'unavailable' | 'insecure'
type Coords = { latitude: number; longitude: number; accuracy: number | null }

const CN_MAX = 32

export default function CheckinPage() {
  const [activity, setActivity] = useState<CheckinActivityPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [cn, setCn] = useState('')
  const [locateState, setLocateState] = useState<LocateState>('idle')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkedIn, setCheckedIn] = useState<{ cn: string; at: string } | null>(null)
  const [remainingText, setRemainingText] = useState('')
  const [expired, setExpired] = useState(false)

  const loadActivity = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/checkin-activities/current')
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '加载失败')
      const data: CheckinActivityPublic | null = payload.data ?? null
      setActivity(data)
      if (data) {
        // 预填上次的 CN（服务端仍以唯一约束为准）
        try {
          const saved = localStorage.getItem(`checkin:${data.id}`)
          if (saved) {
            const parsed = JSON.parse(saved)
            if (typeof parsed?.cn === 'string') setCn(parsed.cn)
            if (typeof parsed?.at === 'string') setCheckedIn({ cn: parsed.cn, at: parsed.at })
          }
        } catch {
          // localStorage 不可用时忽略
        }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActivity()
  }, [loadActivity])

  // 倒计时：基于 server_time 纠偏本机时钟漂移
  useEffect(() => {
    if (!activity) return
    const offset = Date.parse(activity.server_time) - Date.now()
    const endsAt = Date.parse(activity.ends_at)

    const tick = () => {
      const remaining = endsAt - (Date.now() + offset)
      if (remaining <= 0) {
        setExpired(true)
        setRemainingText('已结束')
        return
      }
      setExpired(false)
      const totalSeconds = Math.floor(remaining / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      setRemainingText(
        hours > 0 ? `${hours} 小时 ${minutes} 分 ${seconds} 秒` : `${minutes} 分 ${seconds} 秒`,
      )
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [activity])

  const locate = () => {
    setMessage(null)
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocateState('insecure')
      return
    }
    setLocateState('locating')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        })
        setLocateState('located')
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) setLocateState('denied')
        else if (error.code === error.POSITION_UNAVAILABLE) setLocateState('unavailable')
        else setLocateState('unavailable')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }

  const submit = async () => {
    if (!activity || !coords || !cn.trim() || submitting || checkedIn || expired) return
    setMessage(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/checkin-activities/${activity.id}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cn: cn.trim(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      })
      const payload = await res.json().catch(() => ({}))

      if (res.status === 409) {
        // 已签到：当作成功态展示
        markCheckedIn(activity.id, cn.trim(), '')
        return
      }
      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After')
          throw new Error(retryAfter ? `请求过于频繁，请 ${retryAfter} 秒后再试` : payload.error || '请求过于频繁')
        }
        if (res.status === 403) setExpired(true)
        throw new Error(payload.error || '签到失败')
      }

      markCheckedIn(activity.id, payload.data?.cn || cn.trim(), payload.data?.created_at || '')
      setMessage({ type: 'success', text: '签到成功，祝你玩得开心！' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '签到失败' })
    } finally {
      setSubmitting(false)
    }
  }

  const markCheckedIn = (activityId: string, name: string, at: string) => {
    const timestamp = at || new Date().toISOString()
    setCheckedIn({ cn: name, at: timestamp })
    try {
      localStorage.setItem(`checkin:${activityId}`, JSON.stringify({ cn: name, at: timestamp }))
    } catch {
      // localStorage 不可用时忽略
    }
  }

  const selfMarkers: CheckinMapMarker[] = useMemo(() => {
    if (!coords) return []
    return [
      {
        id: 'self',
        longitude: coords.longitude,
        latitude: coords.latitude,
        label: cn.trim() || '我',
        variant: 'self',
      },
    ]
  }, [coords, cn])

  const cnValid = cn.trim().length >= 1 && cn.trim().length <= CN_MAX
  const canSubmit = Boolean(activity) && !loading && !expired && !checkedIn && !submitting && coords && cnValid

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative overflow-hidden bg-gradient-to-r from-anime-pink to-anime-purple py-20">
        <div className="mx-auto max-w-7xl px-4 text-center text-white">
          <h1 className="mb-4 text-5xl font-bold font-round md:text-7xl">活动签到</h1>
          <p className="text-lg text-white/80">开启定位，填写你的 CN，完成现场打卡</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-12">
        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : message.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            加载中...
          </div>
        ) : loadError ? (
          <div className="rounded-2xl bg-white p-10 text-center text-gray-500">
            <AlertTriangle size={28} className="mx-auto mb-3 text-amber-400" />
            {loadError}
          </div>
        ) : !activity ? (
          <div className="rounded-2xl bg-white p-10 text-center text-gray-500">
            <MapPin size={28} className="mx-auto mb-3 text-gray-300" />
            当前没有进行中的签到活动，等活动开启后再来吧～
          </div>
        ) : (
          <>
            {/* 活动信息卡 */}
            <section className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
                    <MapPin size={20} className="text-anime-pink" />
                    {activity.title}
                  </h2>
                  {activity.note && <p className="mt-2 text-sm text-gray-500">{activity.note}</p>}
                  <p className="mt-2 text-sm text-gray-400">
                    <Clock size={14} className="mr-1 inline" />
                    {new Date(activity.starts_at).toLocaleString('zh-CN')} — {new Date(activity.ends_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`rounded-full px-4 py-2 text-sm font-medium ${expired ? 'bg-gray-100 text-gray-400' : 'bg-anime-pink/10 text-anime-pink'}`}>
                    {expired ? '已结束' : `剩余 ${remainingText}`}
                  </div>
                  <p className="mt-2 text-sm text-gray-400">已有 {activity.checked_in_count} 人签到</p>
                </div>
              </div>
            </section>

            {/* 地图 */}
            <CheckinMap markers={selfMarkers} fitOnMarkers={selfMarkers.length > 0} className="h-80 border border-gray-100" />

            {/* 签到表单 */}
            <section className="rounded-2xl border border-gray-100 bg-white p-6">
              {checkedIn ? (
                <div className="py-6 text-center">
                  <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
                  <p className="text-lg font-semibold text-gray-800">{checkedIn.cn} 已签到</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {checkedIn.at ? new Date(checkedIn.at).toLocaleString('zh-CN') : '本次签到已记录'}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm text-gray-600">
                      你的 CN <span className="text-red-400">*</span>
                    </span>
                    <input
                      value={cn}
                      maxLength={CN_MAX}
                      placeholder="填写你的 CN（Cosplay 名 / 昵称）"
                      onChange={(event) => setCn(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-anime-pink focus:outline-none"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={locate}
                      disabled={locateState === 'locating'}
                      className="flex items-center gap-2 rounded-xl border border-anime-pink px-5 py-3 text-sm font-medium text-anime-pink transition-colors hover:bg-anime-pink hover:text-white disabled:opacity-60"
                    >
                      {locateState === 'locating' ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                      {locateState === 'locating' ? '定位中...' : locateState === 'located' ? '重新定位' : '定位'}
                    </button>

                    {locateState === 'located' && coords && (
                      <p className="text-sm text-emerald-600">
                        定位成功{coords.accuracy ? `（精度约 ${Math.round(coords.accuracy)} 米）` : ''}
                        {coords.accuracy && coords.accuracy > 500 ? '，精度较低，建议到开阔处重试' : ''}
                      </p>
                    )}
                    {locateState === 'denied' && (
                      <p className="flex items-center gap-2 text-sm text-red-500">
                        定位权限被拒绝，请在浏览器设置中允许本站获取位置后
                        <button type="button" onClick={locate} className="flex items-center gap-1 font-medium text-anime-pink underline">
                          <RotateCcw size={13} />
                          重试
                        </button>
                      </p>
                    )}
                    {locateState === 'unavailable' && (
                      <p className="flex items-center gap-2 text-sm text-red-500">
                        暂时无法获取定位（超时或信号差）
                        <button type="button" onClick={locate} className="flex items-center gap-1 font-medium text-anime-pink underline">
                          <RotateCcw size={13} />
                          重试
                        </button>
                      </p>
                    )}
                    {locateState === 'insecure' && <p className="text-sm text-red-500">当前页面非 HTTPS，浏览器无法获取定位</p>}
                  </div>

                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className="w-full rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple py-3 font-medium text-white disabled:from-gray-300 disabled:to-gray-400"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        提交中...
                      </span>
                    ) : expired ? (
                      '签到已结束'
                    ) : (
                      '提交签到'
                    )}
                  </button>
                  {!coords && !expired && <p className="text-center text-xs text-gray-400">请先点击「定位」获取当前位置</p>}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
