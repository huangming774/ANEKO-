import { createClient } from '@/lib/supabase-server'
import { fail, normalizeSupabaseError, ok, readString, requireAdmin } from '@/lib/api-utils'
import { extractBilibiliBvid } from '@/lib/video'
import { fetchBilibiliVideoInfo } from '@/lib/bilibili'
import { deleteR2Object } from '@/lib/r2'
import type { Database } from '@/database.types'

type VideoUpdate = Database['public']['Tables']['videos']['Update']

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const updates: VideoUpdate = {}

  if (body.title !== undefined) updates.title = readString(body.title)
  if (body.description !== undefined) updates.description = readString(body.description)
  if (body.cover !== undefined) updates.cover = readString(body.cover)
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)

  if (body.source_type !== undefined) {
    updates.source_type = readString(body.source_type) === 'bilibili' ? 'bilibili' : 'upload'
  }

  if (body.bilibili_url !== undefined || body.bilibili_bvid !== undefined) {
    const input = readString(body.bilibili_url) || readString(body.bilibili_bvid)
    const bvid = input ? extractBilibiliBvid(input) : null
    if (!bvid) {
      return fail('无效的哔哩哔哩视频链接')
    }
    updates.bilibili_bvid = bvid
  }

  if (body.source_url !== undefined) updates.source_url = readString(body.source_url)
  if (body.r2_key !== undefined) updates.r2_key = readString(body.r2_key)

  // 设置了 B 站来源且封面为空时，自动补全官方封面
  if (typeof updates.bilibili_bvid === 'string' && updates.bilibili_bvid && !updates.cover) {
    const info = await fetchBilibiliVideoInfo(updates.bilibili_bvid)
    if (info?.cover) {
      updates.cover = info.cover
    }
  }

  if (Object.keys(updates).length === 0) {
    return fail('没有需要更新的内容')
  }

  const { data, error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  return ok(data)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  const { data: video, error: selectError } = await supabase
    .from('videos')
    .select('r2_key')
    .eq('id', params.id)
    .single()

  if (selectError) {
    return fail(normalizeSupabaseError(selectError), 500, selectError)
  }

  const { error } = await supabase.from('videos').delete().eq('id', params.id)

  if (error) {
    return fail(normalizeSupabaseError(error), 500, error)
  }

  if (video?.r2_key) {
    try {
      await deleteR2Object(video.r2_key)
    } catch (r2Error) {
      console.error('删除 R2 视频文件失败:', r2Error)
    }
  }

  return ok({ success: true })
}
