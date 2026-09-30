import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const projectId = process.env.SUPABASE_PROJECT_REF

if (!projectId) {
  console.error('Missing SUPABASE_PROJECT_REF in .env.local')
  process.exit(1)
}

const result = spawnSync(
  process.platform === 'win32' ? 'supabase.cmd' : 'supabase',
  ['gen', 'types', 'typescript', '--project-id', projectId, '--schema', 'public'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: true,
  }
)

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout)
  process.exit(result.status ?? 1)
}

writeFileSync('src/database.types.ts', result.stdout)
console.log('Generated src/database.types.ts')
