import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import { cachedJSON, clearCache } from '@/lib/cache'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === '1'

  const load = async (): Promise<Response> => {
    let query = supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!all) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      if (!all && (error.code === '42P01' || error.code === 'PGRST205')) {
        return ok([])
      }
      return fail(normalizeSupabaseError(error), 500, error)
    }

    return ok(data || [])
  }

  if (all) {
    // 管理员变体：永不过缓存
    const auth = await requireAdmin(supabase)
    if (auth.response) return auth.response
    return load()
  }

  return cachedJSON(supabase, 'cache:hero:public', load)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const title = readString(body.title)

  if (!title) {
    return fail('请输入轮播图标题')
  }

  const { data, error } = await supabase
    .from('hero_slides')
    .insert({
      title,
      description: readString(body.description),
      image: readString(body.image),
      href: readString(body.href),
      sort_order: Number(body.sort_order) || 0,
      is_active: body.is_active === undefined ? true : Boolean(body.is_active),
    })
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  await clearCache('hero')
  return ok(data, { status: 201 })
}
