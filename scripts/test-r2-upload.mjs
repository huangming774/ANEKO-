import { Buffer } from 'node:buffer'
import nextEnv from '@next/env'
import { ListBucketsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET_NAME
const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')

for (const [key, value] of Object.entries({
  R2_ACCOUNT_ID: accountId,
  R2_ACCESS_KEY_ID: accessKeyId,
  R2_SECRET_ACCESS_KEY: secretAccessKey,
  R2_BUCKET_NAME: bucket,
  R2_PUBLIC_URL: publicUrl,
})) {
  console.log(`${key}: ${value ? 'present' : 'missing'}`)
}

if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
  process.exit(1)
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

const key = `codex-r2-test/${Date.now()}-pixel.png`
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
)

try {
  try {
    const buckets = await client.send(new ListBucketsCommand({}))
    console.log(`LIST_BUCKETS: OK buckets=${(buckets.Buckets || []).map((item) => item.Name).join(',')}`)
  } catch (error) {
    console.log(`LIST_BUCKETS: FAIL ${error?.name || 'Error'} ${error?.message || String(error)}`)
    if (error?.$metadata) console.log(`LIST_BUCKETS_HTTP_STATUS: ${error.$metadata.httpStatusCode}`)
  }

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: png,
    ContentType: 'image/png',
  }))

  const url = `${publicUrl}/${key}`
  console.log(`UPLOAD: OK key=${key}`)
  console.log(`PUBLIC_URL: ${url}`)

  const response = await fetch(url)
  console.log(`PUBLIC_FETCH: HTTP ${response.status} content-type=${response.headers.get('content-type') || ''}`)

  if (!response.ok) {
    process.exit(2)
  }
} catch (error) {
  console.log(`UPLOAD: FAIL ${error?.name || 'Error'} ${error?.message || String(error)}`)
  if (error?.Code) console.log(`ERROR_CODE: ${error.Code}`)
  if (error?.$metadata) console.log(`HTTP_STATUS: ${error.$metadata.httpStatusCode}`)
  process.exit(1)
}
