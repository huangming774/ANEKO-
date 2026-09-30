import { createClient } from '@/lib/supabase-server'
import { fail, ok } from '@/lib/api-utils'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return fail('未登录', 401)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle()

  return ok({
    user: data.user,
    profile,
  })
}
