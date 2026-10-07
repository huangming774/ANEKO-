'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  Calendar,
  Crosshair,
  ExternalLink,
  Gamepad2,
  Heart,
  Home,
  Image as ImageIcon,
  MapPin,
  Menu,
  Upload,
  UserPlus,
  Video,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { SiteSettings } from '@/lib/app-types'
import AnnouncementBanner from '@/components/AnnouncementBanner'

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { name: '首页', href: '/', icon: Home },
  { name: '关于我们', href: '/about', icon: Heart },
  { name: '活动日历', href: '/events', icon: Calendar },
  { name: '活动签到', href: '/checkin', icon: MapPin },
  { name: '猫鼠游戏', href: '/catmouse', icon: Crosshair },
  { name: '作品展示', href: '/gallery', icon: ImageIcon },
  { name: '视频', href: '/videos', icon: Video },
  { name: 'AI问答', href: '/ai', icon: Bot },
  { name: '上传作品', href: '/upload', icon: Upload },
  { name: '加入我们', href: '/join', icon: UserPlus },
  { name: 'Galgame游戏', href: 'https://js.miku.coffee/', icon: Gamepad2 },
]

const isExternalHref = (href: string) => /^https?:\/\//.test(href)

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    apiRequest<SiteSettings | null>('/api/settings')
      .then((data) => setSettings(data))
      .catch(() => setSettings(null))
  }, [])

  // 菜单展开时锁背景滚动，路由变化自动收起
  useEffect(() => {
    if (!isMobileMenuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileMenuOpen])

  const brandName = settings?.club_name || 'ANEKO动漫社'
  const logoUrl = settings?.logo_url || ''
  // 菜单展开时顶栏强制实底，避免透明底上叠白面板
  const solidBar = isScrolled || isMobileMenuOpen

  const isActive = (item: NavItem) => {
    if (isExternalHref(item.href)) return false
    if (item.href === '/') return pathname === '/'
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        solidBar ? 'bg-white shadow-lg' : 'bg-transparent'
      }`}
    >
      {/* 渐变发丝线：实底时把顶栏和浅色页面背景明确分开 */}
      {solidBar && (
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-anime-pink to-anime-purple opacity-70" />
      )}
      <AnnouncementBanner enabled={Boolean(settings?.announcement_banner)} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative z-20 flex h-16 items-center justify-between">
          <a href="/" className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xl backdrop-blur-sm ${
                solidBar ? 'bg-gradient-to-br from-anime-pink/15 to-anime-purple/15' : 'bg-white/15'
              }`}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>A</span>
              )}
            </span>
            <span
              className={`truncate text-xl font-bold font-round transition-colors duration-300 ${
                solidBar ? 'gradient-text' : 'text-white'
              }`}
            >
              {brandName}
            </span>
          </a>

          {/* 11 个栏目较宽：仅 ≥1280px 铺开胶囊导航，更窄窗口走汉堡菜单，避免挤压 */}
          <nav className="hidden items-center gap-1 xl:flex">
            {navItems.map((item) => {
              const active = isActive(item)
              const external = isExternalHref(item.href)
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    active
                      ? 'bg-anime-pink/15 text-anime-pink'
                      : solidBar
                        ? 'text-gray-700 hover:bg-anime-pink/10 hover:text-anime-pink'
                        : 'text-white/90 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {item.name}
                </a>
              )
            })}
          </nav>

          <div className="hidden items-center space-x-3 xl:flex">
            <a
              href="/login"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105 ${
                isScrolled
                  ? 'border border-anime-pink text-anime-pink hover:bg-anime-pink hover:text-white'
                  : 'border border-white/50 text-white hover:bg-white/20'
              }`}
            >
              登录
            </a>
          </div>

          <button
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors xl:hidden ${
              solidBar ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/15'
            }`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={isMobileMenuOpen}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMobileMenuOpen ? 'close' : 'menu'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        {/* 移动端菜单：遮罩 + 滑入面板 + 逐项入场 */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 top-16 z-10 bg-black/40 backdrop-blur-[2px] xl:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-hidden
              />
              <motion.div
                key="panel"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="relative z-20 overflow-hidden rounded-b-3xl bg-white shadow-2xl xl:hidden"
              >
                <div className="h-1 bg-gradient-to-r from-anime-pink to-anime-purple" />
                <nav className="max-h-[calc(100dvh-7rem)] space-y-1 overflow-y-auto px-3 pb-4 pt-3">
                  {navItems.map((item, index) => {
                    const active = isActive(item)
                    const external = isExternalHref(item.href)
                    const Icon = item.icon
                    return (
                      <motion.a
                        key={item.name}
                        href={item.href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0.04 * index + 0.04 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                          active
                            ? 'bg-gradient-to-r from-anime-pink/15 to-anime-purple/15 text-anime-pink'
                            : 'text-gray-700 hover:bg-anime-pink/10 hover:text-anime-pink'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            active ? 'bg-anime-pink text-white shadow-md shadow-anime-pink/30' : 'bg-anime-pink/10 text-anime-pink'
                          }`}
                        >
                          <Icon size={18} />
                        </span>
                        <span className="flex-1 truncate">{item.name}</span>
                        {external && <ExternalLink size={14} className="shrink-0 text-gray-300" />}
                      </motion.a>
                    )
                  })}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.04 * navItems.length + 0.04 }}
                    className="pt-3"
                  >
                    <a
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-anime-pink to-anime-purple px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-anime-pink/25 transition-transform active:scale-[0.98]"
                    >
                      登录
                    </a>
                  </motion.div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
