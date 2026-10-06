import { createAdminClient } from '@/lib/supabase-server'
import { fail, readString } from '@/lib/api-utils'
import { buildReasoningParams, normalizeReasoningStyle, normalizeSearchParams } from '@/lib/ai'
import { enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
// 流式长回答 + 思考型模型需要更长的执行窗口（Vercel serverless 默认会截断）
export const maxDuration = 300

const HEAD_TIMEOUT_MS = 30_000
const TOTAL_TIMEOUT_MS = 120_000
// 思考型模型首 token 前有较长推理期，单独放宽窗口
const THINKING_HEAD_TIMEOUT_MS = 60_000
const THINKING_TOTAL_TIMEOUT_MS = 300_000
const MAX_QUESTION_LENGTH = 2000

const THINKING_LEVELS = ['off', 'low', 'medium', 'high'] as const
type ThinkingLevel = (typeof THINKING_LEVELS)[number]

// NDJSON 事件流：每行一个 JSON，{ type: 'thinking' | 'text', delta }
// 思考过程与正式回答分流，客户端可折叠展示；错误响应仍是 application/json
const streamHeaders = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no', // 防 nginx 等代理缓冲整包
}

/**
 * 把上游 OpenAI 兼容 SSE 增量归一化为 NDJSON 事件行：
 * - delta.content → { type: 'text', delta }
 * - delta.reasoning_content / delta.reasoning（DeepSeek/Kimi/GLM/通义等思考流）→ { type: 'thinking', delta }
 * 必须容忍 chunk 跨 read 边界（行缓冲）。
 */
function sseToNdjsonTransform(onDone?: () => void) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const emit = (controller: TransformStreamDefaultController<Uint8Array>, type: string, delta: unknown) => {
    if (typeof delta === 'string' && delta) {
      controller.enqueue(encoder.encode(JSON.stringify({ type, delta }) + '\n'))
    }
  }

  const consumeLine = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return

    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return

    try {
      const json = JSON.parse(payload)
      const delta = json?.choices?.[0]?.delta
      const thinking = typeof delta?.reasoning_content === 'string' ? delta.reasoning_content : delta?.reasoning
      emit(controller, 'thinking', thinking)
      emit(controller, 'text', delta?.content)
    } catch {
      // 忽略无法解析的事件行（如 provider 自定义事件）
    }
  }

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        consumeLine(line, controller)
      }
    },
    flush(controller) {
      buffer += decoder.decode()
      if (buffer) {
        consumeLine(buffer, controller)
      }
      onDone?.()
    },
  })
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { namespace: 'ai-chat', limit: 10, windowSeconds: 300 })
  if (limited) return limited

  const body = await request.json().catch(() => ({}))
  const modelId = readString(body.model_id)
  const question = readString(body.question)
  const searchEnabled = body.search === true
  const thinkingLevelRaw = readString(body.thinking_level) || 'off'

  if (!modelId) return fail('缺少模型参数')
  if (!question) return fail('请输入问题')
  if (question.length > MAX_QUESTION_LENGTH) return fail('问题过长（最多 2000 字符）')
  if (!THINKING_LEVELS.includes(thinkingLevelRaw as ThinkingLevel)) return fail('思考强度参数不合法')
  const thinkingLevel = thinkingLevelRaw as ThinkingLevel

  if (!process.env.SUPABASE_SECRET_KEY) {
    return fail('服务端 SUPABASE_SECRET_KEY 未配置', 500)
  }

  // service role 读配置（ai_models 对匿名完全不可读）；select('*') 仅在服务端使用，明文不出进程
  const admin = createAdminClient()
  const { data: model, error: modelError } = await admin
    .from('ai_models')
    .select('*')
    .eq('id', modelId)
    .eq('is_active', true)
    .maybeSingle()

  if (modelError) {
    if (modelError.message?.includes('Invalid API key')) {
      return fail('服务端 SUPABASE_SECRET_KEY 无效或已过期，请联系管理员更新配置', 500)
    }
    // 表未创建/模型不存在/已禁用统一口径，防探测
    return fail('AI 问答暂未开放', 503)
  }
  if (!model) {
    return fail('AI 问答暂未开放', 503)
  }

  // 全局预置提示词（所有模型共用口径）；表未创建/为空则不注入，行为与之前一致
  const { data: settings } = await admin
    .from('ai_settings')
    .select('system_prompt')
    .eq('id', true)
    .maybeSingle()

  const systemPrompt = settings?.system_prompt?.trim()
  const messages = systemPrompt
    ? [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ]
    : [{ role: 'user', content: question }]

  const endpoint = `${model.api_base_url.replace(/\/+$/, '')}/chat/completions`

  // 能力参数透传：联网 = 合并模型的 search_params；思考 = 按 reasoning_style 映射档位
  // 固定字段放后面，防止配置里的同名键覆盖 model/messages/stream
  const reasoningStyle = normalizeReasoningStyle((model as { reasoning_style?: unknown }).reasoning_style)
  const searchParams = searchEnabled ? normalizeSearchParams((model as { search_params?: unknown }).search_params) : null
  const thinkingActive = reasoningStyle !== null && thinkingLevel !== 'off'
  const extraBody = {
    ...buildReasoningParams(reasoningStyle, thinkingLevel),
    ...(searchParams && searchParams !== 'invalid' ? searchParams : {}),
  }

  // 思考型模型首 token 前推理期长，放宽两阶段超时
  const headTimeoutMs = thinkingActive ? THINKING_HEAD_TIMEOUT_MS : HEAD_TIMEOUT_MS
  const totalTimeoutMs = thinkingActive ? THINKING_TOTAL_TIMEOUT_MS : TOTAL_TIMEOUT_MS

  // 两阶段超时：AbortSignal.timeout 会连流一起掐断，所以用 AbortController 手动控制
  const controller = new AbortController()
  let headReceived = false
  const cleanup = () => {
    clearTimeout(headTimer)
    clearTimeout(totalTimer)
  }
  const headTimer = setTimeout(() => {
    if (!headReceived) controller.abort(new Error('head-timeout'))
  }, headTimeoutMs)
  const totalTimer = setTimeout(() => {
    controller.abort(new Error('total-timeout'))
  }, totalTimeoutMs)

  // 客户端断开（用户停止生成/关页面）时取消上游读取，不白烧 token
  request.signal.addEventListener('abort', () => {
    cleanup()
    controller.abort(new Error('client-abort'))
  })

  try {
    let upstream: Response
    try {
      upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${model.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...extraBody,
          model: model.model_id,
          messages,
          stream: true,
        }),
        signal: controller.signal,
      })
    } catch (fetchError) {
      cleanup()
      const message = fetchError instanceof Error ? fetchError.message : ''
      if (message.includes('head-timeout') || message.includes('total-timeout')) {
        return fail('AI 服务响应超时', 504)
      }
      // client-abort：响应已无人接收，返回什么都不会被送达
      return fail('AI 服务连接失败', 502)
    }

    headReceived = true
    clearTimeout(headTimer)

    if (!upstream.ok) {
      cleanup()
      // 错误文本截断，且不含请求头/密钥
      const errorText = await upstream.text().catch(() => '')
      return fail('AI 服务响应异常', 502, errorText.slice(0, 200))
    }

    const contentType = upstream.headers.get('content-type') || ''

    // 流式：归一化为 NDJSON 事件转发
    if (contentType.includes('text/event-stream') && upstream.body) {
      return new Response(upstream.body.pipeThrough(sseToNdjsonTransform(cleanup)), { headers: streamHeaders })
    }

    // 非流式 JSON 兜底：整包拆成 thinking/text 事件输出，客户端路径完全一致
    const json = await upstream.json().catch(() => null)
    cleanup()
    const message = json?.choices?.[0]?.message
    const thinking = typeof message?.reasoning_content === 'string' ? message.reasoning_content : message?.reasoning
    const content = message?.content
    const encoder = new TextEncoder()
    const events: string[] = []
    if (typeof thinking === 'string' && thinking) {
      events.push(JSON.stringify({ type: 'thinking', delta: thinking }) + '\n')
    }
    if (typeof content === 'string' && content) {
      events.push(JSON.stringify({ type: 'text', delta: content }) + '\n')
    }
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        for (const event of events) {
          streamController.enqueue(encoder.encode(event))
        }
        streamController.close()
      },
    })
    return new Response(stream, { headers: streamHeaders })
  } catch (unexpected) {
    cleanup()
    console.error('AI 代理异常:', unexpected instanceof Error ? unexpected.message : unexpected)
    return fail('AI 服务异常', 500)
  }
}
