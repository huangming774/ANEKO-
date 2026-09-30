import { createClient } from '@/lib/supabase-server'
import { fail, ok, readString, requireAdmin } from '@/lib/api-utils'
import { hasR2Config, presignVideoUpload } from '@/lib/r2'
import { ALLOWED_VIDEO_TYPES, VIDEO_EXTENSIONS, VIDEO_MAX_BYTES } from '@/lib/video'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.response) return auth.response

  if (!hasR2Config()) {
    return fail('Cloudflare R2 未配置，请先填写 R2 环境变量', 500)
  }

  const body = await request.json().catch(() => ({}))
  const contentType = readString(body.contentType)
  const size = Number(body.size)

  if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
    return fail('只支持 MP4、WebM、MOV 或 MKV 视频')
  }

  if (!Number.isFinite(size) || size <= 0) {
    return fail('无效的文件大小')
  }

  if (size > VIDEO_MAX_BYTES) {
    return fail('视频不能超过 500MB')
  }

  const extension = VIDEO_EXTENSIONS[contentType] || '.mp4'
  const key = `videos/${Date.now()}-${crypto.randomUUID()}${extension}`

  try {
    const result = await presignVideoUpload(key, contentType, size)
    return ok(result, { status: 201 })
  } catch (error) {
    return fail(error instanceof Error ? error.message : '生成上传地址失败', 500, error)
  }
}
