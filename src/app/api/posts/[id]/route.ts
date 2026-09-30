import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'

function normalizePostError(error: { message?: string; code?: string }) {
  if (error.code === 'PGRST204' || error.message?.includes("'image'")) {
    return 'posts table is missing image column. Run supabase/manual_sql/20260618_post_images.sql first.'
  }

  if (error.code === '23514' || error.message?.includes('posts_category_check')) {
    return 'posts category constraint is not compatible. Run supabase/manual_sql/20260618_post_images.sql first.'
  }

  return normalizeSupabaseError(error)
}

function legacyCategory(category: unknown) {
  const value = readString(category)
  const map: Record<string, string> = {
    公告: '鍏憡',
    活动: '娲诲姩',
    分享: '鍒嗕韩',
    通知: '閫氱煡',
  }
  return map[value] || value
}

function omitUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

function omitImage<T extends Record<string, unknown>>(payload: T) {
  const { image: _image, ...rest } = payload
  return rest
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  let post: Record<string, unknown> | null = null
  let error = null

  const result = await supabase.from('posts').select('*').eq('id', params.id).maybeSingle()
  post = result.data
  error = result.error

  if (error && (error.code === 'PGRST204' || error.message?.includes("'image'"))) {
    const legacyResult = await supabase
      .from('posts')
      .select('id,title,content,author_id,category,status,pinned,views,published_at,created_at,updated_at')
      .eq('id', params.id)
      .maybeSingle()

    post = legacyResult.data ? { ...legacyResult.data, image: '' } : null
    error = legacyResult.error
  }

  if (error) {
    return fail(normalizePostError(error), 500, error)
  }

  if (!post) {
    return fail('公告不存在', 404)
  }

  if (post.status !== 'published') {
    const auth = await requireAdmin(supabase)
    if (auth.response) return auth.response
  }

  return ok(post)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const updates = {
    title: body.title === undefined ? undefined : readString(body.title),
    content: body.content === undefined ? undefined : readString(body.content),
    image: body.image === undefined ? undefined : readString(body.image),
    category: body.category,
    status: body.status,
    pinned: body.pinned === undefined ? undefined : Boolean(body.pinned),
    published_at: body.status === 'published' ? new Date().toISOString() : undefined,
  }

  const cleanUpdates = omitUndefined(updates)
  const attempts = [
    cleanUpdates,
    cleanUpdates.category ? { ...cleanUpdates, category: legacyCategory(cleanUpdates.category) } : cleanUpdates,
    omitImage(cleanUpdates),
    cleanUpdates.category ? omitImage({ ...cleanUpdates, category: legacyCategory(cleanUpdates.category) }) : omitImage(cleanUpdates),
  ]

  let data = null
  let error = null

  for (const payload of attempts) {
    const result = await supabase.from('posts').update(payload).eq('id', params.id).select().single()
    data = result.data
    error = result.error

    if (!error) {
      break
    }

    const canRetry =
      error.code === 'PGRST204' ||
      error.code === '23514' ||
      error.message?.includes("'image'") ||
      error.message?.includes('posts_category_check')

    if (!canRetry) {
      break
    }
  }

  if (error) {
    return fail(normalizePostError(error), 500, error)
  }

  return ok(data ? { ...data, image: 'image' in data ? data.image : '' } : data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { error } = await supabase.from('posts').delete().eq('id', params.id)

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({ success: true })
}
