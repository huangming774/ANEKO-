'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { ImagePlus, Loader2, Megaphone, Pencil, Pin, Save, Trash2 } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { Post, PostCategory, PostStatus } from '@/lib/app-types'

type PostForm = {
  title: string
  content: string
  image: string
  category: PostCategory
  status: PostStatus
  pinned: boolean
}

const categories: PostCategory[] = ['公告', '活动', '分享', '通知']

const emptyForm: PostForm = {
  title: '',
  content: '',
  image: '',
  category: '公告',
  status: 'published',
  pinned: false,
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<PostForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = () => {
    apiRequest<Post[]>('/api/posts')
      .then(setPosts)
      .catch((err) => setMessage(err instanceof Error ? err.message : '加载失败'))
  }

  useEffect(load, [])

  const filtered = useMemo(
    () => posts.filter((post) => post.title.includes(search) || post.content.includes(search)),
    [posts, search],
  )

  const update = <K extends keyof PostForm>(key: K, value: PostForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const editPost = (post: Post) => {
    setEditingId(post.id)
    setForm({
      title: post.title,
      content: post.content,
      image: post.image,
      category: post.category,
      status: post.status,
      pinned: post.pinned,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const savePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')

    if (!form.title.trim()) {
      setMessage('请输入公告标题')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await apiRequest<Post>(`/api/posts/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        })
        setMessage('公告已更新')
      } else {
        await apiRequest<Post>('/api/posts', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        setMessage('公告已保存')
      }
      resetForm()
      load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const patchPost = async (id: string, patch: Partial<Post>) => {
    setMessage('')
    try {
      await apiRequest(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败')
    }
  }

  const deletePost = async (post: Post) => {
    if (!window.confirm(`确定删除「${post.title}」吗？`)) return
    setMessage('')
    try {
      await apiRequest(`/api/posts/${post.id}`, { method: 'DELETE' })
      if (editingId === post.id) resetForm()
      load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '删除失败')
    }
  }

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || '上传失败')
      }

      update('image', payload.data.url)
      setMessage('图片已上传，记得保存公告')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {message && <div className="rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] px-4 py-3 text-gray-200">{message}</div>}

      <form onSubmit={savePost} className="grid grid-cols-1 gap-5 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-5 xl:grid-cols-[360px_1fr]">
        <ImageUploader value={form.image} uploading={uploading} onUpload={uploadImage} onChange={(value) => update('image', value)} />

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_150px_150px]">
            <Input label="公告标题" value={form.title} onChange={(value) => update('title', value)} />
            <label className="block">
              <span className="mb-2 block text-sm text-gray-400">分类</span>
              <select
                value={form.category}
                onChange={(event) => update('category', event.target.value as PostCategory)}
                className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-400">状态</span>
              <select
                value={form.status}
                onChange={(event) => update('status', event.target.value as PostStatus)}
                className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white"
              >
                <option value="published">发布</option>
                <option value="draft">草稿</option>
              </select>
            </label>
          </div>

          <Textarea label="公告内容" value={form.content} onChange={(value) => update('content', value)} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Toggle label="置顶公告" checked={form.pinned} onChange={(value) => update('pinned', value)} />
            <div className="flex gap-3">
              {editingId && (
                <button type="button" onClick={resetForm} className="rounded-xl bg-[#0f0f1a] px-5 py-3 text-sm text-gray-300 hover:text-white">
                  取消编辑
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingId ? '更新公告' : '保存公告'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索公告标题或内容..."
          className="w-full max-w-sm rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-2.5 text-sm text-white"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e]">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Megaphone size={40} className="mx-auto mb-3 opacity-40" />
            <p>暂无公告</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a4a]">
            {filtered.map((post) => (
              <div key={post.id} className="grid grid-cols-1 items-center gap-4 px-6 py-4 md:grid-cols-[96px_1fr_100px_110px_150px]">
                <div className="aspect-video overflow-hidden rounded-lg bg-[#0f0f1a]">
                  {post.image ? <img src={post.image} alt={post.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium text-white">
                    {post.pinned && <Pin size={14} className="text-anime-purple" />}
                    <span className="truncate">{post.title}</span>
                  </div>
                  <p className="line-clamp-1 text-sm text-gray-500">{post.content || '暂无内容'}</p>
                </div>
                <span className="text-sm text-gray-400">{post.category}</span>
                <button
                  type="button"
                  onClick={() => patchPost(post.id, { status: post.status === 'published' ? 'draft' : 'published' })}
                  className="rounded-lg bg-[#2a2a4a] px-3 py-2 text-sm text-gray-300"
                >
                  {post.status === 'published' ? '已发布' : '草稿'}
                </button>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => editPost(post)} className="rounded-lg bg-[#2a2a4a] p-2 text-gray-400 hover:text-white" title="编辑">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => patchPost(post.id, { pinned: !post.pinned })} className="rounded-lg bg-[#2a2a4a] p-2 text-gray-400 hover:text-anime-pink" title="置顶">
                    <Pin size={14} />
                  </button>
                  <button type="button" onClick={() => deletePost(post)} className="rounded-lg bg-[#2a2a4a] p-2 text-gray-400 hover:text-red-400" title="删除">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ImageUploader({
  value,
  uploading,
  onUpload,
  onChange,
}: {
  value: string
  uploading: boolean
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-3">
      <span className="block text-sm text-gray-400">公告图片</span>
      <div className="aspect-video overflow-hidden rounded-xl border border-[#2a2a4a] bg-[#0f0f1a]">
        {value ? (
          <img src={value} alt="公告预览" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            <ImagePlus size={32} />
          </div>
        )}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0f0f1a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#23233a]">
        <ImagePlus size={16} />
        {uploading ? '上传中...' : '上传图片'}
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
      </label>
      <Input label="图片 URL" value={value} onChange={onChange} />
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-gray-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white focus:border-anime-pink focus:outline-none"
      />
    </label>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-gray-400">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="w-full resize-none rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white focus:border-anime-pink focus:outline-none"
      />
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-anime-pink' : 'bg-[#2a2a4a]'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}
