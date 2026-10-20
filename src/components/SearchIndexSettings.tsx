'use client'

import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/client-api'

export default function SearchIndexSettings() {
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  async function sync() {
    if (controller.current) return
    const request = new AbortController()
    controller.current = request
    setRunning(true)
    let total = 0
    try {
      for (const type of ['post', 'event', 'work', 'video']) {
        let offset: number | null = 0
        do {
          setMessage('正在同步公开内容，已处理 ' + total + ' 条…')
          const page: { count: number; nextOffset: number | null } = await apiRequest('/api/admin/search/reindex', {
            method: 'POST', body: JSON.stringify({ type, offset }), signal: request.signal,
          })
          total += page.count
          offset = page.nextOffset
        } while (offset !== null)
      }
      setMessage('同步完成，共处理 ' + total + ' 条公开内容。新内容可能需要片刻才可检索。')
    } catch (error) {
      if (!request.signal.aborted) setMessage((error instanceof Error ? error.message : '同步失败') + '；可重新点击同步重试。')
    } finally {
      controller.current = null
      if (!request.signal.aborted) setRunning(false)
    }
  }

  return <section className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-6">
    <h2 className="mb-3 font-semibold text-white">站内搜索</h2>
    <p className="mb-4 text-sm text-gray-400">首次配置语义搜索后，点击同步导入现有公开文章、活动、作品和视频。以后在网站内保存内容时会自动同步。中途离开页面会停止本次导入，可以重新运行。</p>
    <button type="button" onClick={sync} disabled={running} className="rounded-lg bg-anime-pink px-4 py-2 text-sm text-white disabled:opacity-50">{running ? '同步中…' : '同步搜索索引'}</button>
    {message && <p role="status" className="mt-3 text-sm text-gray-300">{message}</p>}
  </section>
}
