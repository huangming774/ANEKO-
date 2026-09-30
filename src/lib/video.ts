// 视频相关共享常量与工具（客户端安全，勿引入服务端依赖）

export const VIDEO_MAX_BYTES = 500 * 1024 * 1024 // 500MB

export const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
])

// 扩展名由服务端按 contentType 推导，不信任用户文件名
export const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv',
}

export const VIDEO_TYPE_LABELS: Record<string, string> = {
  'video/mp4': 'MP4',
  'video/webm': 'WebM',
  'video/quicktime': 'MOV',
  'video/x-matroska': 'MKV',
}

export function formatVideoSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

// 从完整链接或 BV 号中提取 BV id，例如 https://www.bilibili.com/video/BV1GJ411x7h7
export function extractBilibiliBvid(input: string): string | null {
  const match = input.match(/BV[0-9A-Za-z]+/)
  return match ? match[0] : null
}

export function bilibiliPlayerUrl(bvid: string) {
  return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&autoplay=0&danmaku=0`
}

export function bilibiliWatchUrl(bvid: string) {
  return `https://www.bilibili.com/video/${bvid}`
}
