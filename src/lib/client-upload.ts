// 客户端图片上传：先在浏览器侧校验/转码/压缩，再送 /api/upload。
// 服务端只收 JPG/PNG/WebP/GIF 且 ≤8MB；这里把浏览器能解码的其它格式
// （BMP/AVIF/ICO/SVG 等）统一转成 PNG/JPEG，超大图缩小重编码，
// 并保留真实报错（HTTP 状态、服务器原文），避免一律显示「上传失败」。

const MAX_BYTES = 8 * 1024 * 1024
const MAX_EDGE = 2048
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

type Decoded = ImageBitmap | HTMLImageElement

function decodeImage(file: File): Promise<Decoded> {
  return createImageBitmap(file).catch(
    () =>
      // createImageBitmap 对个别格式支持不全时退回 <img> 解码
      new Promise<Decoded>((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
          URL.revokeObjectURL(url)
          resolve(img)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('decode failed'))
        }
        img.src = url
      }),
  )
}

function reencode(source: Decoded, name: string, type: 'image/png' | 'image/jpeg'): Promise<File> {
  const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('canvas unavailable'))
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('reencode failed'))
      const ext = type === 'image/png' ? '.png' : '.jpg'
      const base = name.replace(/\.\w+$/, '') || 'image'
      resolve(new File([blob], base + ext, { type }))
    }, type, 0.9)
  })
}

/** 把任意浏览器可解码的图片整理成服务端接受的 JPG/PNG/WebP/GIF */
export async function prepareImageFile(file: File): Promise<File> {
  if (file.size === 0) {
    throw new Error('图片文件为空，请重新选择')
  }

  // 已合规且不超限：原样上传，避免二次压缩损伤画质
  if (ACCEPTED.has(file.type) && file.size <= MAX_BYTES) {
    return file
  }

  // GIF 转码会丢动画，超限时只能明示用户自行压缩
  if (file.type === 'image/gif') {
    throw new Error('GIF 动图超过 8MB，请压缩后再上传（转码会丢失动画）')
  }

  let source: Decoded
  try {
    source = await decodeImage(file)
  } catch {
    throw new Error(`无法解码该图片（${file.type || '未知格式'}），请另存为 JPG 或 PNG 后再上传`)
  }

  // 优先 PNG 保留透明通道，放不下再退回 JPEG
  let last: File | null = null
  for (const type of ['image/png', 'image/jpeg'] as const) {
    last = await reencode(source, file.name, type)
    if (last.size <= MAX_BYTES) return last
  }
  throw new Error(`图片压缩后仍超过 8MB，请缩小尺寸后再上传`)
}

/** 上传图片，成功返回可访问的 URL；失败抛出带真实原因的 Error */
export async function uploadImageFile(file: File): Promise<string> {
  const prepared = await prepareImageFile(file)

  const formData = new FormData()
  formData.append('file', prepared)

  const response = await fetch('/api/upload', { method: 'POST', body: formData })
  const text = await response.text()

  let payload: { data?: { url?: string }; error?: string } = {}
  try {
    payload = JSON.parse(text)
  } catch {
    // 网关/托管平台拦截时返回的是 HTML，保留线索而不是「上传失败」
    const snippet = text.replace(/\s+/g, ' ').slice(0, 80)
    throw new Error(`上传失败（HTTP ${response.status}）${snippet ? '：' + snippet : '：服务器无响应内容'}`)
  }

  if (!response.ok) {
    throw new Error(payload.error || `上传失败（HTTP ${response.status}）`)
  }

  const url = payload.data?.url
  if (!url) {
    throw new Error('上传成功但未返回图片地址，请重试')
  }
  return url
}
