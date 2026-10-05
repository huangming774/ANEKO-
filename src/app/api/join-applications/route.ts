import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, readStringArray, requireAdmin } from '@/lib/api-utils'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { data, error } = await supabase
    .from('join_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data || [])
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { namespace: 'join-app', limit: 5, windowSeconds: 300 })
  if (limited) return limited

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const name = readString(body.name)
  const studentId = readString(body.student_id)
  const phone = readString(body.phone)
  const qq = readString(body.qq)
  const grade = readString(body.grade)

  if (!name || !studentId || !phone || !qq || !grade) {
    return fail('请填写姓名、学号、年级、联系方式和 QQ')
  }

  const { error } = await supabase
    .from('join_applications')
    .insert({
      name,
      student_id: studentId,
      phone,
      qq,
      grade,
      major: readString(body.major),
      departments: readStringArray(body.departments),
      intro: readString(body.intro),
    })

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({ success: true }, { status: 201 })
}
