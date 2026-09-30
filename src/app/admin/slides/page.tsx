'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { ImagePlus, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { HeroSlide } from '@/lib/app-types'

type SlideForm = Pick<HeroSlide, 'title' | 'description' | 'image' | 'href' | 'sort_order' | 'is_active'>

const emptyForm: SlideForm = {
  title: '',
  description: '',
  image: '',
  href: '',
  sort_order: 0,
  is_active: true,
}

export default function AdminSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [form, setForm] = useState<SlideForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const loadSlides = async () => {
    setLoading(true)
    try {
      const data = await apiRequest<HeroSlide[]>('/api/hero-slides?all=1')
      setSlides(data)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSlides()
  }, [])

  const update = <K extends keyof SlideForm>(key: K, value: SlideForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const editSlide = (slide: HeroSlide) => {
    setEditingId(slide.id)
    setForm({
      title: slide.title,
      description: slide.description,
      image: slide.image,
      href: slide.href,
      sort_order: slide.sort_order,
      is_active: slide.is_active,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveSlide = async () => {
    setMessage('')
    if (!form.title.trim()) {
      setMessage('请输入轮播图标题')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await apiRequest<HeroSlide>(`/api/hero-slides/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        })
        setMessage('轮播图已更新')
      } else {
        await apiRequest<HeroSlide>('/api/hero-slides', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        setMessage('轮播图已添加')
      }
      resetForm()
      await loadSlides()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const deleteSlide = async (slide: HeroSlide) => {
    if (!window.confirm(`确定删除「${slide.title}」吗？`)) return

    setMessage('')
    try {
      await apiRequest(`/api/hero-slides/${slide.id}`, { method: 'DELETE' })
      setMessage('轮播图已删除')
      if (editingId === slide.id) resetForm()
      await loadSlides()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '删除失败')
    }
  }

  const toggleActive = async (slide: HeroSlide) => {
    setMessage('')
    try {
      await apiRequest<HeroSlide>(`/api/hero-slides/${slide.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !slide.is_active }),
      })
      await loadSlides()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新失败')
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
      setMessage('图片已上传，记得保存轮播图')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">首页轮播</h1>
          <p className="mt-1 text-sm text-gray-500">管理首页首屏轮播图，图片上传后会保存到 R2/S3。</p>
        </div>
        <button type="button" onClick={resetForm} className="flex items-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2 text-sm text-white hover:bg-[#23233a]">
          <Plus size={16} />
          新增轮播
        </button>
      </div>

      {message && <div className="rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] px-4 py-3 text-gray-200">{message}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <section className="space-y-5 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-6">
          <h2 className="text-base font-semibold text-white">{editingId ? '编辑轮播图' : '新增轮播图'}</h2>
          <ImageUploader value={form.image} uploading={uploading} onUpload={uploadImage} onChange={(value) => update('image', value)} />
          <Input label="标题" value={form.title} onChange={(value) => update('title', value)} />
          <Textarea label="描述" value={form.description} onChange={(value) => update('description', value)} />
          <Input label="点击跳转链接" value={form.href} placeholder="/events 或 https://..." onChange={(value) => update('href', value)} />
          <Input
            label="排序"
            type="number"
            value={String(form.sort_order)}
            onChange={(value) => update('sort_order', Number(value) || 0)}
          />
          <Toggle label="启用轮播" checked={form.is_active} onChange={(value) => update('is_active', value)} />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={saveSlide}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              保存
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-xl bg-[#0f0f1a] px-4 py-3 text-sm text-gray-300 hover:text-white">
                取消
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-6">
          <h2 className="mb-5 text-base font-semibold text-white">轮播列表</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              加载中...
            </div>
          ) : slides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2a2a4a] px-4 py-10 text-center text-gray-500">还没有轮播图</div>
          ) : (
            <div className="space-y-4">
              {slides.map((slide) => (
                <div key={slide.id} className="grid gap-4 rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] p-4 md:grid-cols-[180px_1fr_auto]">
                  <div className="aspect-video overflow-hidden rounded-lg bg-[#19192a]">
                    {slide.image ? <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-white">{slide.title}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs ${slide.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/15 text-gray-400'}`}>
                        {slide.is_active ? '已启用' : '已停用'}
                      </span>
                      <span className="rounded-full bg-[#23233a] px-2 py-1 text-xs text-gray-400">排序 {slide.sort_order}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">{slide.description || '暂无描述'}</p>
                    {slide.href && <p className="mt-2 truncate text-xs text-anime-blue">{slide.href}</p>}
                  </div>
                  <div className="flex items-center gap-2 md:flex-col md:items-stretch">
                    <button type="button" onClick={() => editSlide(slide)} className="rounded-lg bg-[#23233a] p-2 text-gray-300 hover:text-white" title="编辑">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => toggleActive(slide)} className="rounded-lg bg-[#23233a] px-3 py-2 text-xs text-gray-300 hover:text-white">
                      {slide.is_active ? '停用' : '启用'}
                    </button>
                    <button type="button" onClick={() => deleteSlide(slide)} className="rounded-lg bg-red-500/10 p-2 text-red-300 hover:text-red-200" title="删除">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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
      <span className="block text-sm text-gray-400">轮播图片</span>
      <div className="aspect-video overflow-hidden rounded-xl border border-[#2a2a4a] bg-[#0f0f1a]">
        {value ? (
          <img src={value} alt="轮播预览" className="h-full w-full object-cover" />
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

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-gray-400">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-anime-pink focus:outline-none"
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
        rows={4}
        className="w-full resize-none rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white focus:border-anime-pink focus:outline-none"
      />
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
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
