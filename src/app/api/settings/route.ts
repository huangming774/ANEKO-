import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import { cachedJSON, clearCache } from '@/lib/cache'

export async function GET() {
  const supabase = await createClient()

  return cachedJSON(supabase, 'cache:settings:row', async () => {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id', true).maybeSingle()

    if (error) {
      return fail(normalizeSupabaseError(error), 500, error)
    }

    return ok(data)
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const updates = {
    club_name: body.club_name === undefined ? undefined : readString(body.club_name),
    club_description: body.club_description === undefined ? undefined : readString(body.club_description),
    logo_url: body.logo_url === undefined ? undefined : readString(body.logo_url),
    contact_email: body.contact_email === undefined ? undefined : readString(body.contact_email),
    contact_phone: body.contact_phone === undefined ? undefined : readString(body.contact_phone),
    site_title: body.site_title === undefined ? undefined : readString(body.site_title),
    site_description: body.site_description === undefined ? undefined : readString(body.site_description),
    announcement_banner: body.announcement_banner,
    open_registration: body.open_registration,
    email_notification: body.email_notification,
    new_member_notification: body.new_member_notification,
    new_work_notification: body.new_work_notification,
    activity_reminder: body.activity_reminder,
    redis_enabled: body.redis_enabled === undefined ? undefined : Boolean(body.redis_enabled),
  }

  const { data, error } = await supabase.from('site_settings').update(updates).eq('id', true).select().single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  await clearCache('settings')
  return ok(data)
}
