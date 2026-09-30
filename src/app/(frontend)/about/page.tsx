'use client'

import { motion } from 'framer-motion'
import { Heart, Palette, Sparkles, Users } from 'lucide-react'

const highlights = [
  {
    title: '一起交流',
    description: '分享喜欢的动画、漫画、游戏和角色，认识兴趣相近的朋友。',
    icon: Users,
  },
  {
    title: '一起创作',
    description: '欢迎绘画、摄影、手工、Cosplay、视频剪辑等各种形式的作品。',
    icon: Palette,
  },
  {
    title: '一起活动',
    description: '社团会组织观影、讨论、作品展示、线下聚会等轻松有趣的活动。',
    icon: Sparkles,
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-anime-light via-white to-anime-light pt-16">
      <section className="bg-gradient-to-r from-anime-pink to-anime-purple px-4 py-20 text-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">ANEKO Anime Club</p>
          <h1 className="text-4xl font-bold md:text-6xl">关于我们</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/90">
            ANEKO 动漫社是一个由动漫爱好者组成的校园社团。这里没有复杂门槛，只要你喜欢动漫文化，愿意交流、分享和尝试创作，都欢迎加入我们。
          </p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-gray-900">我们在做什么</h2>
          <p className="mt-3 text-gray-600">轻松一点，热闹一点，把兴趣变成日常。</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl bg-white p-6 text-center shadow-lg"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-anime-pink to-anime-purple text-white">
                <item.icon size={26} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
              <p className="mt-3 leading-7 text-gray-600">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-white/70 px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-8 shadow-md">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">社团日常</h2>
            <div className="space-y-3 leading-7 text-gray-600">
              <p>我们会一起看番、聊作品、分享创作，也会根据大家的兴趣安排主题活动。</p>
              <p>不管你是刚入坑的新朋友，还是已经有很多作品和经验的老同好，都可以在这里找到自己的位置。</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-md">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">欢迎加入</h2>
            <div className="space-y-3 leading-7 text-gray-600">
              <p>如果你喜欢动漫、游戏、绘画、Cosplay 或二次元文化，欢迎填写报名信息。</p>
              <p>提交后我们会在后台看到你的信息，并尽快联系你。</p>
            </div>
            <a
              href="/join"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-anime-pink to-anime-purple px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
            >
              <Heart size={18} />
              去填写报名
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
