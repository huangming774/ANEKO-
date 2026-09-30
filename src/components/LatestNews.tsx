'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, Megaphone } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { Post } from '@/lib/app-types'

export default function LatestNews() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<Post[]>('/api/posts?status=published&limit=4')
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="dot-bg px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-16 text-center text-4xl font-bold gradient-text">最新公告</h2>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-96 animate-pulse rounded-2xl bg-white shadow-lg" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center text-gray-500 shadow-lg">
            <Megaphone size={40} className="mx-auto mb-3 opacity-40" />
            <p>暂无公告</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="group overflow-hidden rounded-2xl bg-white shadow-lg card-hover"
              >
                <div className="h-48 bg-gradient-to-br from-anime-pink to-anime-purple">
                  {post.image ? (
                    <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-white">
                      <Megaphone size={36} className="mb-2" />
                      <span className="text-sm">公告图片</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="mb-3 flex items-center text-sm text-gray-500">
                    <Calendar size={16} className="mr-2" />
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                  </div>

                  <h3 className="mb-3 line-clamp-2 text-xl font-bold text-gray-800">{post.title}</h3>

                  <p className="mb-4 line-clamp-3 text-sm text-gray-600">{post.content || '暂无内容'}</p>

                  <div className="flex items-center font-semibold text-anime-pink">
                    <span>阅读更多</span>
                    <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
