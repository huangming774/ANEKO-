// Offline regression tests: exercise public visibility, stale index results and outage fallback.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { createClient } = require('@supabase/supabase-js')
const source = ts.transpileModule(fs.readFileSync('src/lib/search.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const ids = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222']
const state = { matches: [], fail: false, writes: [], deletes: [], urls: [] }
const sdk = {
  query: async () => { if (state.fail) throw Error('offline'); return state.matches },
  upsert: async rows => { state.writes.push(...rows) },
  delete: async id => { state.deletes.push(id) },
}
const env = {}
const context = { exports: {}, process: { env }, console: { warn() {} }, AbortSignal,
  require: name => name === 'server-only' ? {} : { Index: class { namespace() { return sdk } } },
}
vm.runInNewContext(source, context)
const search = context.exports
const rows = {
  posts: [{ id: ids[0], title: '公开文章', content: '动漫活动', status: 'published' },
    { id: ids[1], title: '未公开秘密', content: '秘密内容', status: 'draft' }],
  works: [{ id: ids[1], title: '待审核作品', status: 'pending' }],
  videos: [{ id: ids[1], title: '隐藏视频', is_active: false }], events: [],
}
const db = createClient('https://example.supabase.co', 'offline-test', { global: { fetch: async input => {
  const url = new URL(String(input)); state.urls.push(url)
  let data = rows[url.pathname.split('/').pop()] || []
  for (const key of ['status', 'is_active']) {
    const filter = url.searchParams.get(key)
    if (filter) data = data.filter(row => String(row[key]) === filter.slice(3))
  }
  const filter = url.searchParams.get('id')
  if (filter) data = data.filter(row => filter.includes(row.id))
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })
} } })
async function run() {
  let result = await search.searchContent(db, '动漫')
  assert.equal(result.mode, 'keyword')
  assert.equal(result.results.length, 1)
  assert.equal(result.results[0].title, '公开文章')
  assert.equal(result.results[0].description, '动漫活动')
  env.UPSTASH_VECTOR_REST_URL = 'https://vector.example'; env.UPSTASH_VECTOR_REST_TOKEN = 'offline-test'
  state.matches = [{ id: 'post:' + ids[1] }, { id: 'work:' + ids[1] }, { id: 'post:' + ids[0] }, { id: 'post:invalid' }]
  result = await search.searchContent(db, '动漫')
  assert.equal(result.mode, 'semantic')
  assert.equal(result.results.length, 1, 'withdrawn/private/stale results must not leak')
  state.fail = true
  result = await search.searchContent(db, '动漫')
  assert.equal(result.mode, 'keyword')
  assert.equal(result.results.length, 1, 'Vector outage retains keyword results')
  await search.syncSearchRecord(db, 'post', ids[1])
  assert.equal(state.deletes[0], 'post:' + ids[1])
  await search.syncSearchRecord(db, 'post', ids[0])
  assert.equal(state.writes[0].id, 'post:' + ids[0])
  assert.ok(state.writes[0].data.includes('动漫活动'))
  await search.publicDocuments(db, 'post', { query: '"),status.eq.draft' })
  const last = state.urls.at(-1)
  assert.ok(last.searchParams.get('or').includes(String.fromCharCode(92, 34)), 'filter quotes must be escaped')
  assert.equal(last.searchParams.get('status'), 'eq.published')
  console.log('PASS: visibility, stale results, deduplication, fallback, upsert/delete, filter escaping')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
