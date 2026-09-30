'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Megaphone } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { Post } from '@/lib/app-types'

export default function PostDetailPage() {
  const params = useParams<{ id: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!params?.id) return

    apiRequest<Post>(`/api/posts/${params.id}`)
      .then(setPost)
      .catch((err) => setError(err instanceof Error ? err.message : '公告加载失败'))
      .finally(() => setLoading(false))
  }, [params?.id])

  return (
    <main className="min-h-screen bg-gradient-to-br from-anime-light via-white to-anime-light pt-24">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-anime-pink hover:text-anime-purple">
          <ArrowLeft size={16} />
          返回首页
        </Link>

        {loading ? (
          <div className="space-y-5 rounded-2xl bg-white p-8 shadow-lg">
            <div className="h-8 w-2/3 animate-pulse rounded bg-gray-100" />
            <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
            <div className="space-y-3">
              <div className="h-4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center text-gray-500 shadow-lg">
            <Megaphone size={40} className="mx-auto mb-3 opacity-40" />
            <p>{error}</p>
          </div>
        ) : post ? (
          <article className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="p-6 md:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="rounded-full bg-anime-pink/10 px-3 py-1 font-semibold text-anime-pink">{post.category}</span>
                <span className="inline-flex items-center gap-2">
                  <Calendar size={16} />
                  {formatDate(post.published_at || post.created_at)}
                </span>
              </div>

              <h1 className="text-3xl font-bold leading-tight text-gray-900 md:text-5xl">{post.title}</h1>
            </div>

            {post.image ? (
              <img src={post.image} alt={post.title} className="max-h-[520px] w-full object-cover" />
            ) : (
              <div className="flex h-72 items-center justify-center bg-gradient-to-br from-anime-pink to-anime-purple text-white">
                <Megaphone size={48} />
              </div>
            )}

            <div className="p-6 md:p-8">
              <div className="whitespace-pre-wrap text-base leading-8 text-gray-700 md:text-lg">
                {post.content || '暂无内容'}
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </main>
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
