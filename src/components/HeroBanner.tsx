'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { apiRequest } from '@/lib/client-api'
import type { HeroSlide, SiteSettings } from '@/lib/app-types'

const defaultSettings = {
  club_name: 'ANEKO动漫社',
  club_description: '欢迎来到二次元的世界',
}

function makeFallbackSlide(settings?: Partial<SiteSettings>): HeroSlide {
  return {
    id: 'fallback',
    title: settings?.club_name || defaultSettings.club_name,
    description: settings?.club_description || defaultSettings.club_description,
    image: '',
    href: '',
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  }
}

export default function HeroBanner() {
  const [slides, setSlides] = useState<HeroSlide[]>([makeFallbackSlide()])
  const [hasCustomSlides, setHasCustomSlides] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      apiRequest<HeroSlide[]>('/api/hero-slides'),
      apiRequest<SiteSettings | null>('/api/settings'),
    ]).then(([slidesResult, settingsResult]) => {
      if (cancelled) return

      const loadedSlides = slidesResult.status === 'fulfilled' ? slidesResult.value : []
      const settings = settingsResult.status === 'fulfilled' ? settingsResult.value || undefined : undefined

      if (loadedSlides.length > 0) {
        setSlides(loadedSlides)
        setHasCustomSlides(true)
      } else {
        setSlides([makeFallbackSlide(settings)])
        setHasCustomSlides(false)
      }
      setCurrentIndex(0)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length])

  const currentSlide = slides[currentIndex] || makeFallbackSlide()
  const canNavigate = slides.length > 1

  const pauseAutoPlay = () => {
    setIsAutoPlaying(false)
    window.setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    pauseAutoPlay()
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length)
    pauseAutoPlay()
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length)
    pauseAutoPlay()
  }

  const slideContent = useMemo(
    () => (
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-6 pb-28 pt-32 sm:px-8 lg:px-10">
        <div className="max-w-3xl text-white">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
            {hasCustomSlides ? 'Featured' : 'Club Profile'}
          </p>
          <h1 className="text-4xl font-bold leading-tight drop-shadow-lg md:text-6xl">{currentSlide.title}</h1>
          {currentSlide.description && (
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90 drop-shadow md:text-2xl">
              {currentSlide.description}
            </p>
          )}
          {currentSlide.href && (
            <span className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-white/90">
              查看详情
            </span>
          )}
        </div>
      </div>
    ),
    [currentSlide, hasCustomSlides],
  )

  return (
    <section className="relative h-screen min-h-[620px] w-full overflow-hidden bg-[#141426]">
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {slide.image ? (
              <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-anime-pink via-anime-purple to-anime-blue" />
            )}
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/35" />

      {currentSlide.href ? (
        <Link href={currentSlide.href} className="absolute inset-0 z-10" aria-label={currentSlide.title}>
          {slideContent}
        </Link>
      ) : (
        slideContent
      )}

      {canNavigate && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur-sm transition hover:bg-white/35"
            aria-label="上一张"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur-sm transition hover:bg-white/35"
            aria-label="下一张"
          >
            <ChevronRight size={24} />
          </button>
          <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goToSlide(index)}
                className={`h-3 rounded-full transition-all ${
                  index === currentIndex ? 'w-9 bg-white' : 'w-3 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`第 ${index + 1} 张`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
