'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  Image,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react'
import { apiRequest } from '@/lib/client-api'

const sidebarMenu = [
  { id: 'dashboard', label: '数据概览', icon: <LayoutDashboard size={20} />, href: '/admin' },
  { id: 'members', label: '成员管理', icon: <Users size={20} />, href: '/admin/members' },
  { id: 'applications', label: '报名管理', icon: <UserPlus size={20} />, href: '/admin/applications' },
  { id: 'slides', label: '首页轮播', icon: <ImagePlus size={20} />, href: '/admin/slides' },
  { id: 'works', label: '作品审核', icon: <Image size={20} />, href: '/admin/works' },
  { id: 'events', label: '活动管理', icon: <Calendar size={20} />, href: '/admin/events' },
  { id: 'posts', label: '公告管理', icon: <Megaphone size={20} />, href: '/admin/posts' },
  { id: 'settings', label: '系统设置', icon: <Settings size={20} />, href: '/admin/settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profile, setProfile] = useState<{ display_name?: string; email?: string; avatar?: string } | null>(null)
  const pathname = usePathname()
  const currentPage = sidebarMenu.find((item) => item.href === pathname)?.label || '数据概览'

  useEffect(() => {
    apiRequest<{ profile: { display_name?: string; email?: string; avatar?: string } | null }>('/api/auth/me')
      .then((data) => setProfile(data.profile))
      .catch(() => setProfile(null))
  }, [])

  const logout = async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen bg-[#0f0f1a]">
      <motion.aside
        className="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[#2a2a4a] bg-[#1a1a2e]"
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="flex items-center gap-3 border-b border-[#2a2a4a] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-anime-pink to-anime-purple">
            <span className="text-xl text-white">A</span>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="text-lg font-bold text-white">ANEKO</span>
                <span className="block text-sm text-gray-400">管理后台</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-2 py-4">
          {sidebarMenu.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.id} href={item.href}>
                <motion.div
                  className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-anime-pink/20 to-anime-purple/20 text-anime-pink'
                      : 'text-gray-400 hover:bg-[#2a2a4a] hover:text-white'
                  }`}
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap text-sm font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#2a2a4a] p-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-gray-400 transition-all hover:bg-[#2a2a4a] hover:text-white"
          >
            <span className="shrink-0">{sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}</span>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm">
                  收起菜单
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-gray-400 transition-all hover:bg-[#2a2a4a] hover:text-white">
            <Home size={20} className="shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm">
                  返回前台
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </motion.aside>

      <motion.main
        className="min-h-screen flex-1"
        animate={{ marginLeft: sidebarCollapsed ? 72 : 240 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <header className="sticky top-0 z-40 border-b border-[#2a2a4a] bg-[#0f0f1a]/80 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{currentPage}</h1>
              <p className="text-sm text-gray-400">欢迎回来，{profile?.display_name || profile?.email || '管理员'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索..."
                  className="w-64 rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 transition-colors focus:border-anime-pink focus:outline-none"
                />
              </div>
              <button type="button" className="relative rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] p-2 text-gray-400 transition-colors hover:text-white">
                <Bell size={18} />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">3</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-[#2a2a4a] bg-[#1a1a2e] p-2 text-gray-400 transition-colors hover:text-white"
                title="退出登录"
              >
                <LogOut size={18} />
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-anime-pink to-anime-purple text-sm font-bold text-white">
                {profile?.avatar || 'A'}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </motion.main>
    </div>
  )
}
