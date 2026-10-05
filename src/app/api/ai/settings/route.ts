import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, requireAdmin } from '@/lib/api-utils'

// 全局系统提示词（单行表 ai_settings，id 恒为 true）：所有模型共用同一套口径
export async function GET() {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { data, error } = await supabase.from('ai_settings').select('system_prompt').eq('id', true).maybeSingle()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({ system_prompt: data?.system_prompt ?? '' })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  if (typeof body.system_prompt !== 'string') {
    return fail('缺少 system_prompt 字段')
  }

  // 允许清空（前台此时不注入 system 消息）；长度上限防滥用
  const systemPrompt = body.system_prompt.trim()
  if (systemPrompt.length > 8000) {
    return fail('提示词过长（最多 8000 字符）')
  }

  const { data, error } = await supabase
    .from('ai_settings')
    .upsert({ id: true, system_prompt: systemPrompt }, { onConflict: 'id' })
    .select('system_prompt')
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({ system_prompt: data.system_prompt })
}
