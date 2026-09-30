import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, requireAdmin } from '@/lib/api-utils'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data || [])
}
