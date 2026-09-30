import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import { extractBilibiliBvid } from '@/lib/video'
import { fetchBilibiliVideoInfo } from '@/lib/bilibili'
import { cachedJSON, clearCache } from '@/lib/cache'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === '1'

  const load = async (): Promise<Response> => {
    let query = supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (!all) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      if (!all && (error.code === '42P01' || error.code === 'PGRST205')) {
        return ok([])
      }
      return fail(normalizeSupabaseError(error), 500, error)
    }

    return ok(data || [])
  }

  if (all) {
    // 管理员变体：永不过缓存
    const auth = await requireAdmin(supabase)
    if (auth.response) return auth.response
    return load()
  }

  return cachedJSON(supabase, 'cache:videos:public', load)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const title = readString(body.title)

  if (!title) {
    return fail('请输入视频标题')
  }

  const sourceType = readString(body.source_type) === 'bilibili' ? 'bilibili' : 'upload'
  let bilibiliBvid = ''
  let sourceUrl = ''
  let r2Key = ''
  let description = readString(body.description)
  let cover = readString(body.cover)

  if (sourceType === 'bilibili') {
    const input = readString(body.bilibili_url) || readString(body.bilibili_bvid)
    const bvid = extractBilibiliBvid(input)
    if (!bvid) {
      return fail('无效的哔哩哔哩视频链接')
    }
    bilibiliBvid = bvid

    // 自动补全 B 站官方封面/简介（封面为空时）
    const info = await fetchBilibiliVideoInfo(bvid)
    if (info) {
      if (!cover && info.cover) cover = info.cover
      if (!description && info.description) description = info.description
    }
  } else {
    sourceUrl = readString(body.source_url)
    r2Key = readString(body.r2_key)
    if (!sourceUrl || !r2Key) {
      return fail('请先上传视频文件')
    }
  }

  const { data, error } = await supabase
    .from('videos')
    .insert({
      title,
      description,
      cover,
      source_type: sourceType,
      source_url: sourceUrl,
      r2_key: r2Key,
      bilibili_bvid: bilibiliBvid,
      is_active: body.is_active === undefined ? true : Boolean(body.is_active),
    })
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  await clearCache('videos')
  return ok(data, { status: 201 })
}
