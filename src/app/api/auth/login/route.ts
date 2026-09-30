import { createClient } from '@/lib/supabase-server'
import { fail, ok, readString } from '@/lib/api-utils'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const login = readString(body.email).toLowerCase()
  const email = login === 'admin'
    ? process.env.ADMIN_EMAIL || 'admin@aneko.local'
    : login
  const password = readString(body.password)

  if (!login || !password) {
    return fail('请输入账号和密码')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return fail(error.message, 401)
  }

  return ok({
    user: data.user,
    session: Boolean(data.session),
  })
}
