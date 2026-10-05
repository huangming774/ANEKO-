// 本地 mock OpenAI 兼容上游，用于无真实 API key 时验证 /api/ai/chat 流式链路。
// 用法：node scripts/mock-ai-upstream.mjs
// 后台 AI 模型配置：API Base URL = http://127.0.0.1:8787/v1 ，API Key = mock ，模型 ID = mock-model
// 约定：question 含 "nostream" → 返回整包 JSON（验证非流式兜底）；含 "error" → 返回 401。
import { createServer } from 'node:http'

const PORT = 8787

const server = createServer((req, res) => {
  if (req.method !== 'POST' || !req.url?.endsWith('/chat/completions')) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'not found' } }))
    return
  }

  let raw = ''
  req.on('data', (chunk) => {
    raw += chunk
  })
  req.on('end', () => {
    let question = ''
    try {
      const body = JSON.parse(raw)
      question = body?.messages?.[0]?.content || ''
    } catch {
      // ignore
    }

    if (question.includes('error')) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'mock: unauthorized' } }))
      return
    }

    const answer = `这是 mock 回答。你问的是：${question}`

    if (question.includes('nostream')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          id: 'mock-1',
          object: 'chat.completion',
          choices: [{ index: 0, message: { role: 'assistant', content: answer } }],
        })
      )
      return
    }

    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    const chars = [...answer]
    let i = 0
    const timer = setInterval(() => {
      if (i >= chars.length) {
        res.write('data: [DONE]\n\n')
        res.end()
        clearInterval(timer)
        return
      }
      const delta = chars[i]
      i += 1
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`)
    }, 30)
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock-ai-upstream listening on http://127.0.0.1:${PORT}/v1/chat/completions`)
})
