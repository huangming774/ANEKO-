import 'server-only'
import { Index } from '@upstash/vector'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'

export const searchTypes = ['post', 'event', 'work', 'video'] as const
export type SearchType = typeof searchTypes[number]
type Document = { id: string; type: SearchType; title: string; description: string; url: string; text: string }
const tables = { post: 'posts', event: 'events', work: 'works', video: 'videos' } as const

export function hasVectorConfig() {
  return Boolean(process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN)
}

function vector() {
  return new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    signal: () => AbortSignal.timeout(8000),
    retry: { retries: 0 },
  }).namespace(process.env.UPSTASH_VECTOR_NAMESPACE || 'aneko-public')
}

function plainText(text: string) {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Explicit public predicates apply even to signed-in administrators. Never index profiles or applications.
export async function publicDocuments(
  db: SupabaseClient<Database>, type: SearchType,
  options: { ids?: string[]; query?: string; offset?: number; limit?: number } = {}
): Promise<Document[]> {
  const columns = {
    post: 'id,title,content,category',
    event: 'id,title,description,location,tags',
    work: 'id,title,description,story,category',
    video: 'id,title,description',
  }
  let query = db.from(tables[type]).select(columns[type]).order('id')
  if (type === 'post') query = query.filter('status', 'eq', 'published')
  if (type === 'work') query = query.filter('status', 'eq', 'approved')
  if (type === 'video') query = query.filter('is_active', 'eq', true)
  if (options.ids) {
    if (!options.ids.length) return []
    query = query.in('id', options.ids)
  }
  if (options.query) {
    // Keep PostgREST filter grammar out of user input; quote the pattern and escape SQL LIKE wildcards.
    const escaped = Array.from(options.query).map(char => ['%', '_', String.fromCharCode(92)].includes(char) ? String.fromCharCode(92) + char : char).join('')
    const pattern = JSON.stringify('%' + escaped + '%')
    const body = type === 'post' ? 'content' : 'description'
    query = query.or(`title.ilike.${pattern},${body}.ilike.${pattern}`)
  }
  const offset = options.offset || 0
  const { data, error } = await query.range(offset, offset + (options.limit || 100) - 1)
  if (error) {
    // Videos are an optional migration in existing installations.
    if (type === 'video' && ['42P01', 'PGRST205'].includes(error.code)) return []
    throw new Error('Search source unavailable')
  }
  return (data as unknown as Record<string, unknown>[]).map(row => {
    const id = String(row.id)
    const title = String(row.title || '')
    const content = plainText(String(row.content || row.description || ''))
    const extra = [row.story, row.category, row.location, ...(Array.isArray(row.tags) ? row.tags : [])].filter(Boolean).join(' ')
    const url = type === 'post' ? `/posts/${id}` : type === 'event' ? '/events' : type === 'work' ? '/gallery' : '/videos'
    return { id, type, title, description: content.slice(0, 180), url, text: plainText(`${title}\n${content}\n${extra}`).slice(0, 4000) }
  })
}

export async function indexDocuments(documents: Document[]) {
  if (!documents.length) return
  await vector().upsert(documents.map(doc => ({ id: `${doc.type}:${doc.id}`, data: doc.text })))
}

// A failed index update must not make an already committed content save look like a failed save.
// Search always rehydrates results from Supabase, so stale vectors never reveal withdrawn content.
export async function syncSearchRecord(db: SupabaseClient<Database>, type: SearchType, id: string) {
  if (!hasVectorConfig()) return
  try {
    const documents = await publicDocuments(db, type, { ids: [id] })
    if (documents.length) await indexDocuments(documents)
    else await vector().delete(`${type}:${id}`)
  } catch {
    console.warn(`Search index sync failed for ${type}:${id}; run search backfill to retry.`)
  }
}

export async function searchContent(db: SupabaseClient<Database>, query: string) {
  let mode: 'semantic' | 'keyword' = 'keyword'
  let rankedIds: string[] = []
  if (hasVectorConfig()) {
    try {
      const matches = await vector().query({ data: query, topK: 40, includeMetadata: false })
      rankedIds = matches.map(match => String(match.id))
      mode = 'semantic'
    } catch {
      console.warn('Vector search unavailable; using keyword search.')
    }
  }
  const groups = await Promise.all(searchTypes.map(async type => {
    const ids = rankedIds.filter(id => id.startsWith(`${type}:`)).map(id => id.slice(type.length + 1))
      .filter(id => /^[0-9a-f-]{36}$/i.test(id))
    const [semantic, keyword] = await Promise.all([
      publicDocuments(db, type, { ids }),
      publicDocuments(db, type, { query, limit: 8 }),
    ])
    return [...semantic, ...keyword]
  }))
  const byId = new Map(groups.flat().map(doc => [`${doc.type}:${doc.id}`, doc]))
  const ordered = [...rankedIds, ...Array.from(byId.keys())]
  const seen = new Set<string>()
  const results = ordered.flatMap(id => {
    const doc = byId.get(id)
    if (!doc || seen.has(id)) return []
    seen.add(id)
    const { text: _text, ...result } = doc
    return [result]
  }).slice(0, 20)
  return { results, mode }
}
