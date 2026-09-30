import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin, requireUser } from '@/lib/api-utils'
import { clearCache } from '@/lib/cache'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))

  if (body.status !== undefined) {
    const auth = await requireAdmin(supabase)
    if (auth.response) return auth.response
  } else {
    const auth = await requireUser(supabase)
    if (auth.response) return auth.response
  }

  const updates = {
    title: body.title === undefined ? undefined : readString(body.title),
    description: body.description === undefined ? undefined : readString(body.description),
    story: body.story === undefined ? undefined : readString(body.story),
    image: body.image === undefined ? undefined : readString(body.image),
    category: body.category,
    status: body.status,
  }

  const { data, error } = await supabase.from('works').update(updates).eq('id', params.id).select().single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  await clearCache('works')
  return ok(data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const adminAuth = await requireAdmin(supabase)

  if (adminAuth.response) {
    const userAuth = await requireUser(supabase)
    if (userAuth.response) return userAuth.response
  }

  const { error } = await supabase.from('works').delete().eq('id', params.id)

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  await clearCache('works')
  return ok({ success: true })
}
