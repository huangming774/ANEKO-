'use client'

import { useEffect, useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { Post } from '@/lib/app-types'

// 关闭状态按公告 id 记录：换新公告（不同 id）自动重新出现
const DISMISS_KEY = 'aneko-banner-dismissed'

export default function AnnouncementBanner({ enabled }: { enabled: boolean }) {
  const [post, setPost] = useState<Post | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!enabled) return

    apiRequest<Post[]>('/api/posts?status=published&limit=10')
      .then((posts) => {
        const list = posts || []
        // 置顶优先，其次最新一条；没有已发布公告则不渲染
        const candidate = list.find((item) => item.pinned) || list[0] || null
        if (!candidate) return

        setPost(candidate)
        try {
          setDismissed(localStorage.getItem(DISMISS_KEY) === candidate.id)
        } catch {
          // localStorage 不可用时照常显示
        }
      })
      .catch(() => setPost(null))
  }, [enabled])

  if (!enabled || !post || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, post.id)
    } catch {
      // ignore
    }
  }

  return (
    <div className="bg-gradient-to-r from-anime-pink/85 to-anime-purple/85 text-white">
      <div className="mx-auto flex h-9 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Megaphone size={14} className="shrink-0" />
        <a href={`/posts/${post.id}`} className="min-w-0 flex-1 truncate text-xs font-medium hover:underline">
          {post.title}
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="关闭公告横幅"
          className="shrink-0 rounded p-1 transition-colors hover:bg-white/20"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
