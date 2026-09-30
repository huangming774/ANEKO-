import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireUser } from '@/lib/api-utils'
import { cachedJSON, clearCache } from '@/lib/cache'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const load = async (): Promise<Response> => {
    let query = supabase.from('works').select('*').order('created_at', { ascending: false })
    if (status === 'pending' || status === 'approved' || status === 'rejected') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return fail(normalizeSupabaseError(error), 500, error)
    }

    return ok(data || [])
  }

  // 仅缓存公开形态（status=approved）；裸请求是后台管理列表，保持实时
  if (status !== 'approved') {
    return load()
  }

  return cachedJSON(supabase, 'cache:works:approved', load)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireUser(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const title = readString(body.title)

  if (!title) {
    return fail('请输入作品标题')
  }

  const { data, error } = await supabase
    .from('works')
    .insert({
      title,
      description: readString(body.description),
      story: readString(body.story),
      image: readString(body.image),
      category: body.category || 'illustration',
      author_id: auth.user.id,
    })
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  await clearCache('works')
  return ok(data, { status: 201 })
}
