'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { SiteSettings } from '@/lib/app-types'
import AnnouncementBanner from '@/components/AnnouncementBanner'

const navItems = [
  { name: '首页', href: '/' },
  { name: '关于我们', href: '/about' },
  { name: '活动日历', href: '/events' },
  { name: '活动签到', href: '/checkin' },
  { name: '作品展示', href: '/gallery' },
  { name: '视频', href: '/videos' },
  { name: 'AI问答', href: '/ai' },
  { name: '上传作品', href: '/upload' },
  { name: '加入我们', href: '/join' },
  { name: 'Galgame游戏', href: 'https://js.miku.coffee/' },
]

const isExternalHref = (href: string) => /^https?:\/\//.test(href)

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [settings, setSettings] = useState<SiteSettings | null>(null)

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

  const brandName = settings?.club_name || 'ANEKO动漫社'
  const logoUrl = settings?.logo_url || ''

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/90 shadow-lg backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <AnnouncementBanner enabled={Boolean(settings?.announcement_banner)} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex min-w-0 items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 text-xl backdrop-blur-sm">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>A</span>
              )}
            </span>
            <span
              className={`truncate text-xl font-bold font-round transition-colors duration-300 ${
                isScrolled ? 'gradient-text' : 'text-white'
              }`}
            >
              {brandName}
            </span>
          </a>

          <nav className="hidden items-center space-x-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target={isExternalHref(item.href) ? '_blank' : undefined}
                rel={isExternalHref(item.href) ? 'noopener noreferrer' : undefined}
                className={`font-medium transition-all duration-300 hover:scale-105 ${
                  isScrolled ? 'text-gray-700 hover:text-anime-pink' : 'text-white/90 hover:text-white'
                }`}
              >
                {item.name}
              </a>
            ))}
          </nav>

          <div className="hidden items-center space-x-3 md:flex">
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
            className="p-2 md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="打开导航菜单"
          >
            {isMobileMenuOpen ? (
              <X size={24} className={isScrolled ? 'text-gray-800' : 'text-white'} />
            ) : (
              <Menu size={24} className={isScrolled ? 'text-gray-800' : 'text-white'} />
            )}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="rounded-b-2xl bg-white/95 shadow-lg backdrop-blur-md md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target={isExternalHref(item.href) ? '_blank' : undefined}
                  rel={isExternalHref(item.href) ? 'noopener noreferrer' : undefined}
                  className="block rounded-lg px-3 py-2 text-gray-700 transition-colors duration-300 hover:bg-anime-pink/10 hover:text-anime-pink"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="flex space-x-3 px-3 pt-3">
                <a
                  href="/login"
                  className="w-full rounded-full border border-anime-pink px-4 py-2 text-center text-sm font-medium text-anime-pink transition-all duration-300 hover:bg-anime-pink hover:text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  登录
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
