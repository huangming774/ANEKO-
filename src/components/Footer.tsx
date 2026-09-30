'use client'

import { useEffect, useState } from 'react'
import { Globe, Mail, MessageCircle, Phone, Play, Smartphone } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { SiteSettings } from '@/lib/app-types'

interface SocialLink {
  name: string
  icon: string
  href: string
}

interface FooterProps {
  socialLinks: SocialLink[]
}

const iconMap: { [key: string]: React.ReactNode } = {
  Globe: <Globe size={20} />,
  Play: <Play size={20} />,
  MessageCircle: <MessageCircle size={20} />,
  Smartphone: <Smartphone size={20} />,
}

export default function Footer({ socialLinks }: FooterProps) {
  const [settings, setSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    apiRequest<SiteSettings | null>('/api/settings')
      .then((data) => setSettings(data))
      .catch(() => setSettings(null))
  }, [])

  const clubName = settings?.club_name || 'ANEKO动漫社'
  const description = settings?.club_description || '我们是一群热爱动漫文化的伙伴，在这里分享快乐、结交朋友，一起探索二次元的世界。'
  const contactEmail = settings?.contact_email || ''
  const contactPhone = settings?.contact_phone || ''

  return (
    <footer className="bg-gradient-to-br from-anime-dark to-gray-900 py-16 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-2xl font-bold gradient-text">{clubName}</h3>
            <p className="mb-4 leading-7 text-gray-400">{description}</p>
            <p className="text-gray-400">加入我们，一起创造更多社团回忆。</p>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold">联系我们</h4>
            <div className="space-y-3">
              <ContactLine icon={<Mail size={16} />} label="邮箱" value={contactEmail || '后台未填写'} />
              <ContactLine icon={<Phone size={16} />} label="电话" value={contactPhone || '后台未填写'} />
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold">关注我们</h4>
            <div className="flex space-x-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all duration-300 hover:scale-110 hover:bg-anime-pink"
                  title={link.name}
                >
                  {iconMap[link.icon]}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-500">© 2026 {clubName} 版权所有</p>
          <p className="mt-2 text-xs text-gray-600">Built with Next.js, Supabase and Cloudflare R2</p>
        </div>
      </div>
    </footer>
  )
}

function ContactLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <p className="flex items-center gap-2 text-gray-400">
      <span className="text-anime-pink">{icon}</span>
      <span className="text-anime-pink">{label}：</span>
      <span className="break-all">{value}</span>
    </p>
  )
}
