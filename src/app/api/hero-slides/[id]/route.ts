import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import { clearCache } from '@/lib/cache'
import { deleteR2ObjectByUrl } from '@/lib/r2'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const updates = {
    title: body.title === undefined ? undefined : readString(body.title),
    description: body.description === undefined ? undefined : readString(body.description),
    image: body.image === undefined ? undefined : readString(body.image),
    href: body.href === undefined ? undefined : readString(body.href),
    sort_order: body.sort_order === undefined ? undefined : Number(body.sort_order) || 0,
    is_active: body.is_active === undefined ? undefined : Boolean(body.is_active),
  }

  // 先取旧图，改图后清理 R2 孤儿对象
  const { data: oldSlide } = await supabase.from('hero_slides').select('image').eq('id', params.id).maybeSingle()

  const { data, error } = await supabase
    .from('hero_slides')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  if (updates.image !== undefined && oldSlide?.image && updates.image !== oldSlide.image) {
    await deleteR2ObjectByUrl(oldSlide.image)
  }

  await clearCache('hero')
  return ok(data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  // 先取旧图，删除记录后清理 R2 孤儿对象
  const { data: oldSlide } = await supabase.from('hero_slides').select('image').eq('id', params.id).maybeSingle()

  const { error } = await supabase.from('hero_slides').delete().eq('id', params.id)

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  await deleteR2ObjectByUrl(oldSlide?.image)

  await clearCache('hero')
  return ok({ success: true })
}
