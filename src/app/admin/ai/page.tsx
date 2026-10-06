'use client'

import { useEffect, useState } from 'react'
import { Bot, Loader2, Pencil, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { AiModel, AiSettings } from '@/lib/app-types'

type AiModelForm = {
  name: string
  description: string
  api_base_url: string
  api_key: string
  model_id: string
  sort_order: number
  is_active: boolean
  // 联网搜索参数（JSON 文本，提交时解析；空 = 不支持）
  search_params: string
  // 思考参数风格（'' = 不支持）
  reasoning_style: string
}

const emptyForm: AiModelForm = {
  name: '',
  description: '',
  api_base_url: '',
  api_key: '',
  model_id: '',
  sort_order: 0,
  is_active: true,
  search_params: '',
  reasoning_style: '',
}

export default function AdminAiPage() {
  const [models, setModels] = useState<AiModel[]>([])
  const [form, setForm] = useState<AiModelForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingHasKey, setEditingHasKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [promptLoaded, setPromptLoaded] = useState(false)
  const [promptSaving, setPromptSaving] = useState(false)
  const [promptMessage, setPromptMessage] = useState('')

  const loadModels = async () => {
    setLoading(true)
    try {
      const data = await apiRequest<AiModel[]>('/api/ai/models?all=1')
      setModels(data)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadPrompt = async () => {
    try {
      const data = await apiRequest<AiSettings>('/api/ai/settings')
      setSystemPrompt(data.system_prompt)
    } catch (err) {
      setPromptMessage(err instanceof Error ? err.message : '提示词加载失败')
    } finally {
      setPromptLoaded(true)
    }
  }

  useEffect(() => {
    loadModels()
    loadPrompt()
  }, [])

  const savePrompt = async () => {
    setPromptMessage('')
    setPromptSaving(true)
    try {
      const data = await apiRequest<AiSettings>('/api/ai/settings', {
        method: 'PATCH',
        body: JSON.stringify({ system_prompt: systemPrompt }),
      })
      setSystemPrompt(data.system_prompt)
      setPromptMessage('提示词已保存')
    } catch (err) {
      setPromptMessage(err instanceof Error ? err.message : '保存失败')
    } finally {
      setPromptSaving(false)
    }
  }

  const update = <K extends keyof AiModelForm>(key: K, value: AiModelForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setEditingHasKey(false)
  }

  const editModel = (model: AiModel) => {
    setEditingId(model.id)
    setEditingHasKey(model.has_api_key)
    setForm({
      name: model.name,
      description: model.description,
      api_base_url: model.api_base_url,
      api_key: '',
      model_id: model.model_id,
      sort_order: model.sort_order,
      is_active: model.is_active,
      search_params: model.search_params ? JSON.stringify(model.search_params) : '',
      reasoning_style: model.reasoning_style || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveModel = async () => {
    setMessage('')
    if (!form.name.trim()) {
      setMessage('请填写模型名称')
      return
    }
    if (!form.api_base_url.trim()) {
      setMessage('请填写 API Base URL')
      return
    }
    if (!form.model_id.trim()) {
      setMessage('请填写模型 ID')
      return
    }
    if (!editingId && !form.api_key.trim()) {
      setMessage('请填写 API Key')
      return
    }

    let searchParams: Record<string, unknown> | null = null
    if (form.search_params.trim()) {
      try {
        const parsed = JSON.parse(form.search_params)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not object')
        searchParams = parsed as Record<string, unknown>
      } catch {
        setMessage('联网搜索参数必须是 JSON 对象（如 {"web_search": true}）')
        return
      }
    }

    const payload = { ...form, search_params: searchParams, reasoning_style: form.reasoning_style || null }

    setSaving(true)
    try {
      if (editingId) {
        // api_key 留空 = 不更新密钥（服务端同样兜底）
        await apiRequest<AiModel>(`/api/ai/models/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setMessage('模型已更新')
      } else {
        await apiRequest<AiModel>('/api/ai/models', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setMessage('模型已添加')
      }
      resetForm()
      await loadModels()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const deleteModel = async (model: AiModel) => {
    if (!window.confirm(`确定删除模型「${model.name}」吗？`)) return

    setMessage('')
    try {
      await apiRequest(`/api/ai/models/${model.id}`, { method: 'DELETE' })
      setMessage('模型已删除')
      if (editingId === model.id) resetForm()
      await loadModels()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '删除失败')
    }
  }

  const toggleActive = async (model: AiModel) => {
    setMessage('')
    try {
      await apiRequest<AiModel>(`/api/ai/models/${model.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !model.is_active }),
      })
      await loadModels()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新失败')
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">AI 模型</h1>
          <p className="mt-1 text-sm text-gray-500">配置兼容 OpenAI API 格式的模型，供前台「AI 问答」使用。API Key 仅保存在服务端，不会回显。</p>
        </div>
        <button type="button" onClick={resetForm} className="flex w-full shrink-0 items-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-sm text-white hover:bg-[#23233a] sm:w-auto">
          <Plus size={16} />
          新增模型
        </button>
      </div>

      {message && <div className="rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] px-4 py-3 text-gray-200">{message}</div>}

      <section className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Sparkles size={16} className="text-anime-pink" />
              全局提示词
            </h2>
            <p className="mt-1 text-sm text-gray-500">所有模型共用的预置口径（以 system 身份随每次提问发送）。写明固定问答与回答规则，模型就不会乱答。留空则不注入。</p>
          </div>
          <button
            type="button"
            onClick={savePrompt}
            disabled={promptSaving || !promptLoaded}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {promptSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            保存提示词
          </button>
        </div>
        <Textarea
          label="系统提示词"
          value={systemPrompt}
          rows={12}
          placeholder={'例如：\n你是「ANEKO 动漫社」的答疑助手，只回答与社团和本站使用相关的问题。\n【固定问答】问：介绍一下 ANEKO 动漫社\n答：ANEKO 动漫社是一个由动漫爱好者组成的校园社团……\n【规则】与社团无关的问题礼貌拒答；不确定的信息回复「请联系管理员确认」。'}
          onChange={setSystemPrompt}
        />
        {promptMessage && <p className="mt-2 text-sm text-gray-400">{promptMessage}</p>}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <section className="space-y-5 rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4 sm:p-6">
          <h2 className="text-base font-semibold text-white">{editingId ? '编辑模型' : '新增模型'}</h2>
          <Input label="模型名称" value={form.name} placeholder="如：GPT-4o / DeepSeek" onChange={(value) => update('name', value)} />
          <Textarea label="描述（可选）" value={form.description} placeholder="显示在前台下拉里的一句话介绍" onChange={(value) => update('description', value)} />
          <Input
            label="API Base URL"
            value={form.api_base_url}
            placeholder="https://api.openai.com/v1（不含 /chat/completions）"
            onChange={(value) => update('api_base_url', value)}
          />
          <Input
            label="API Key"
            type="password"
            value={form.api_key}
            placeholder={editingId ? (editingHasKey ? '已配置，留空保持不变' : '未配置，请填写') : 'sk-...'}
            onChange={(value) => update('api_key', value)}
          />
          <Input label="模型 ID" value={form.model_id} placeholder="如：gpt-4o / deepseek-chat" onChange={(value) => update('model_id', value)} />
          <label className="block">
            <span className="mb-2 block text-sm text-gray-400">思考参数风格（可选）</span>
            <select
              value={form.reasoning_style}
              onChange={(event) => update('reasoning_style', event.target.value)}
              className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white focus:border-anime-pink focus:outline-none"
            >
              <option value="">不支持思考强度</option>
              <option value="reasoning_effort">reasoning_effort — OpenAI / DeepSeek / 多数聚合</option>
              <option value="thinking_budget">enable_thinking + thinking_budget — 通义 Qwen</option>
              <option value="thinking_claude">thinking.budget_tokens — Claude 兼容代理</option>
            </select>
            <span className="mt-2 block text-xs text-gray-500">
              选中后前台出现「思考强度」选择（关闭/低/中/高），按此风格翻译成上游参数：reasoning_effort 传 low/medium/high；thinking_budget 传 1024/4096/16384；Claude 传 2048/8192/24576。
            </span>
          </label>
          <Textarea
            label="联网搜索参数（可选）"
            value={form.search_params}
            rows={3}
            placeholder={'用户在前台开启「联网」时合并进请求体；留空 = 不支持联网。例如：\n{"web_search": true}（智谱 GLM）\n{"enable_search": true}（通义）'}
            onChange={(value) => update('search_params', value)}
          />
          <Input
            label="排序（小的在前）"
            type="number"
            value={String(form.sort_order)}
            onChange={(value) => update('sort_order', Number(value) || 0)}
          />
          <Toggle label="启用（前台可见）" checked={form.is_active} onChange={(value) => update('is_active', value)} />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={saveModel}
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

        <section className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-4 sm:p-6">
          <h2 className="mb-5 text-base font-semibold text-white">模型列表</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              加载中...
            </div>
          ) : models.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2a2a4a] px-4 py-10 text-center text-gray-500">还没有配置模型</div>
          ) : (
            <div className="space-y-4">
              {models.map((model) => (
                <div key={model.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Bot size={16} className="text-anime-pink" />
                      <h3 className="truncate text-base font-semibold text-white">{model.name}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs ${model.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/15 text-gray-400'}`}>
                        {model.is_active ? '已启用' : '已停用'}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs ${model.has_api_key ? 'bg-anime-blue/15 text-anime-blue' : 'bg-amber-500/15 text-amber-300'}`}>
                        {model.has_api_key ? '密钥已配置' : '密钥未配置'}
                      </span>
                      {model.search_params && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">联网</span>
                      )}
                      {model.reasoning_style && (
                        <span className="rounded-full bg-anime-purple/15 px-2 py-1 text-xs text-anime-purple">思考强度</span>
                      )}
                      <span className="rounded-full bg-[#23233a] px-2 py-1 text-xs text-gray-400">排序 {model.sort_order}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 break-words text-sm text-gray-400">
                      <span className="text-gray-300">{model.model_id}</span>
                      {model.description ? ` · ${model.description}` : ''}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500">{model.api_base_url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => editModel(model)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-[#23233a] p-2.5 text-gray-300 hover:text-white" title="编辑">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => toggleActive(model)} className="min-h-11 rounded-lg bg-[#23233a] px-3 py-2 text-xs text-gray-300 hover:text-white">
                      {model.is_active ? '停用' : '启用'}
                    </button>
                    <button type="button" onClick={() => deleteModel(model)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-red-500/10 p-2.5 text-red-300 hover:text-red-200" title="删除">
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
        autoComplete={type === 'password' ? 'new-password' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-anime-pink focus:outline-none"
      />
    </label>
  )
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-gray-400">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-[#2a2a4a] bg-[#0f0f1a] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-anime-pink focus:outline-none"
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
