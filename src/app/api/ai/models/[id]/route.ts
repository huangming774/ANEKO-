import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import { normalizeBaseUrl, normalizeReasoningStyle, normalizeSearchParams, toSafeModel } from '@/lib/ai'
import type { Database } from '@/database.types'

type AiModelUpdate = Database['public']['Tables']['ai_models']['Update']

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const updates: AiModelUpdate = {}

  if (body.name !== undefined) updates.name = readString(body.name)
  if (body.description !== undefined) updates.description = readString(body.description)
  if (body.model_id !== undefined) updates.model_id = readString(body.model_id)
  if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order) || 0
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)

  if (body.search_params !== undefined) {
    const searchParams = normalizeSearchParams(body.search_params)
    if (searchParams === 'invalid') return fail('联网搜索参数必须是 JSON 对象（如 {"web_search": true}）')
    updates.search_params = searchParams
  }
  if (body.reasoning_style !== undefined) {
    const reasoningStyle = normalizeReasoningStyle(body.reasoning_style)
    if (body.reasoning_style && !reasoningStyle) return fail('思考参数风格不合法')
    updates.reasoning_style = reasoningStyle
  }

  if (body.api_base_url !== undefined) {
    const apiBaseUrl = normalizeBaseUrl(body.api_base_url)
    if (!apiBaseUrl) return fail('API Base URL 格式不正确（需 https；本地调试可用 http://127.0.0.1）')
    updates.api_base_url = apiBaseUrl
  }

  // 密钥轮换：仅非空字符串才更新，留空/空白 = 保持不变（响应也永不含明文）
  if (typeof body.api_key === 'string' && body.api_key.trim()) {
    updates.api_key = body.api_key.trim()
  }

  if (Object.keys(updates).length === 0) {
    return fail('没有需要更新的内容')
  }

  const { data, error } = await supabase
    .from('ai_models')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(toSafeModel(data))
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { error } = await supabase.from('ai_models').delete().eq('id', params.id)

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({ success: true })
}
