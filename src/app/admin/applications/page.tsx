'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, Phone, RefreshCw, Search, Trash2, UserPlus, X } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { JoinApplication, JoinApplicationStatus } from '@/lib/app-types'

const tabs: Array<{ key: 'all' | JoinApplicationStatus; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
]

const statusText: Record<JoinApplicationStatus, string> = {
  pending: '待处理',
  approved: '已通过',
  rejected: '已拒绝',
}

const statusClass: Record<JoinApplicationStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300',
}

const gradeText: Record<string, string> = {
  '1': '大一',
  '2': '大二',
  '3': '大三',
  '4': '大四',
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JoinApplication[]>([])
  const [activeTab, setActiveTab] = useState<'all' | JoinApplicationStatus>('all')
  const [keyword, setKeyword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setMessage('')
    apiRequest<JoinApplication[]>('/api/join-applications')
      .then(setApplications)
      .catch((err) => setMessage(err instanceof Error ? err.message : '加载报名失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return applications.filter((application) => {
      const matchesStatus = activeTab === 'all' || application.status === activeTab
      const matchesKeyword = !text || [
        application.name,
        application.student_id,
        application.grade,
        application.major,
        application.phone,
        application.qq,
        application.intro,
      ].some((value) => String(value || '').toLowerCase().includes(text))

      return matchesStatus && matchesKeyword
    })
  }, [activeTab, applications, keyword])

  const setStatus = async (id: string, status: JoinApplicationStatus) => {
    setMessage('')
    setUpdatingId(id)

    try {
      const updated = await apiRequest<JoinApplication>(`/api/join-applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setApplications((current) => current.map((item) => (item.id === id ? updated : item)))
      setMessage('报名状态已更新')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新报名失败')
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteApplication = async (application: JoinApplication) => {
    if (!window.confirm(`确定删除「${application.name}」的报名信息吗？删除后不可恢复。`)) return

    setMessage('')
    setDeletingId(application.id)

    try {
      await apiRequest(`/api/join-applications/${application.id}`, { method: 'DELETE' })
      setApplications((current) => current.filter((item) => item.id !== application.id))
      setMessage('报名信息已删除')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '删除报名失败')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] px-4 py-3 text-gray-200">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="报名总数" value={applications.length} />
        <Stat label="待处理" value={applications.filter((item) => item.status === 'pending').length} />
        <Stat label="已通过" value={applications.filter((item) => item.status === 'approved').length} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索姓名、学号、手机或 QQ"
              className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-anime-pink sm:w-72"
            />
          </label>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-2 text-sm text-gray-300 transition-colors hover:border-anime-pink/50 hover:text-white"
          >
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] py-16 text-center text-gray-500">
          正在加载报名信息...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] py-16 text-center">
          <UserPlus size={40} className="mx-auto mb-3 text-gray-500 opacity-40" />
          <p className="text-gray-500">暂无报名信息</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filtered.map((application) => (
            <article key={application.id} className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">{application.name}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[application.status]}`}>
                      {statusText[application.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    {application.student_id} · {gradeText[application.grade] || application.grade || '未填写年级'}
                    {application.major ? ` · ${application.major}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    提交时间：{new Date(application.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus(application.id, 'approved')}
                    disabled={updatingId === application.id || application.status === 'approved'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check size={14} />
                    通过
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(application.id, 'rejected')}
                    disabled={updatingId === application.id || application.status === 'rejected'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X size={14} />
                    拒绝
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteApplication(application)}
                    disabled={deletingId === application.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deletingId === application.id ? '删除中' : '删除'}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-300 sm:grid-cols-2">
                <ContactLine label="手机" value={application.phone} />
                <ContactLine label="QQ" value={application.qq} />
              </div>

              <div className="mt-4 rounded-xl bg-[#0f0f1a] p-4">
                <p className="mb-2 text-xs font-medium text-gray-500">自我介绍 / 想说的话</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">{application.intro || '未填写'}</p>
              </div>
            </article>
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

function ContactLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[#0f0f1a] px-4 py-3">
      <Phone size={15} className="text-gray-500" />
      <span className="text-gray-500">{label}：</span>
      <span className="font-medium text-white">{value || '-'}</span>
    </div>
  )
}
