import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString } from '@/lib/api-utils'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // key 含活动 id，防止单个活动被集中刷
  const limited = await enforceRateLimit(request, {
    namespace: `event-reg:${params.id}`,
    limit: 5,
    windowSeconds: 300,
  })
  if (limited) return limited

  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const name = readString(body.name)
  const phone = readString(body.phone)
  const qq = readString(body.qq)

  if (!name) {
    return fail('请填写姓名')
  }

  if (!phone && !qq) {
    return fail('请至少填写手机号码或 QQ')
  }

  const { error } = await supabase.from('event_applications').insert({
    event_id: params.id,
    name,
    phone,
    qq,
    note: readString(body.note),
  })

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok({ success: true }, { status: 201 })
}
