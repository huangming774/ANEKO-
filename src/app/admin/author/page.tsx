import type { Metadata } from 'next'
import { Cloud, Code2, Database, Heart, Layers, MessageCircle, Search, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: '关于作者 · ANEKO',
}

const technologies = [
  {
    name: 'Next.js',
    category: '网站框架',
    description: '基于 React 构建网站页面，通过 App Router 与服务端 API 连接前台体验和后台管理。',
    icon: Code2,
    color: 'text-sky-300 bg-sky-400/10',
  },
  {
    name: 'PostgreSQL',
    category: '数据存储 · Supabase',
    description: '通过 Supabase 管理社团成员、活动、公告与作品等业务数据，为网站提供可靠的数据基础。',
    icon: Database,
    color: 'text-blue-300 bg-blue-400/10',
  },
  {
    name: 'Redis',
    category: '缓存 · Upstash',
    description: '使用 Upstash Redis 缓存公开接口数据，减少重复查询，让常用内容加载得更轻快。',
    icon: Zap,
    color: 'text-amber-300 bg-amber-400/10',
  },
  {
    name: 'Cloudflare R2',
    category: '对象存储',
    description: '承载网站上传的图片、视频等媒体文件，让社团的作品与活动记录有一个安稳的存放空间。',
    icon: Cloud,
    color: 'text-orange-300 bg-orange-400/10',
  },
  {
    name: 'Upstash Vector',
    category: '语义搜索',
    description: '为站内内容建立向量索引，支持按语义查找公告、活动与作品，让想找的内容更容易被发现。',
    icon: Search,
    color: 'text-emerald-300 bg-emerald-400/10',
  },
  {
    name: 'TypeScript & Tailwind CSS',
    category: '开发与界面',
    description: '用 TypeScript 保持代码清晰，用 Tailwind CSS 构建响应式界面，并以 Framer Motion 为交互增添细节。',
    icon: Layers,
    color: 'text-purple-300 bg-purple-400/10',
  },
]

export default function AuthorPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-6">
      <section className="relative overflow-hidden rounded-3xl border border-anime-pink/20 bg-[#1a1a2e] p-6 sm:p-9" aria-labelledby="author-name">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-anime-purple/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-anime-pink/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-anime-pink to-anime-purple text-4xl font-bold text-white shadow-lg shadow-anime-pink/15" aria-hidden="true">
            25
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-anime-pink">Behind ANEKO</p>
            <h2 id="author-name" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">25 <span className="text-xl font-medium text-gray-300 sm:text-2xl">（双叶）</span></h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              ANEKO 网站创建者与代码作者。把对动漫的热爱写进代码，为社团留下一处可以分享作品、记录活动、遇见同好的小天地。
            </p>
          </div>
        </div>
        <dl className="relative mt-7 grid gap-4 border-t border-white/5 pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">网站创建</dt>
            <dd className="mt-1.5 text-sm font-medium text-gray-200">25（双叶）</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">代码编写</dt>
            <dd className="mt-1.5 text-sm font-medium text-gray-200">25（双叶）</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-gray-500"><MessageCircle size={14} aria-hidden="true" />联系 QQ</dt>
            <dd className="mt-1.5 select-all text-sm font-medium tabular-nums text-gray-200">1067921680</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="technology-title">
        <div className="mb-4">
          <h2 id="technology-title" className="text-lg font-bold text-white">网站背后的技术</h2>
          <p className="mt-1 text-sm text-gray-500">从页面到数据，再到每一次搜索与分享。</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {technologies.map(({ name, category, description, icon: Icon, color }) => (
            <article key={name} className="rounded-2xl border border-[#2a2a4a] bg-[#1a1a2e] p-5 sm:p-6">
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={20} aria-hidden="true" /></div>
              <h3 className="text-base font-semibold text-white">{name}</h3>
              <p className="mt-1 text-xs text-gray-500">{category}</p>
              <p className="mt-3 text-sm leading-7 text-gray-400">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#2a2a4a] bg-[#1a1a2e] p-6 sm:p-8" aria-labelledby="reflection-title">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-anime-pink/10 text-anime-pink"><Heart size={20} aria-hidden="true" /></div>
          <h2 id="reflection-title" className="text-lg font-bold text-white">写在代码之外</h2>
        </div>
        <div className="space-y-4 text-sm leading-8 text-gray-300">
          <p>
            做这个网站，是想给大家的热爱找一个可以留下来的地方。一次活动、一张画、一段视频，也许只是日常里很小的片段，但当它们被认真记录，就会慢慢变成属于社团的共同回忆。
          </p>
          <p>
            从一个想法到一个能使用的页面，中间总有需要反复琢磨的细节。写代码的过程让我觉得，创作和喜欢动漫其实很像：因为在意，所以愿意花时间；因为还有期待，所以愿意继续改进。希望 ANEKO 能陪大家把这些小小的热爱，一点一点积攒起来。
          </p>
        </div>
        <p className="mt-6 text-right text-sm font-medium text-anime-pink">—— 25（双叶）</p>
      </section>
    </div>
  )
}
