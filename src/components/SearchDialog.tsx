'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

type SearchResult = {
  id?: string
  title?: string
  excerpt?: string
  description?: string
  type?: string
  url?: string
}

type SearchDialogProps = { open: boolean; onClose: () => void }

const typeNames: Record<string, string> = { post: '文章', event: '活动', work: '作品', video: '视频' }

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('')
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery(''); setResults([]); setError(''); setMode(''); setSearched(false); setLoading(false)
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const elements = dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button, input')
        if (!elements?.length) return
        const first = elements[0]
        const last = elements[elements.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      requestRef.current?.abort()
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) { setResults([]); return }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true); setError(''); setMode(''); setSearched(true)
    try {
      const response = await fetch('/api/search?q=' + encodeURIComponent(value), { headers: { Accept: 'application/json' }, signal: controller.signal })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '搜索暂时不可用，请稍后再试')
      if (controller.signal.aborted) return
      setMode(payload.mode || '')
      setResults(Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [])
    } catch (cause) {
      if (!controller.signal.aborted) { setResults([]); setError(cause instanceof Error ? cause.message : '搜索暂时不可用，请稍后再试') }
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[max(5.5rem,12vh)]" role="dialog" aria-modal="true" aria-label="站内搜索">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <form onSubmit={submit} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Search size={21} className="shrink-0 text-anime-pink" aria-hidden />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} placeholder="搜索文章、活动、作品和视频…" className="min-w-0 flex-1 bg-transparent py-1 text-base text-gray-800 outline-none placeholder:text-gray-400" aria-label="搜索关键词" />
          <button type="submit" disabled={loading || !query.trim()} className="shrink-0 rounded-lg bg-anime-pink px-3 py-2 text-sm text-white disabled:opacity-40">搜索</button>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700" aria-label="关闭搜索"><X size={19} /></button>
        </form>
        <div className="max-h-[min(60vh,30rem)] overflow-y-auto p-3" aria-live="polite" aria-busy={loading}>
          {loading && <p className="px-3 py-8 text-center text-sm text-gray-400">正在搜索…</p>}
          {!loading && error && <p className="px-3 py-8 text-center text-sm text-gray-500">{error}</p>}
          {!loading && !error && mode === 'keyword' && <p className="px-3 py-2 text-xs text-gray-400">当前使用关键词搜索</p>}
          {!loading && !error && searched && results.length === 0 && <p className="px-3 py-8 text-center text-sm text-gray-400">没有找到相关内容</p>}
          {!loading && !error && results.length > 0 && <div className="space-y-1">{results.map((result, index) => {
            const href = result.url?.startsWith('/') && !result.url.startsWith('//') ? result.url : '#'
            return <a key={(result.type || 'result') + '-' + (result.id || index)} href={href} onClick={onClose} className="block rounded-xl px-3 py-3 transition-colors hover:bg-anime-pink/10"><div className="flex items-center gap-2"><span className="truncate font-medium text-gray-800">{result.title || '未命名内容'}</span>{result.type && <span className="shrink-0 rounded-full bg-anime-purple/10 px-2 py-0.5 text-xs text-anime-purple">{typeNames[result.type] || result.type}</span>}</div>{(result.description || result.excerpt) && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{result.description || result.excerpt}</p>}</a>
          })}</div>}
          {!searched && <p className="px-3 py-8 text-center text-sm text-gray-400">输入关键词，按回车或点击搜索</p>}
        </div>
      </div>
    </div>
  )
}
