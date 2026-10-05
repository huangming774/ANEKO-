import { readString } from '@/lib/api-utils'
import type { Database } from '@/database.types'

type AiModelRow = Database['public']['Tables']['ai_models']['Row']

/**
 * 校验并归一化上游 API Base URL。
 * 仅允许 https；本地调试允许 http://localhost 与 http://127.0.0.1（mock 上游用）。
 * 去掉尾部斜杠，请求时由调用方拼 /chat/completions。
 */
export function normalizeBaseUrl(raw: unknown): string | null {
  const value = readString(raw).replace(/\/+$/, '')
  if (!value) return null

  try {
    const url = new URL(value)
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) return null
    return value
  } catch {
    return null
  }
}

/** 显式构造响应对象：api_key 明文绝不离开服务端，只暴露是否已配置 */
export function toSafeModel(row: AiModelRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    api_base_url: row.api_base_url,
    model_id: row.model_id,
    sort_order: row.sort_order,
    is_active: row.is_active,
    has_api_key: Boolean(row.api_key),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
