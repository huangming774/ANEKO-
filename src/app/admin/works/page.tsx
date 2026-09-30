'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, Eye, Palette, Trash2, X } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { Work, WorkStatus } from '@/lib/app-types'

const tabs: Array<{ key: 'all' | WorkStatus; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
]

const statusText: Record<WorkStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

const categoryText: Record<Work['category'], string> = {
  illustration: '插画',
  photography: '摄影',
  cosplay: 'Cosplay',
  video: '视频',
  craft: '手工',
}

export default function WorksPage() {
  const [works, setWorks] = useState<Work[]>([])
  const [activeTab, setActiveTab] = useState<'all' | WorkStatus>('all')
  const [message, setMessage] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = () => {
    apiRequest<Work[]>('/api/works')
      .then(setWorks)
      .catch((err) => setMessage(err instanceof Error ? err.message : '加载失败'))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    return activeTab === 'all' ? works : works.filter((work) => work.status === activeTab)
  }, [activeTab, works])

  const setStatus = async (id: string, status: WorkStatus) => {
    setMessage('')
    try {
      await apiRequest(`/api/works/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败')
    }
  }

  const deleteWork = async (work: Work) => {
    if (!window.confirm(`确定删除作品「${work.title}」吗？删除后不可恢复。`)) return

    setMessage('')
    setDeletingId(work.id)
    try {
      await apiRequest(`/api/works/${work.id}`, { method: 'DELETE' })
      setWorks((current) => current.filter((item) => item.id !== work.id))
      setMessage('作品已删除')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {message && <div className="rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] px-4 py-3 text-gray-200">{message}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="作品总数" value={works.length} />
        <Stat label="待审核" value={works.filter((work) => work.status === 'pending').length} />
        <Stat label="已通过" value={works.filter((work) => work.status === 'approved').length} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-anime-pink to-anime-purple text-white'
                : 'bg-[#2a2a4a] text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] py-16 text-center">
          <Palette size={40} className="mx-auto mb-3 text-gray-500 opacity-40" />
          <p className="text-gray-500">暂无作品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((work) => (
            <div key={work.id} className="overflow-hidden rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e]">
              <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-anime-pink/30 to-anime-purple/30">
                {work.image ? (
                  <img src={work.image} alt={work.title} className="h-full w-full object-cover" />
                ) : (
                  <Palette size={56} className="text-white/50" />
                )}
                <span className="absolute right-3 top-3 rounded-lg bg-black/40 px-2.5 py-1 text-xs font-medium text-white">
                  {statusText[work.status]}
                </span>
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <h3 className="truncate text-sm font-semibold text-white">{work.title}</h3>
                  <p className="mt-1 text-xs text-gray-400">{new Date(work.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{categoryText[work.category]}</span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Eye size={14} />
                    {work.likes}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-gray-400">{work.description || '暂无描述'}</p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStatus(work.id, 'approved')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
                  >
                    <Check size={14} />
                    通过
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(work.id, 'rejected')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/15 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
                  >
                    <X size={14} />
                    拒绝
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteWork(work)}
                    disabled={deletingId === work.id}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    {deletingId === work.id ? '删除中' : '删除'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-anime-pink to-anime-purple text-white">
        <Clock size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  )
}
