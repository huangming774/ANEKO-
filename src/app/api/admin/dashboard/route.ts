import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, requireAdmin } from '@/lib/api-utils'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const [
    members,
    activeMembers,
    pendingWorks,
    ongoingEvents,
    posts,
    applications,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('works').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'ongoing'),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('join_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const error = [members, activeMembers, pendingWorks, ongoingEvents, posts, applications].find((item) => item.error)?.error
  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({
    members: members.count || 0,
    activeMembers: activeMembers.count || 0,
    pendingWorks: pendingWorks.count || 0,
    ongoingEvents: ongoingEvents.count || 0,
    posts: posts.count || 0,
    pendingApplications: applications.count || 0,
  })
}
