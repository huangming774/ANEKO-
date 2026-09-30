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
