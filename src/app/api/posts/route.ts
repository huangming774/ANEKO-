import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import { cachedJSON, clearCache } from '@/lib/cache'

function normalizePostError(error: { message?: string; code?: string }) {
  if (error.code === 'PGRST204' || error.message?.includes("'image'")) {
    return 'posts 表缺少 image 字段，请先执行 supabase/manual_sql/20260618_post_images.sql'
  }

  if (error.code === '23514' || error.message?.includes('posts_category_check')) {
    return 'posts 分类约束不兼容，请先执行 supabase/manual_sql/20260618_post_images.sql'
  }

  return normalizeSupabaseError(error)
}

/**
 * 历史 GBK 乱码分类映射（勿删）。
 * '鍏憡/娲诲姩/鍒嗕韩/閫氱煡' 是早期 UTF-8 中文被按 GBK 误解码后写入 DB 的乱码值；
 * posts_category_check 约束故意同时兼容正常中文与乱码取值
 * （见 supabase/manual_sql/20260618_post_images.sql），本函数把正常中文映射成
 * 库里已有的乱码值以通过旧形态约束。若未来做数据清理/收紧约束，
 * 需同步删除本映射与下方的降级重试分支。
 */
function legacyCategory(category: unknown) {
  const value = readString(category) || '公告'
  const map: Record<string, string> = {
    公告: '鍏憡',
    活动: '娲诲姩',
    分享: '鍒嗕韩',
    通知: '閫氱煡',
  }
  return map[value] || value
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  // limit 会拼进缓存 key：只接受 1..100 的整数，其余一律归一化为 0（不截断），防止任意参数值撑爆键空间
  const limitRaw = Number(searchParams.get('limit'))
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 100 ? limitRaw : 0

  const load = async (): Promise<Response> => {
    let query = supabase
      .from('posts')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (status === 'published' || status === 'draft') {
      query = query.eq('status', status)
    }

    if (limit > 0) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes("'image'")) {
        const { data: legacyData, error: legacyError } = await supabase
          .from('posts')
          .select('id,title,content,author_id,category,status,pinned,views,published_at,created_at,updated_at')
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false })

        if (legacyError) {
          return fail(normalizePostError(legacyError), 500, legacyError)
        }

        let rows = legacyData || []
        if (status === 'published' || status === 'draft') {
          rows = rows.filter((post) => post.status === status)
        }
        if (limit > 0) {
          rows = rows.slice(0, limit)
        }

        return ok(rows.map((post) => ({ ...post, image: '' })))
      }

      return fail(normalizePostError(error), 500, error)
    }

    return ok(data || [])
  }

  // 仅缓存公开形态（status=published）；裸请求是后台管理列表，保持实时
  if (status !== 'published') {
    return load()
  }

  return cachedJSON(supabase, `cache:posts:published:${limit}`, load)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const title = readString(body.title)
  const content = readString(body.content)
  const status = body.status === 'published' ? 'published' : 'draft'

  if (!title) {
    return fail('请输入公告标题')
  }

  const baseInsert = {
    title,
    content,
    image: readString(body.image),
    author_id: auth.user.id,
    category: body.category || '公告',
    status,
    pinned: Boolean(body.pinned),
    published_at: status === 'published' ? new Date().toISOString() : null,
  }

  // 降级重试链（兼容历史库形态）：①原样 ②分类改乱码 ③去掉 image 列 ④两者都做。
  // 重试信号：PGRST204（缺 image 列）/ 23514（posts_category_check 不含正常中文）。
  const attempts = [
    baseInsert,
    { ...baseInsert, category: legacyCategory(baseInsert.category) },
    omitImage(baseInsert),
    omitImage({ ...baseInsert, category: legacyCategory(baseInsert.category) }),
  ]

  let data = null
  let error = null

  for (const payload of attempts) {
    const result = await supabase.from('posts').insert(payload).select().single()
    data = result.data
    error = result.error

    if (!error) {
      break
    }

    const canRetry =
      error.code === 'PGRST204' ||
      error.code === '23514' ||
      error.message?.includes("'image'") ||
      error.message?.includes('posts_category_check')

    if (!canRetry) {
      break
    }
  }

  if (error) {
    return fail(normalizePostError(error), 500, error)
  }

  await clearCache('posts')
  return ok(data ? { ...data, image: 'image' in data ? data.image : '' } : data, { status: 201 })
}

function omitImage<T extends { image?: string }>(payload: T) {
  const { image: _image, ...rest } = payload
  return rest
}
