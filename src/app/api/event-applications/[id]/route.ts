import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, requireAdmin } from '@/lib/api-utils'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const status = body.status

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return fail('无效的报名状态')
  }

  const { data, error } = await supabase
    .from('event_applications')
    .update({ status })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data)
}
