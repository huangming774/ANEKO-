import { rm } from 'node:fs/promises'
import { join } from 'node:path'

const cacheDir = join(process.cwd(), '.next', 'cache')

try {
  await rm(cacheDir, { recursive: true, force: true })
  console.log('Removed .next/cache to reduce build output size.')
} catch (error) {
  console.warn(`Could not remove .next/cache: ${error instanceof Error ? error.message : String(error)}`)
}
