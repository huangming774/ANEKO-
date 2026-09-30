import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, readStringArray, requireAdmin } from '@/lib/api-utils'
import { cachedJSON, clearCache } from '@/lib/cache'

export async function GET() {
  const supabase = await createClient()

  // 注意：后台与前台共用此端点，缓存由写入即时失效 + TTL 兜底
  return cachedJSON(supabase, 'cache:events:all', async () => {
    const { data, error } = await supabase.from('events').select('*').order('start_date', { ascending: true })

    if (error) {
      return fail(normalizeSupabaseError(error), 500, error)
    }

    return ok(data || [])
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const title = readString(body.title)

  if (!title) {
    return fail('请输入活动标题')
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      title,
      description: readString(body.description),
      image: readString(body.image),
      start_date: readString(body.start_date),
      end_date: readString(body.end_date) || readString(body.start_date),
      start_time: readString(body.start_time) || '09:00',
      end_time: readString(body.end_time) || '18:00',
      location: readString(body.location),
      type: body.type || 'screening',
      status: body.status || 'upcoming',
      max_participants: Number(body.max_participants) || 0,
      organizer: readString(body.organizer),
      tags: readStringArray(body.tags),
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  await clearCache('events')
  return ok(data, { status: 201 })
}
