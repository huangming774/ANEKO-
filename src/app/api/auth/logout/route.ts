import { createClient } from '@/lib/supabase-server'
import { fail, ok } from '@/lib/api-utils'

export async function POST() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return fail(error.message, 400)
  }

  return ok({ success: true })
}
