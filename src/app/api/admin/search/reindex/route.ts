import { createClient } from '@/lib/supabase-server'
import { fail, ok, requireAdmin } from '@/lib/api-utils'
import { hasVectorConfig, indexDocuments, publicDocuments, searchTypes, type SearchType } from '@/lib/search'

export const runtime = 'nodejs'

// One bounded page per request so initial imports work on serverless deployments too.
export async function POST(request: Request) {
  const db = await createClient()
  const auth = await requireAdmin(db)
  if (auth.response) return auth.response
  if (!hasVectorConfig()) return fail('请先配置 Upstash Vector 环境变量', 503)
  const body = await request.json().catch(() => ({}))
  const type = body.type as SearchType
  const offset = body.offset ?? 0
  if (!searchTypes.includes(type) || !Number.isSafeInteger(offset) || offset < 0) return fail('无效的索引分页参数')
  try {
    const documents = await publicDocuments(db, type, { offset, limit: 50 })
    await indexDocuments(documents)
    return ok({ count: documents.length, nextOffset: documents.length === 50 ? offset + 50 : null })
  } catch {
    return fail('索引同步失败，请检查 Vector 凭据、内置 Embedding 模型及数据库连接后重试', 502)
  }
}
