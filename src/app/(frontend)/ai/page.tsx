'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Eraser, Send, Square } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { AiChatMessage, AiModelPublic } from '@/lib/app-types'

const MAX_QUESTION_LENGTH = 2000

export default function AiChatPage() {
  const [models, setModels] = useState<AiModelPublic[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [question, setQuestion] = useState('')
  const [chatLog, setChatLog] = useState<AiChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    apiRequest<AiModelPublic[]>('/api/ai/models')
      .then((data) => {
        const list = data || []
        setModels(list)
        if (list.length > 0) {
          setSelectedModelId(list[0].id)
        }
      })
      .catch(() => setModels([]))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog])

  const updateLastAnswer = (append: string) => {
    setChatLog((log) => {
      const next = [...log]
      const last = next[next.length - 1]
      next[next.length - 1] = { ...last, answer: last.answer + append }
      return next
    })
  }

  const markLastError = (message: string) => {
    setChatLog((log) => {
      const next = [...log]
      const last = next[next.length - 1]
      next[next.length - 1] = { ...last, error: message }
      return next
    })
  }

  const send = async () => {
    const text = question.trim()
    if (!text || streaming || !selectedModelId) return

    const model = models.find((item) => item.id === selectedModelId)
    setChatLog((log) => [...log, { question: text, answer: '', modelName: model?.name || '' }])
    setQuestion('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // 流式响应：必须裸 fetch（apiRequest 会 .json() 把流读死）
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: selectedModelId, question: text }),
        signal: controller.signal,
      })

      const contentType = response.headers.get('content-type') || ''

      if (!response.ok || contentType.includes('application/json')) {
        const payload = await response.json().catch(() => ({}))
        markLastError((payload as { error?: string })?.error || '请求失败')
        return
      }

      if (!response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (chunk) updateLastAnswer(chunk)
      }
    } catch (err) {
      if (controller.signal.aborted) {
        // 用户主动停止：保留已生成部分
        return
      }
      markLastError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const stopGeneration = () => {
    abortRef.current?.abort()
  }

  const clearLog = () => {
    setChatLog([])
  }

  return (
    <div className="min-h-screen dot-bg">
      <div className="relative overflow-hidden bg-gradient-to-r from-anime-purple to-anime-blue py-20">
        <div className="relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold font-round mb-4">AI 问答</h1>
          <p className="text-xl md:text-2xl opacity-90">向社团的 AI 助手提问，即刻获得回答</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {!loaded ? (
          <div className="rounded-3xl bg-white p-12 text-center text-gray-500 shadow-lg">加载中...</div>
        ) : models.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-lg">
            <div className="mb-4 text-6xl">🤖</div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800">AI 问答暂未开放</h2>
            <p className="text-gray-500">管理员尚未配置可用模型，稍后再来看看吧～</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-anime-pink" />
                <select
                  value={selectedModelId}
                  onChange={(event) => setSelectedModelId(event.target.value)}
                  disabled={streaming}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-anime-pink focus:outline-none"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={clearLog}
                disabled={streaming || chatLog.length === 0}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
              >
                <Eraser size={16} />
                清空记录
              </button>
            </div>

            <div className="max-h-[520px] min-h-[280px] space-y-4 overflow-y-auto px-6 py-6">
              {chatLog.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <div className="mb-3 text-5xl">💬</div>
                  <p>有什么想问的？试试下面这些问题，或直接输入你的问题</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {['介绍一下 ANEKO 动漫社', '推荐几部入门动漫', '怎么加入社团？'].map((tip) => (
                      <button
                        key={tip}
                        type="button"
                        onClick={() => setQuestion(tip)}
                        className="rounded-full bg-anime-pink/10 px-4 py-2 text-sm text-anime-pink transition-colors hover:bg-anime-pink/20"
                      >
                        {tip}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatLog.map((item, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-gradient-to-r from-anime-pink to-anime-purple px-4 py-3 text-white">
                        {item.question}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-gray-800">
                        {item.error ? (
                          <span className="text-red-500">{item.error}</span>
                        ) : (
                          <span className="whitespace-pre-wrap">
                            {item.answer || (streaming && index === chatLog.length - 1 ? '思考中…' : '')}
                          </span>
                        )}
                        <div className="mt-1 text-right text-[10px] text-gray-400">{item.modelName}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-end gap-3">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault()
                      send()
                    }
                  }}
                  maxLength={MAX_QUESTION_LENGTH}
                  rows={2}
                  placeholder="输入你的问题（Enter 发送，Shift+Enter 换行）"
                  className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-gray-800 focus:border-anime-pink focus:outline-none"
                />
                {streaming ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="flex h-[52px] items-center gap-2 rounded-2xl bg-gray-700 px-5 font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    <Square size={18} />
                    停止
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={send}
                    disabled={!question.trim() || !selectedModelId}
                    className="flex h-[52px] items-center gap-2 rounded-2xl bg-gradient-to-r from-anime-pink to-anime-purple px-5 font-medium text-white shadow-lg transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                  >
                    <Send size={18} />
                    发送
                  </button>
                )}
              </div>
              <div className="mt-2 text-right text-xs text-gray-400">
                {question.length} / {MAX_QUESTION_LENGTH}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
