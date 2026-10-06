'use client'

// 签到活动管理：创建/开启限时定位活动，地图查看签到者位置与 CN。

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, MapPin, Pencil, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import CheckinMap, { type CheckinMapMarker } from '@/components/CheckinMap'
import { apiRequest } from '@/lib/client-api'
import type { CheckinActivity, CheckinRecord } from '@/lib/app-types'

type ActivityForm = {
  title: string
  note: string
  starts_at: string // datetime-local 输入值
  ends_at: string
  is_active: boolean
}

const emptyForm: ActivityForm = {
  title: '',
  note: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
}

export default function AdminCheckinsPage() {
  const [activities, setActivities] = useState<CheckinActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ActivityForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [checkinsLoading, setCheckinsLoading] = useState(false)

  const loadActivities = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiRequest<CheckinActivity[]>('/api/checkin-activities')
      setActivities(data)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const loadCheckins = useCallback(async (activityId: string) => {
    setCheckinsLoading(true)
    try {
      const data = await apiRequest<CheckinRecord[]>(`/api/checkin-activities/${activityId}/checkins`)
      setCheckins(data)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '签到记录加载失败')
    } finally {
      setCheckinsLoading(false)
    }
  }, [])

  const selected = useMemo(() => activities.find((item) => item.id === selectedId) || null, [activities, selectedId])

  // 选中活动后加载签到记录；时间窗内每 20 秒轮询
  useEffect(() => {
    if (!selectedId) return
    loadCheckins(selectedId)

    const activity = activities.find((item) => item.id === selectedId)
    const now = Date.now()
    const inWindow = activity ? now >= Date.parse(activity.starts_at) && now <= Date.parse(activity.ends_at) : false
    if (!inWindow) return

    const timer = setInterval(() => loadCheckins(selectedId), 20000)
    return () => clearInterval(timer)
  }, [selectedId, activities, loadCheckins])

  const update = <K extends keyof ActivityForm>(key: K, value: ActivityForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const editActivity = (activity: CheckinActivity) => {
    setEditingId(activity.id)
    setForm({
      title: activity.title,
      note: activity.note,
      starts_at: toInputValue(activity.starts_at),
      ends_at: toInputValue(activity.ends_at),
      is_active: activity.is_active,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveActivity = async () => {
    setMessage('')
    if (!form.title.trim()) {
      setMessage('请填写活动标题')
      return
    }
    const startsAt = fromInputValue(form.starts_at)
    const endsAt = fromInputValue(form.ends_at)
    if (!startsAt || !endsAt) {
      setMessage('请填写有效的开始/结束时间')
      return
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setMessage('结束时间必须晚于开始时间')
      return
    }

    setSaving(true)
    try {
      const body = JSON.stringify({
        title: form.title,
        note: form.note,
        starts_at: startsAt,
        ends_at: endsAt,
        is_active: form.is_active,
      })
      if (editingId) {
        await apiRequest<CheckinActivity>(`/api/checkin-activities/${editingId}`, { method: 'PATCH', body })
        setMessage('活动已更新')
      } else {
        await apiRequest<CheckinActivity>('/api/checkin-activities', { method: 'POST', body })
        setMessage('活动已创建')
      }
      resetForm()
      await loadActivities()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (activity: CheckinActivity) => {
    setMessage('')
    try {
      await apiRequest(`/api/checkin-activities/${activity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !activity.is_active }),
      })
      await loadActivities()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新失败')
    }
  }

  const deleteActivity = async (activity: CheckinActivity) => {
    if (!window.confirm(`确定删除活动「${activity.title}」吗？该活动的 ${activity.checkin_count} 条签到记录将一并删除。`)) return
    setMessage('')
    try {
      await apiRequest(`/api/checkin-activities/${activity.id}`, { method: 'DELETE' })
      setMessage('活动已删除')
      if (editingId === activity.id) resetForm()
      if (selectedId === activity.id) {
        setSelectedId(null)
        setCheckins([])
      }
      await loadActivities()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '删除失败')
    }
  }

  const markers: CheckinMapMarker[] = useMemo(
    () =>
      checkins.map((record) => ({
        id: record.id,
        longitude: record.longitude,
        latitude: record.latitude,
        label: record.cn,
        variant: 'checkin' as const,
      })),
    [checkins],
  )

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white">签到活动</h1>
          <p className="mt-1 text-sm text-gray-500">创建限时定位打卡活动，开启后游客可在「活动签到」页填 CN + 定位完成签到。</p>
        </div>
        <button type="button" onClick={resetForm} className="flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-sm text-white hover:bg-[#23233a]">
          <Plus size={16} />
          新增活动
        </button>
      </div>

      {message && <div className="rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] px-4 py-3 text-gray-200">{message}</div>}

      {/* 创建 / 编辑表单 */}
      <section className="space-y-4 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4 sm:p-6">
        <h2 className="text-base font-semibold text-white">{editingId ? '编辑活动' : '新增活动'}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="活动标题">
            <input
              value={form.title}
              maxLength={80}
              placeholder="如：漫展线下打卡"
              onChange={(event) => update('title', event.target.value)}
              className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-anime-pink focus:outline-none"
            />
          </Field>
          <Field label="备注（可选）">
            <input
              value={form.note}
              maxLength={500}
              placeholder="显示在签到页的说明"
              onChange={(event) => update('note', event.target.value)}
              className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-anime-pink focus:outline-none"
            />
          </Field>
          <Field label="开始时间">
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) => update('starts_at', event.target.value)}
              className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white focus:border-anime-pink focus:outline-none"
            />
          </Field>
          <Field label="结束时间">
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(event) => update('ends_at', event.target.value)}
              className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white focus:border-anime-pink focus:outline-none"
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={form.is_active} onChange={(event) => update('is_active', event.target.checked)} className="h-4 w-4 accent-anime-pink" />
          开启（前台可签到）
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={saveActivity}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            保存
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-xl bg-[#0f0f1a] px-5 py-3 text-sm text-gray-300 hover:text-white">
              取消
            </button>
          )}
        </div>
      </section>

      {/* 活动列表 */}
      <section className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4 sm:p-6">
        <h2 className="mb-5 text-base font-semibold text-white">活动列表</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            加载中...
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2a2a4a] px-4 py-10 text-center text-gray-500">还没有签到活动</div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const now = Date.now()
              const inWindow = now >= Date.parse(activity.starts_at) && now <= Date.parse(activity.ends_at)
              return (
                <div
                  key={activity.id}
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
                    selectedId === activity.id ? 'border-anime-pink/60 bg-[#23233a]' : 'border-[#2a2a4a] bg-[#0f0f1a]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPin size={16} className="text-anime-pink" />
                      <h3 className="min-w-0 max-w-full truncate text-base font-semibold text-white">{activity.title}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs ${activity.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/15 text-gray-400'}`}>
                        {activity.is_active ? '已开启' : '已关闭'}
                      </span>
                      {activity.is_active && inWindow && (
                        <span className="rounded-full bg-anime-pink/15 px-2 py-1 text-xs text-anime-pink">进行中</span>
                      )}
                      <span className="rounded-full bg-[#23233a] px-2 py-1 text-xs text-gray-400">{activity.checkin_count} 人签到</span>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm text-gray-400 break-words">
                      {new Date(activity.starts_at).toLocaleString('zh-CN')} — {new Date(activity.ends_at).toLocaleString('zh-CN')}
                    </p>
                    {activity.note && <p className="mt-1 text-xs text-gray-500">{activity.note}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(selectedId === activity.id ? null : activity.id)}
                      className="rounded-lg bg-[#23233a] px-3 py-2.5 min-h-11 text-xs text-gray-300 hover:text-white"
                    >
                      {selectedId === activity.id ? '收起看板' : '查看签到'}
                    </button>
                    <button type="button" onClick={() => editActivity(activity)} className="rounded-lg bg-[#23233a] p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-gray-300 hover:text-white" title="编辑">
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(activity)}
                      className="rounded-lg bg-[#23233a] px-3 py-2.5 min-h-11 text-xs text-gray-300 hover:text-white"
                    >
                      {activity.is_active ? '关闭' : '开启'}
                    </button>
                    <button type="button" onClick={() => deleteActivity(activity)} className="rounded-lg bg-red-500/10 p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-red-300 hover:text-red-200" title="删除">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 签到看板 */}
      {selected && (
        <section className="space-y-5 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">「{selected.title}」签到看板</h2>
            <button
              type="button"
              onClick={() => loadCheckins(selected.id)}
              disabled={checkinsLoading}
              className="flex items-center gap-2 rounded-lg bg-[#23233a] px-3 py-2 text-xs text-gray-300 hover:text-white disabled:opacity-60"
            >
              <RefreshCw size={14} className={checkinsLoading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>

          <CheckinMap markers={markers} fitOnMarkers className="h-64 sm:h-96 border border-[#2a2a4a]" />

          {checkins.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2a2a4a] px-4 py-10 text-center text-gray-500">暂无签到记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a4a] text-gray-400">
                    <th className="px-3 py-3 font-medium">CN</th>
                    <th className="px-3 py-3 font-medium">签到时间</th>
                    <th className="px-3 py-3 font-medium">纬度</th>
                    <th className="px-3 py-3 font-medium">经度</th>
                    <th className="px-3 py-3 font-medium">精度</th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((record) => (
                    <tr key={record.id} className="border-b border-[#2a2a4a]/50 text-gray-200">
                      <td className="px-3 py-3 font-medium text-white">{record.cn}</td>
                      <td className="px-3 py-3 text-gray-400">{new Date(record.created_at).toLocaleString('zh-CN')}</td>
                      <td className="px-3 py-3 text-gray-400">{record.latitude.toFixed(6)}</td>
                      <td className="px-3 py-3 text-gray-400">{record.longitude.toFixed(6)}</td>
                      <td className="px-3 py-3 text-gray-400">{record.accuracy ? `${Math.round(record.accuracy)} 米` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-gray-400">{label}</span>
      {children}
    </label>
  )
}

/** ISO → datetime-local 输入值（本地时区） */
function toInputValue(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** datetime-local 输入值 → ISO（datetime-local 无时区，必须转） */
function fromInputValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
