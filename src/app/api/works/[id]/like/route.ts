import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, requireUser } from '@/lib/api-utils'
import { clearCache } from '@/lib/cache'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireUser(supabase)
  if (auth.response) return auth.response

  const { data: existing } = await supabase
    .from('work_likes')
    .select('id')
    .eq('work_id', params.id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('work_likes').delete().eq('id', existing.id)
    if (error) return fail(normalizeSupabaseError(error), 500, error)
    await clearCache('works')
    return ok({ liked: false })
  }

  const { error } = await supabase.from('work_likes').insert({ work_id: params.id, user_id: auth.user.id })
  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  await clearCache('works')
  return ok({ liked: true })
}
