import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, readStringArray, requireAdmin } from '@/lib/api-utils'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const updates = {
    title: body.title === undefined ? undefined : readString(body.title),
    description: body.description === undefined ? undefined : readString(body.description),
    image: body.image === undefined ? undefined : readString(body.image),
    start_date: body.start_date,
    end_date: body.end_date,
    start_time: body.start_time,
    end_time: body.end_time,
    location: body.location === undefined ? undefined : readString(body.location),
    type: body.type,
    status: body.status,
    max_participants: body.max_participants === undefined ? undefined : Number(body.max_participants),
    organizer: body.organizer === undefined ? undefined : readString(body.organizer),
    tags: body.tags === undefined ? undefined : readStringArray(body.tags),
  }

  const { data, error } = await supabase.from('events').update(updates).eq('id', params.id).select().single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { error } = await supabase.from('events').delete().eq('id', params.id)

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({ success: true })
}
