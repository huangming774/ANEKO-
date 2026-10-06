import { readString } from '@/lib/api-utils'
import type { Database, Json } from '@/database.types'

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
    // 兼容迁移未执行的情况：缺列时按「不支持」处理
    search_params: coerceSearchParams(row.search_params),
    reasoning_style: normalizeReasoningStyle(row.reasoning_style),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ====== 联网搜索 / 思考强度（按模型可配置的参数透传） ======

/** 思考强度参数风格：决定「低/中/高」翻译成什么上游参数 */
export const REASONING_STYLES = ['reasoning_effort', 'thinking_budget', 'thinking_claude'] as const
export type ReasoningStyle = (typeof REASONING_STYLES)[number]

export function normalizeReasoningStyle(raw: unknown): ReasoningStyle | null {
  return REASONING_STYLES.includes(raw as ReasoningStyle) ? (raw as ReasoningStyle) : null
}

/**
 * 校验「联网搜索参数」：必须是 JSON 对象（如 {"web_search": true}）。
 * 收字符串则解析（方便表单直传）；空/null → null（不支持联网）；非法 → 'invalid'
 */
export function normalizeSearchParams(raw: unknown): Record<string, Json> | null | 'invalid' {
  if (raw === null || raw === undefined) return null
  let value = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      value = JSON.parse(trimmed)
    } catch {
      return 'invalid'
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'invalid'
  return value as Record<string, Json>
}

/** DB/表单值 → 响应值：非法一律按「不支持」（null），'invalid' 绝不外泄 */
export function coerceSearchParams(raw: unknown): Record<string, Json> | null {
  const parsed = normalizeSearchParams(raw)
  return parsed === 'invalid' ? null : parsed
}

const THINKING_BUDGETS: Record<'low' | 'medium' | 'high', number> = { low: 1024, medium: 4096, high: 16384 }
const CLAUDE_BUDGETS: Record<'low' | 'medium' | 'high', number> = { low: 2048, medium: 8192, high: 24576 }

/**
 * 把前端「思考强度」档位翻译成上游请求参数（各家参数名不统一）：
 * - reasoning_effort：OpenAI o 系 / DeepSeek / 多数聚合 → { reasoning_effort: 'low'|'medium'|'high' }
 * - thinking_budget：通义 Qwen → { enable_thinking, thinking_budget }（关闭需显式传 false）
 * - thinking_claude：Claude（兼容代理）→ { thinking: { type: 'enabled', budget_tokens } }
 * 模型未配置风格 / 档位为 off（非 Qwen）时返回 {}，不污染请求体。
 */
export function buildReasoningParams(
  style: ReasoningStyle | null,
  level: 'off' | 'low' | 'medium' | 'high',
): Record<string, unknown> {
  if (!style) return {}
  if (level === 'off') {
    return style === 'thinking_budget' ? { enable_thinking: false } : {}
  }
  switch (style) {
    case 'reasoning_effort':
      return { reasoning_effort: level }
    case 'thinking_budget':
      return { enable_thinking: true, thinking_budget: THINKING_BUDGETS[level] }
    case 'thinking_claude':
      return { thinking: { type: 'enabled', budget_tokens: CLAUDE_BUDGETS[level] } }
    default:
      return {}
  }
}
