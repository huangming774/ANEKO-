'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  Image,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Settings,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react'
import { apiRequest } from '@/lib/client-api'

const sidebarMenu = [
  { id: 'dashboard', label: '数据概览', icon: <LayoutDashboard size={20} />, href: '/admin' },
  { id: 'members', label: '成员管理', icon: <Users size={20} />, href: '/admin/members' },
  { id: 'applications', label: '报名管理', icon: <UserPlus size={20} />, href: '/admin/applications' },
  { id: 'slides', label: '首页轮播', icon: <ImagePlus size={20} />, href: '/admin/slides' },
  { id: 'works', label: '作品审核', icon: <Image size={20} />, href: '/admin/works' },
  { id: 'videos', label: '视频管理', icon: <Video size={20} />, href: '/admin/videos' },
  { id: 'ai', label: 'AI模型', icon: <Bot size={20} />, href: '/admin/ai' },
  { id: 'events', label: '活动管理', icon: <Calendar size={20} />, href: '/admin/events' },
  { id: 'checkins', label: '签到活动', icon: <MapPin size={20} />, href: '/admin/checkins' },
  { id: 'posts', label: '公告管理', icon: <Megaphone size={20} />, href: '/admin/posts' },
  { id: 'settings', label: '系统设置', icon: <Settings size={20} />, href: '/admin/settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profile, setProfile] = useState<{ display_name?: string; email?: string; avatar?: string } | null>(null)
  const pathname = usePathname()
  const currentPage = sidebarMenu.find((item) => item.href === pathname)?.label || '数据概览'

  useEffect(() => {
    apiRequest<{ profile: { display_name?: string; email?: string; avatar?: string } | null }>('/api/auth/me')
      .then((data) => setProfile(data.profile))
      .catch(() => setProfile(null))
  }, [])

  // 路由切换后自动收起移动端抽屉
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // 移动端抽屉打开时锁定背景滚动
  useEffect(() => {
    if (!mobileMenuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileMenuOpen])

  const logout = async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen bg-[#0f0f1a]">
      {/* 移动端抽屉遮罩：淡入 + 背景模糊 */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r border-[#2a2a4a] bg-[#1a1a2e] shadow-[8px_0_30px_rgba(0,0,0,0.35)] transition-[width,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:shadow-none ${sidebarCollapsed ? 'md:w-[72px]' : 'md:w-60'}`}
      >
        {/* 顶部渐变描边 */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-anime-pink to-anime-purple" />
        <div className="flex items-center gap-3 border-b border-[#2a2a4a] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-anime-pink to-anime-purple">
            <span className="text-xl text-white">A</span>
          </div>
          <div className={`overflow-hidden whitespace-nowrap ${sidebarCollapsed ? 'md:hidden' : ''}`}>
            <span className="text-lg font-bold text-white">ANEKO</span>
            <span className="block text-sm text-gray-400">管理后台</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto rounded-xl p-2 text-gray-400 transition-colors hover:bg-[#2a2a4a] hover:text-white active:scale-95 md:hidden"
            aria-label="关闭菜单"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4">
          {sidebarMenu.map((item, index) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.id} href={item.href} className="block">
                {/* 移动端抽屉展开时菜单项级联渐显 */}
                <div
                  className={`transition-opacity duration-300 ease-out ${
                    mobileMenuOpen ? 'max-md:opacity-100' : 'max-md:opacity-0'
                  }`}
                  style={{ transitionDelay: mobileMenuOpen ? `${index * 40}ms` : '0ms' }}
                >
                  <motion.div
                    className={`relative mb-1 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-anime-pink/20 to-anime-purple/20 text-anime-pink shadow-[0_0_18px_rgba(255,107,157,0.15)]'
                        : 'text-gray-400 hover:bg-[#2a2a4a] hover:text-white'
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-anime-pink to-anime-purple" />
                    )}
                    <span className="shrink-0">{item.icon}</span>
                    <span
                      className={`overflow-hidden whitespace-nowrap text-sm font-medium ${
                        sidebarCollapsed ? 'md:hidden' : ''
                      }`}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#2a2a4a] p-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden w-full items-center gap-3 rounded-xl px-3 py-3 text-gray-400 transition-all hover:bg-[#2a2a4a] hover:text-white md:flex"
          >
            <span className="shrink-0">{sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}</span>
            <span className={`text-sm ${sidebarCollapsed ? 'md:hidden' : ''}`}>收起菜单</span>
          </button>
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-gray-400 transition-all hover:bg-[#2a2a4a] hover:text-white">
            <Home size={20} className="shrink-0" />
            <span className={`text-sm ${sidebarCollapsed ? 'md:hidden' : ''}`}>返回前台</span>
          </Link>
        </div>
      </aside>

      <main
        className={`min-h-screen flex-1 transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-60'
        }`}
      >
        <header className="sticky top-0 z-40 border-b border-[#2a2a4a] bg-[#0f0f1a]/80 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] text-gray-400 transition-colors hover:text-white active:scale-95 md:hidden"
                aria-label="打开菜单"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-white sm:text-2xl">{currentPage}</h1>
                <p className="truncate text-sm text-gray-400">
                  欢迎回来，{profile?.display_name || profile?.email || '管理员'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] text-gray-400 transition-colors hover:text-white"
                title="退出登录"
              >
                <LogOut size={20} />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-anime-pink to-anime-purple text-sm font-bold text-white">
                {profile?.avatar || 'A'}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}
