import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/database.types'

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init)
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

export function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

export function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

export async function requireUser(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { user: null, response: fail('请先登录', 401) }
  }

  return { user: data.user, response: null }
}

export async function requireAdmin(supabase: SupabaseClient<Database>) {
  const auth = await requireUser(supabase)

  if (!auth.user) {
    return auth
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role,status')
    .eq('id', auth.user.id)
    .single()

  if (error || !data || data.role !== 'admin' || data.status !== 'active') {
    return { user: auth.user, response: fail('需要管理员权限', 403) }
  }

  return { user: auth.user, response: null }
}

export function normalizeSupabaseError(error: { message?: string; code?: string } | null) {
  if (!error) return '未知错误'
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return '数据库表还没有创建，请先执行 supabase/migrations 里的初始化 SQL'
  }
  return error.message || 'Supabase 请求失败'
}

export async function ensureProfile(supabase: SupabaseClient<Database>, user: User, displayName?: string) {
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email || '',
    display_name: displayName || user.user_metadata?.display_name || user.email?.split('@')[0] || '新成员',
  })

  return error
}
