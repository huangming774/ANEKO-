import { createClient } from '@/lib/supabase-server'
import { ensureProfile, fail, normalizeSupabaseError, ok, readString } from '@/lib/api-utils'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: settings, error: settingsError } = await supabase
    .from('site_settings')
    .select('open_registration')
    .eq('id', true)
    .maybeSingle()

  if (settingsError) {
    return fail(normalizeSupabaseError(settingsError), 500, settingsError)
  }

  if (settings?.open_registration === false) {
    return fail('当前暂未开放注册', 403)
  }

  const body = await request.json().catch(() => ({}))
  const email = readString(body.email).toLowerCase()
  const password = readString(body.password)
  const displayName = readString(body.displayName)

  if (!email || !password) {
    return fail('请输入邮箱和密码')
  }

  if (password.length < 6) {
    return fail('密码至少需要 6 位')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split('@')[0],
      },
    },
  })

  if (error) {
    return fail(error.message, 400)
  }

  if (data.user) {
    const profileError = await ensureProfile(supabase, data.user, displayName)
    if (profileError) {
      return fail(normalizeSupabaseError(profileError), 500, profileError)
    }
  }

  return ok({
    user: data.user,
    session: Boolean(data.session),
    needsEmailConfirmation: !data.session,
  })
}
