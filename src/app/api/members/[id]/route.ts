import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
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
