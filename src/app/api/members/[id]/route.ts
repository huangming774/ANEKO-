import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'

const ROLES = ['admin', 'member']
const STATUSES = ['active', 'inactive']

async function loadTarget(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data, error } = await supabase.from('profiles').select('id, role, status').eq('id', id).maybeSingle()
  if (error) return { target: null, response: fail(normalizeSupabaseError(error), 500, error) }
  if (!data) return { target: null, response: fail('成员不存在', 404) }
  return { target: data, response: null }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))

  if (body.role !== undefined && !ROLES.includes(body.role)) {
    return fail('角色值不合法', 400)
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return fail('状态值不合法', 400)
  }

  const { target, response } = await loadTarget(supabase, params.id)
  if (response) return response

  const roleChanged = body.role !== undefined && body.role !== target.role
  const statusChanged = body.status !== undefined && body.status !== target.status

  // 防呆：不能改自己的角色/状态，避免把自己降级或禁用后锁在后台外
  if ((roleChanged || statusChanged) && target.id === auth.user.id) {
    return fail('不能修改自己的角色或状态，避免把账号锁在后台之外', 400)
  }

  const nextRole = body.role ?? target.role
  const nextStatus = body.status ?? target.status

  // 防呆：管理员不能直接禁用，必须先降级为成员
  if (nextRole === 'admin' && nextStatus === 'inactive') {
    return fail('不能禁用管理员账号，请先将其降级为成员', 400)
  }

  const updates = {
    display_name: body.display_name === undefined ? undefined : readString(body.display_name),
    avatar: body.avatar === undefined ? undefined : readString(body.avatar),
    role: body.role,
    status: body.status,
  }

  const { data, error } = await supabase.from('profiles').update(updates).eq('id', params.id).select().single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { target, response } = await loadTarget(supabase, params.id)
  if (response) return response

  if (target.id === auth.user.id) {
    return fail('不能禁用自己的账号', 400)
  }
  if (target.role === 'admin') {
    return fail('不能禁用管理员账号，请先将其降级为成员', 400)
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ status: 'inactive' })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data)
}
