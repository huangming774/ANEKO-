'use client'

import { useEffect, useState } from 'react'
import { Mail, Phone, Sparkles } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { SiteSettings } from '@/lib/app-types'

export default function HomeClubInfo() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    apiRequest<SiteSettings | null>('/api/settings')
      .then((data) => setSettings(data))
      .catch(() => setSettings(null))
  }, [])

  const clubName = settings?.club_name || 'ANEKO动漫社'
  const description = settings?.club_description || '欢迎来到二次元的世界。'
  const contactEmail = settings?.contact_email || ''
  const contactPhone = settings?.contact_phone || ''

  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-anime-pink/10 px-4 py-2 text-sm font-semibold text-anime-pink">
            <Sparkles size={16} />
            社团基本信息
          </div>
          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">{clubName}</h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-gray-600 md:text-lg">{description}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-anime-light to-white p-6 shadow-lg">
          <h3 className="mb-5 text-lg font-bold text-gray-900">联系方式</h3>
          <div className="space-y-4">
            <ContactLine icon={<Mail size={18} />} label="邮箱" value={contactEmail || '后台未填写'} />
            <ContactLine icon={<Phone size={18} />} label="电话" value={contactPhone || '后台未填写'} />
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-anime-pink shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="break-words font-semibold text-gray-800">{value}</div>
      </div>
    </div>
  )
}
