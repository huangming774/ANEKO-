import { createAdminClient } from '@/lib/supabase-server'
import { fail, readString } from '@/lib/api-utils'
import { enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
// 流式长回答需要更长的执行窗口（Vercel serverless 默认会截断）
export const maxDuration = 120

const HEAD_TIMEOUT_MS = 30_000
const TOTAL_TIMEOUT_MS = 120_000
const MAX_QUESTION_LENGTH = 2000

// 纯文本流（服务端已把上游 OpenAI SSE 归一化为 delta 纯文本）
const streamHeaders = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no', // 防 nginx 等代理缓冲整包
}

/**
 * 把上游 OpenAI 兼容 SSE（data: {choices[0].delta.content} / data: [DONE]）
 * 增量解析为纯文本。必须容忍 chunk 跨 read 边界（行缓冲）。
 */
function sseToTextTransform(onDone?: () => void) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const consumeLine = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return

    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return

    try {
      const json = JSON.parse(payload)
      const delta = json?.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta) {
        controller.enqueue(encoder.encode(delta))
      }
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

  if (!modelId) return fail('缺少模型参数')
  if (!question) return fail('请输入问题')
  if (question.length > MAX_QUESTION_LENGTH) return fail('问题过长（最多 2000 字符）')

  if (!process.env.SUPABASE_SECRET_KEY) {
    return fail('服务端 SUPABASE_SECRET_KEY 未配置', 500)
  }

  // service role 读配置（ai_models 对匿名完全不可读）；不区分「不存在/已禁用」防探测
  const admin = createAdminClient()
  const { data: model, error: modelError } = await admin
    .from('ai_models')
    .select('api_base_url, api_key, model_id')
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

  // 两阶段超时：AbortSignal.timeout 会连流一起掐断，所以用 AbortController 手动控制
  const controller = new AbortController()
  let headReceived = false
  const cleanup = () => {
    clearTimeout(headTimer)
    clearTimeout(totalTimer)
  }
  const headTimer = setTimeout(() => {
    if (!headReceived) controller.abort(new Error('head-timeout'))
  }, HEAD_TIMEOUT_MS)
  const totalTimer = setTimeout(() => {
    controller.abort(new Error('total-timeout'))
  }, TOTAL_TIMEOUT_MS)

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

    // 流式：归一化为纯文本转发
    if (contentType.includes('text/event-stream') && upstream.body) {
      return new Response(upstream.body.pipeThrough(sseToTextTransform(cleanup)), { headers: streamHeaders })
    }

    // 非流式 JSON 兜底：整包提取后作为单 chunk 输出，客户端路径完全一致
    const json = await upstream.json().catch(() => null)
    cleanup()
    const content = json?.choices?.[0]?.message?.content
    const text = typeof content === 'string' ? content : ''
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        streamController.enqueue(encoder.encode(text))
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
