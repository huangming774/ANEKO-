/**
 * 登录回跳路径净化：只允许站内相对路径，防止 ?next= 开放重定向。
 * 全部规则通过才接受，否则返回 fallback。
 */

function hasForbiddenChars(value: string) {
  // 拒绝空白与控制字符（含空格、tab、换行、0x00-0x1f、0x7f）
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code <= 32 || code === 127) return true
  }
  return false
}

function isSafePath(value: string) {
  if (!value || value.length > 512) return false
  // 必须以单个 / 开头（拒绝 https://、javascript:、evil.com）
  if (!value.startsWith('/')) return false
  // 拒绝协议相对 URL（//evil.com）
  if (value.startsWith('//')) return false
  // 拒绝反斜杠变体（/\evil.com 等会被浏览器归一化成协议相对 URL）
  if (value.includes('\\')) return false
  if (hasForbiddenChars(value)) return false
  return true
}

export function sanitizeNextPath(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback

  const value = raw.trim()
  if (!isSafePath(value)) return fallback

  // 解码后复查，防止 /%2f%2fevil.com 等编码变体绕过
  try {
    const decoded = decodeURIComponent(value)
    if (decoded !== value && !isSafePath(decoded)) return fallback
  } catch {
    return fallback
  }

  return value
}
