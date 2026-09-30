import { createClient } from '@/lib/supabase-server'
import { fail, ok, requireAdmin } from '@/lib/api-utils'
import { extractBilibiliBvid } from '@/lib/video'
import { fetchBilibiliVideoInfo } from '@/lib/bilibili'

export async function GET(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const input = searchParams.get('url') || searchParams.get('bvid') || ''
  const bvid = extractBilibiliBvid(input)

  if (!bvid) {
    return fail('无效的哔哩哔哩视频链接')
  }

  const info = await fetchBilibiliVideoInfo(bvid)
  if (!info) {
    return fail('无法获取该哔哩哔哩视频信息，请确认链接有效', 502)
  }

  return ok(info)
}
