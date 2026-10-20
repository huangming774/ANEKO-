import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { fail } from '@/lib/api-utils'
import { enforceRateLimit } from '@/lib/rate-limit'
import { searchContent } from '@/lib/search'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (!q || q.length > 200) return fail('请输入 1–200 字的搜索内容')
  const limited = await enforceRateLimit(request, { namespace: 'search', limit: 30, windowSeconds: 60 })
  if (limited) return limited
  try {
    return NextResponse.json(await searchContent(await createClient(), q), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return fail('搜索暂时不可用，请稍后重试', 503)
  }
}
