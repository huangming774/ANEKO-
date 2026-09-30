import { createClient } from '@/lib/supabase-server'
import { fail, ok, requireUser } from '@/lib/api-utils'
import { hasR2Config, uploadImageToR2 } from '@/lib/r2'

export const runtime = 'nodejs'

const maxFileSize = 8 * 1024 * 1024
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireUser(supabase)
  if (auth.response) return auth.response

  if (!hasR2Config()) {
    return fail('Cloudflare R2 未配置，请先填写 R2 环境变量', 500)
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return fail('请选择要上传的图片')
  }

  if (!allowedTypes.has(file.type)) {
    return fail('只支持 JPG、PNG、WebP 或 GIF 图片')
  }

  if (file.size > maxFileSize) {
    return fail('图片不能超过 8MB')
  }

  try {
    const uploaded = await uploadImageToR2(file, auth.user.id)
    return ok(uploaded, { status: 201 })
  } catch (error) {
    return fail(error instanceof Error ? error.message : '图片上传失败', 500)
  }
}
