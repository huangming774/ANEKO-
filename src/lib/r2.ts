import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME
const publicUrl = process.env.R2_PUBLIC_URL

export function hasR2Config() {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName && publicUrl)
}

function getR2Client() {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 环境变量未配置完整')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

// 预签名专用客户端：关闭自动校验头，避免 x-amz-checksum-* 进入签名导致浏览器 PUT 403
function getPresignClient() {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 环境变量未配置完整')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  })
}

export async function presignVideoUpload(key: string, contentType: string, contentLength: number) {
  if (!bucketName || !publicUrl) {
    throw new Error('Cloudflare R2 bucket 或公开访问域名未配置')
  }

  const uploadUrl = await getSignedUrl(
    getPresignClient(),
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: 600 },
  )

  return {
    uploadUrl,
    key,
    publicUrl: `${publicUrl.replace(/\/$/, '')}/${key}`,
  }
}

export async function deleteR2Object(key: string) {
  if (!bucketName) {
    throw new Error('Cloudflare R2 bucket 未配置')
  }

  await getR2Client().send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  }))
}

/**
 * 从公开 URL 反解 R2 对象 key。
 * 仅接受 R2_PUBLIC_URL 前缀的 URL（外链如 B 站封面返回 null 自动跳过）；
 * 拒绝空 key 与路径穿越（..）。
 */
export function r2KeyFromUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url || !publicUrl) return null

  const base = publicUrl.replace(/\/$/, '')
  if (!url.startsWith(`${base}/`)) return null

  let key = url.slice(base.length + 1)
  try {
    key = decodeURIComponent(key)
  } catch {
    return null
  }

  if (!key || key.includes('..')) return null
  return key
}

/**
 * 按 URL best-effort 删除 R2 对象：key 解析失败或删除出错都只记日志，绝不抛出
 * （宁可留孤儿，不可让业务响应失败）。
 * 假设：一条记录独占一个对象（uploadImageToR2/presignVideoUpload 每次生成唯一 key）；
 * 若手工把同一图片 URL 复制进多条记录，删除任一条会破坏其余引用——不做跨表引用检查。
 */
export async function deleteR2ObjectByUrl(url: unknown) {
  const key = r2KeyFromUrl(url)
  if (!key) return

  try {
    await deleteR2Object(key)
  } catch (r2Error) {
    console.error('删除 R2 对象失败:', key, r2Error)
  }
}

export async function uploadImageToR2(file: File, userId: string) {
  if (!bucketName || !publicUrl) {
    throw new Error('Cloudflare R2 bucket 或公开访问域名未配置')
  }

  const extension = getExtension(file.name, file.type)
  const key = `works/${userId}/${Date.now()}-${crypto.randomUUID()}${extension}`
  const bytes = Buffer.from(await file.arrayBuffer())

  await getR2Client().send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: bytes,
    ContentType: file.type || 'application/octet-stream',
  }))

  return {
    key,
    url: `${publicUrl.replace(/\/$/, '')}/${key}`,
  }
}

function getExtension(fileName: string, contentType: string) {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : ''
  if (ext && /^[.][a-z0-9]+$/.test(ext)) return ext

  if (contentType === 'image/png') return '.png'
  if (contentType === 'image/webp') return '.webp'
  if (contentType === 'image/gif') return '.gif'
  return '.jpg'
}
