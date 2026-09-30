import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

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
