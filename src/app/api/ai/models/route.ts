import { createClient, createAdminClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import { normalizeBaseUrl, toSafeModel } from '@/lib/ai'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === '1'

  if (all) {
    const supabase = await createClient()
    const auth = await requireAdmin(supabase)
    if (auth.response) return auth.response

    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .order('sort_order')
      .order('created_at')

    if (error) {
      return fail(normalizeSupabaseError(error), 500, error)
    }

    return ok((data || []).map(toSafeModel))
  }

  // 公开列表：service role + 显式列投影，api_key/api_base_url 不离开 PostgREST
  if (!process.env.SUPABASE_SECRET_KEY) {
    return fail('服务端 SUPABASE_SECRET_KEY 未配置', 500)
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ai_models')
    .select('id, name, description, model_id, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at')

  if (error) {
    // 表还没创建时返回空列表（与 hero-slides 等公开接口容错一致）
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return ok([])
    }
    if (error.message?.includes('Invalid API key')) {
      return fail('服务端 SUPABASE_SECRET_KEY 无效或已过期，请在 .env.local 更新为 Supabase 当前的 secret key', 500)
    }
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const name = readString(body.name)
  const apiBaseUrl = normalizeBaseUrl(body.api_base_url)
  const apiKey = readString(body.api_key)
  const modelId = readString(body.model_id)

  if (!name) return fail('请填写模型名称')
  if (!apiBaseUrl) return fail('API Base URL 格式不正确（需 https；本地调试可用 http://127.0.0.1）')
  if (!apiKey) return fail('请填写 API Key')
  if (!modelId) return fail('请填写模型 ID')

  const { data, error } = await supabase
    .from('ai_models')
    .insert({
      name,
      description: readString(body.description),
      api_base_url: apiBaseUrl,
      api_key: apiKey,
      model_id: modelId,
      sort_order: Number(body.sort_order) || 0,
      is_active: body.is_active === undefined ? true : Boolean(body.is_active),
    })
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(toSafeModel(data), { status: 201 })
}
