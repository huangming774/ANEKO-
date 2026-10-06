'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { ImagePlus, Save, Settings } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import { uploadImageFile } from '@/lib/client-upload'
import type { SiteSettings } from '@/lib/app-types'

const defaults: Partial<SiteSettings> = {
  club_name: 'ANEKO动漫社',
  club_description: '',
  logo_url: '',
  contact_email: '',
  contact_phone: '',
  site_title: 'ANEKO动漫社',
  site_description: 'ANEKO动漫社官方网站',
  announcement_banner: true,
  open_registration: true,
  redis_enabled: false,
}

export default function SettingsPage() {
  const [form, setForm] = useState<Partial<SiteSettings>>(defaults)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [dirty, setDirty] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(text)
    setMessageType(type)
  }

  useEffect(() => {
    apiRequest<SiteSettings | null>('/api/settings')
      .then((data) => data && setForm(data))
      .catch((err) => showMessage(err instanceof Error ? err.message : '加载失败', 'error'))
  }, [])

  const save = async () => {
    setMessage('')
    try {
      const data = await apiRequest<SiteSettings>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      setForm(data)
      setDirty(false)
      showMessage('保存成功', 'success')
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '保存失败', 'error')
    }
  }

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setDirty(true)
    setMessage('')
  }

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    setMessage('')
    try {
      update('logo_url', await uploadImageFile(file))
      showMessage('Logo 已上传，记得保存设置', 'info')
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '上传失败', 'error')
    } finally {
      setUploadingLogo(false)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-anime-pink to-anime-purple">
          <Settings size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">系统设置</h1>
          <p className="text-sm text-gray-500">管理社团信息、网站配置和缓存开关</p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            messageType === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : messageType === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-[#2a2a4a] bg-[#1a1a2e] text-gray-200'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="基本信息">
          <Input label="社团名称" value={form.club_name || ''} onChange={(v) => update('club_name', v)} />
          <Textarea label="社团简介" value={form.club_description || ''} onChange={(v) => update('club_description', v)} />
          <Input label="联系邮箱" value={form.contact_email || ''} onChange={(v) => update('contact_email', v)} />
          <Input label="联系电话" value={form.contact_phone || ''} onChange={(v) => update('contact_phone', v)} />
        </Section>

        <Section title="网站设置">
          <LogoUploader value={form.logo_url || ''} uploading={uploadingLogo} onUpload={uploadLogo} onChange={(v) => update('logo_url', v)} />
          <Input label="网站标题" value={form.site_title || ''} onChange={(v) => update('site_title', v)} />
          <Textarea label="网站描述" value={form.site_description || ''} onChange={(v) => update('site_description', v)} />
          <Toggle label="公告横幅" checked={Boolean(form.announcement_banner)} onChange={(v) => update('announcement_banner', v)} />
          <Toggle label="开放注册" checked={Boolean(form.open_registration)} onChange={(v) => update('open_registration', v)} />
        </Section>

        <Section title="缓存">
          <Toggle label="启用 Redis 缓存" checked={Boolean(form.redis_enabled)} onChange={(v) => update('redis_enabled', v)} />
          <p className="text-xs leading-relaxed text-gray-500">
            需先配置 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 环境变量，未配置时开关无效（自动直连数据库）。
            开启后公开接口结果缓存约 60 秒，后台写入后立即失效；修改后需点击「保存设置」生效。
          </p>
        </Section>
      </div>

      <div className="fixed bottom-4 right-4 left-4 z-40 flex flex-wrap items-center justify-end gap-3 sm:left-auto sm:bottom-8 sm:right-8">
        {dirty && message === '' && (
          <div className="max-w-[60vw] truncate rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 shadow-lg sm:max-w-xs">
            有未保存的修改，记得点击「保存设置」
          </div>
        )}
        <button
          onClick={save}
          type="button"
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 ${
            messageType === 'success' && message !== ''
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/25'
              : 'bg-gradient-to-r from-anime-pink to-anime-purple shadow-anime-pink/25'
          }`}
        >
          <Save size={18} />
          {messageType === 'success' && message !== '' ? '已保存' : '保存设置'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4 sm:p-6">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {children}
    </div>
  )
}

function LogoUploader({
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
      <span className="block text-sm text-gray-400">左上角 Logo</span>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] text-gray-500">
          {value ? <img src={value} alt="Logo" className="h-full w-full object-cover" /> : <ImagePlus size={24} />}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0f0f1a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#23233a]">
          <ImagePlus size={16} />
          {uploading ? '上传中...' : '上传图片'}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>
      <Input label="Logo URL" value={value} onChange={onChange} />
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
        className={`relative h-8 w-14 rounded-full transition-colors ${checked ? 'bg-anime-pink' : 'bg-[#2a2a4a]'}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}
