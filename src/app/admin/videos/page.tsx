'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Film, ImagePlus, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import { uploadImageFile } from '@/lib/client-upload'
import type { Video, VideoSourceType } from '@/lib/app-types'
import {
  ALLOWED_VIDEO_TYPES,
  VIDEO_MAX_BYTES,
  extractBilibiliBvid,
  formatVideoSize,
} from '@/lib/video'

type VideoForm = {
  title: string
  description: string
  cover: string
  source_type: VideoSourceType
  bilibili_url: string
  is_active: boolean
}

const emptyForm: VideoForm = {
  title: '',
  description: '',
  cover: '',
  source_type: 'upload',
  bilibili_url: '',
  is_active: true,
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [form, setForm] = useState<VideoForm>(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [fetchingInfo, setFetchingInfo] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'info' | 'error'>('info')
  const autoCoverRef = useRef('')

  const loadVideos = async () => {
    setLoading(true)
    try {
      const data = await apiRequest<Video[]>('/api/videos?all=1')
      setVideos(data)
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const update = <K extends keyof VideoForm>(key: K, value: VideoForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setFile(null)
    setEditingId(null)
    setUploadProgress(null)
  }

  const editVideo = (video: Video) => {
    setEditingId(video.id)
    setFile(null)
    setUploadProgress(null)
    setForm({
      title: video.title,
      description: video.description,
      cover: video.cover,
      source_type: video.source_type,
      bilibili_url: video.bilibili_bvid ? `https://www.bilibili.com/video/${video.bilibili_bvid}` : '',
      is_active: video.is_active,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showMessage = (text: string, type: 'info' | 'error' = 'info') => {
    setMessage(text)
    setMessageType(type)
  }

  // 从 B 站获取官方封面/标题/简介，自动填入表单（只填空白项；封面可被再次获取覆盖）
  const fetchBilibiliPreview = async (manual: boolean) => {
    const bvid = extractBilibiliBvid(form.bilibili_url)
    if (!bvid) {
      if (manual) showMessage('无效的哔哩哔哩视频链接，请粘贴完整链接（如 https://www.bilibili.com/video/BV...）', 'error')
      return
    }

    setFetchingInfo(true)
    try {
      const info = await apiRequest<{ bvid: string; title: string; description: string; cover: string }>(
        `/api/videos/bilibili-info?url=${encodeURIComponent(form.bilibili_url)}`,
      )
      setForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : info.title,
        description: current.description.trim() ? current.description : info.description,
        cover: !current.cover || current.cover === autoCoverRef.current ? info.cover : current.cover,
      }))
      if (info.cover) autoCoverRef.current = info.cover
      showMessage('已获取 B 站视频信息，可修改后保存')
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '获取视频信息失败', 'error')
    } finally {
      setFetchingInfo(false)
    }
  }

  const saveVideo = async () => {
    setMessage('')
    if (!form.title.trim()) {
      showMessage('请输入视频标题', 'error')
      return
    }

    const editing = editingId ? videos.find((item) => item.id === editingId) : null
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description,
      cover: form.cover,
      is_active: form.is_active,
    }

    setSaving(true)
    try {
      if (form.source_type === 'bilibili') {
        const bvid = extractBilibiliBvid(form.bilibili_url)
        if (!bvid) {
          showMessage('无效的哔哩哔哩视频链接，请粘贴完整链接（如 https://www.bilibili.com/video/BV...）', 'error')
          setSaving(false)
          return
        }
        payload.source_type = 'bilibili'
        payload.bilibili_bvid = bvid
      } else {
        if (file) {
          if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
            showMessage('只支持 MP4、WebM、MOV 或 MKV 视频，推荐 MP4', 'error')
            setSaving(false)
            return
          }
          if (file.size > VIDEO_MAX_BYTES) {
            showMessage(`视频不能超过 500MB（当前 ${formatVideoSize(file.size)}）`, 'error')
            setSaving(false)
            return
          }
          const target = await apiRequest<{ uploadUrl: string; key: string; publicUrl: string }>(
            '/api/videos/upload-url',
            {
              method: 'POST',
              body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
            },
          )
          setUploadProgress(0)
          await putFileWithProgress(file, target.uploadUrl, setUploadProgress)
          setUploadProgress(null)
          payload.source_type = 'upload'
          payload.source_url = target.publicUrl
          payload.r2_key = target.key
        } else if (!editing || editing.source_type !== 'upload') {
          showMessage('请先选择视频文件（或切换到「哔哩哔哩链接」填 B 站链接）', 'error')
          setSaving(false)
          return
        } else {
          // 编辑已有上传视频且未更换文件：保留原 source_url/r2_key
          payload.source_type = 'upload'
          payload.source_url = editing.source_url
          payload.r2_key = editing.r2_key
        }
      }

      if (editingId) {
        await apiRequest<Video>(`/api/videos/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        showMessage('视频已更新')
      } else {
        await apiRequest<Video>('/api/videos', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        showMessage('视频已添加')
      }
      resetForm()
      await loadVideos()
    } catch (err) {
      setUploadProgress(null)
      showMessage(err instanceof Error ? err.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteVideo = async (video: Video) => {
    if (!window.confirm(`确定删除「${video.title}」吗？`)) return

    setMessage('')
    try {
      await apiRequest(`/api/videos/${video.id}`, { method: 'DELETE' })
      showMessage('视频已删除')
      if (editingId === video.id) resetForm()
      await loadVideos()
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '删除失败', 'error')
    }
  }

  const toggleActive = async (video: Video) => {
    setMessage('')
    try {
      await apiRequest<Video>(`/api/videos/${video.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !video.is_active }),
      })
      await loadVideos()
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '更新失败', 'error')
    }
  }

  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const coverFile = event.target.files?.[0]
    if (!coverFile) return

    setUploading(true)
    setMessage('')
    try {
      update('cover', await uploadImageFile(coverFile))
      showMessage('封面已上传，记得保存视频')
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '上传失败', 'error')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const selectVideoFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) return

    if (!ALLOWED_VIDEO_TYPES.has(selected.type)) {
      showMessage('只支持 MP4、WebM、MOV 或 MKV 视频，推荐 MP4', 'error')
      event.target.value = ''
      return
    }
    if (selected.size > VIDEO_MAX_BYTES) {
      showMessage(`视频不能超过 500MB（当前 ${formatVideoSize(selected.size)}）`, 'error')
      event.target.value = ''
      return
    }
    setMessage('')
    setFile(selected)
    event.target.value = ''
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">视频管理</h1>
          <p className="mt-1 text-sm text-gray-500">上传视频到 R2/S3（最大 500MB）或添加哔哩哔哩视频链接。</p>
        </div>
        <button type="button" onClick={resetForm} className="flex items-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2 text-sm text-white hover:bg-[#23233a]">
          <Plus size={16} />
          新增视频
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <section className="space-y-5 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-6">
          <h2 className="text-base font-semibold text-white">{editingId ? '编辑视频' : '新增视频'}</h2>
          <ImageUploader value={form.cover} uploading={uploading} onUpload={uploadCover} onChange={(value) => update('cover', value)} />
          <Input label="标题" value={form.title} onChange={(value) => update('title', value)} />
          <Textarea label="描述" value={form.description} onChange={(value) => update('description', value)} />

          <div className="space-y-2">
            <span className="block text-sm text-gray-400">视频来源</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update('source_type', 'upload')}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${form.source_type === 'upload' ? 'bg-gradient-to-r from-anime-pink to-anime-purple text-white' : 'bg-[#0f0f1a] text-gray-300 hover:text-white'}`}
              >
                上传视频
              </button>
              <button
                type="button"
                onClick={() => update('source_type', 'bilibili')}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${form.source_type === 'bilibili' ? 'bg-gradient-to-r from-anime-pink to-anime-purple text-white' : 'bg-[#0f0f1a] text-gray-300 hover:text-white'}`}
              >
                哔哩哔哩链接
              </button>
            </div>
          </div>

          {form.source_type === 'bilibili' ? (
            <div className="space-y-3">
              <Input
                label="哔哩哔哩视频链接"
                value={form.bilibili_url}
                placeholder="https://www.bilibili.com/video/BV..."
                onChange={(value) => update('bilibili_url', value)}
                onBlur={() => fetchBilibiliPreview(false)}
              />
              <button
                type="button"
                onClick={() => fetchBilibiliPreview(true)}
                disabled={fetchingInfo}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f0f1a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#23233a] disabled:opacity-60"
              >
                {fetchingInfo ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                {fetchingInfo ? '获取中...' : '自动获取封面和标题'}
              </button>
              <p className="text-xs text-gray-500">粘贴链接后会自动获取 B 站官方封面、标题和简介（封面为空时自动填入，已手动上传的封面不会被覆盖）。</p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="block text-sm text-gray-400">视频文件</span>
              <p className="text-xs text-gray-500">支持 MP4、WebM、MOV、MKV，最大 500MB，推荐 MP4（H.264）以保证浏览器兼容。保存时才会开始上传。</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0f0f1a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#23233a]">
                <Film size={16} />
                {file ? `已选择：${file.name}（${formatVideoSize(file.size)}）` : '选择视频文件'}
                <input type="file" accept="video/mp4,video/webm,.mov,.mkv" className="hidden" onChange={selectVideoFile} />
              </label>
              {editingId && !file && (
                <p className="text-xs text-gray-500">不重新选择文件则保留原视频。</p>
              )}
              {uploadProgress !== null && (
                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#0f0f1a]">
                    <div className="h-full rounded-full bg-gradient-to-r from-anime-pink to-anime-purple transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">上传中 {uploadProgress}%（上传到 R2，保存后生效）</p>
                </div>
              )}
            </div>
          )}

          <Toggle label="启用视频" checked={form.is_active} onChange={(value) => update('is_active', value)} />
          {message && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                messageType === 'error'
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              {message}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={saveVideo}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {uploadProgress !== null ? `上传中 ${uploadProgress}%` : '保存'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-xl bg-[#0f0f1a] px-4 py-3 text-sm text-gray-300 hover:text-white">
                取消
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-6">
          <h2 className="mb-5 text-base font-semibold text-white">视频列表</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              加载中...
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2a2a4a] px-4 py-10 text-center text-gray-500">还没有视频</div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div key={video.id} className="grid gap-4 rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] p-4 md:grid-cols-[180px_1fr_auto]">
                  <div className="aspect-video overflow-hidden rounded-lg bg-[#19192a]">
                    {video.cover ? (
                      <img src={video.cover} alt={video.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">🎬</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-white">{video.title}</h3>
                      <span className="rounded-full bg-anime-blue/15 px-2 py-1 text-xs text-anime-blue">
                        {video.source_type === 'bilibili' ? 'B站' : '上传'}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs ${video.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/15 text-gray-400'}`}>
                        {video.is_active ? '已启用' : '已停用'}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">{video.description || '暂无描述'}</p>
                    <p className="mt-2 truncate text-xs text-anime-blue">
                      {video.source_type === 'bilibili'
                        ? `https://www.bilibili.com/video/${video.bilibili_bvid}`
                        : video.source_url}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 md:flex-col md:items-stretch">
                    <button type="button" onClick={() => editVideo(video)} className="rounded-lg bg-[#23233a] p-2 text-gray-300 hover:text-white" title="编辑">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => toggleActive(video)} className="rounded-lg bg-[#23233a] px-3 py-2 text-xs text-gray-300 hover:text-white">
                      {video.is_active ? '停用' : '启用'}
                    </button>
                    <button type="button" onClick={() => deleteVideo(video)} className="rounded-lg bg-red-500/10 p-2 text-red-300 hover:text-red-200" title="删除">
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

function putFileWithProgress(file: File, uploadUrl: string, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else if (xhr.status === 403) {
        reject(new Error('上传被拒绝（403）：请检查 R2 CORS 配置或预签名是否过期'))
      } else {
        reject(new Error(`上传失败（HTTP ${xhr.status}）`))
      }
    }
    xhr.onerror = () => reject(new Error('上传失败：网络错误或 R2 CORS 未配置'))
    xhr.send(file)
  })
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
      <span className="block text-sm text-gray-400">封面图片（可选）</span>
      <div className="aspect-video overflow-hidden rounded-xl border border-[#2a2a4a] bg-[#0f0f1a]">
        {value ? (
          <img src={value} alt="封面预览" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            <ImagePlus size={32} />
          </div>
        )}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0f0f1a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#23233a]">
        <ImagePlus size={16} />
        {uploading ? '上传中...' : '上传封面'}
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
      </label>
      <Input label="封面 URL" value={value} onChange={onChange} />
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
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
        onBlur={onBlur}
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
