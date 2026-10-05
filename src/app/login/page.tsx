'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import { sanitizeNextPath } from '@/lib/safe-path'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-anime-purple" />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // next 参数净化：仅允许站内路径，防开放重定向
  const nextPath = useMemo(() => sanitizeNextPath(searchParams?.get('next'), '/admin'), [searchParams])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')

    setLoading(true)
    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      router.replace(nextPath)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-anime-pink via-anime-purple to-anime-blue">
        <div className="absolute inset-0">
          <div className="absolute left-20 top-20 h-32 w-32 animate-float rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-20 right-20 h-40 w-40 animate-float rounded-full bg-white/10 blur-3xl" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-lg backdrop-blur-md">
              <span className="text-4xl">A</span>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white font-round">ANEKO动漫社</h1>
            <p className="text-white/80">欢迎回来，二次元伙伴</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl">
            <div className="flex">
              <div className="flex-1 border-b-2 border-white bg-white/20 py-4 text-center font-medium text-white">
                登录
              </div>
            </div>

            <form className="space-y-5 p-8" onSubmit={submit}>
              <Field
                icon={<Mail size={18} />}
                value={email}
                onChange={setEmail}
                placeholder="邮箱地址或 admin"
                required
              />

              <PasswordField
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                placeholder="密码"
              />

              {message && (
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple py-3 font-medium text-white transition-all duration-300 hover:shadow-lg hover:shadow-anime-pink/30 disabled:opacity-60"
              >
                <span>{loading ? '处理中...' : '登录'}</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-white/60 transition-colors hover:text-white">
              返回首页
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  icon: React.ReactNode
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="group relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-white/50 transition-colors group-focus-within:text-white">
        {icon}
      </div>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-12 pr-4 text-white placeholder-white/50 transition-all duration-300 focus:border-white/50 focus:bg-white/20 focus:outline-none"
      />
    </div>
  )
}

function PasswordField({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggle: () => void
  placeholder: string
}) {
  return (
    <div className="group relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-white/50 transition-colors group-focus-within:text-white">
        <Lock size={18} />
      </div>
      <input
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-12 pr-12 text-white placeholder-white/50 transition-all duration-300 focus:border-white/50 focus:bg-white/20 focus:outline-none"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/50 transition-colors hover:text-white"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
