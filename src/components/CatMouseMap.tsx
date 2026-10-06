'use client'

// 猫鼠游戏地图：天地图底图 + 可点击 CN 标签。结构仿 CheckinMap，
// marker 随数据全量重建；禁止数据更新自动改视野——仅 focus.nonce 变化时飞到目标。

import { useEffect, useRef, useState } from 'react'
import { DEFAULT_CENTER, DEFAULT_ZOOM, loadGeoMapSdk, tdtToken } from '@/lib/geomap'

export type CatMouseMapMarker = {
  id: string
  cn: string
  lat: number
  lng: number
  variant?: 'self' | 'other'
  /** 超过 15s 未上报：置灰 */
  stale?: boolean
  selected?: boolean
}

export type CatMouseMapFocus = {
  lat: number
  lng: number
  zoom?: number
  /** 仅该值变化时触发视野移动（防轮询重建触发跳动） */
  nonce: number
}

type Props = {
  markers: CatMouseMapMarker[]
  focus?: CatMouseMapFocus | null
  onMarkerClick?: (id: string) => void
  className?: string
}

export default function CatMouseMap({ markers, focus = null, onMarkerClick, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerHandlesRef = useRef<any[]>([])
  // id → 当前 DOM/句柄/签名，供增量更新与离场清理
  const markerSigsRef = useRef<Map<string, { handle: any; el: HTMLButtonElement; sig: string }>>(new Map())
  const onMarkerClickRef = useRef(onMarkerClick)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)

  onMarkerClickRef.current = onMarkerClick

  // 初始化/销毁（StrictMode 双执行下成对重建，不残留 canvas）
  useEffect(() => {
    let cancelled = false
    let map: any = null

    loadGeoMapSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const { GeoGlobe, mapboxgl } = window
        map = new GeoGlobe.Map({
          style: { version: 8, sources: {}, layers: [] },
          container: containerRef.current,
          zoom: DEFAULT_ZOOM,
          center: DEFAULT_CENTER,
          isIntScrollZoom: true,
          renderWorldCopies: false,
          isAttributionControl: false,
          is3Dpitching: false,
          pitch3Dzoom: 16,
        })
        map.on('load', () => {
          if (cancelled) return
          // TDTLayer 第二参数是 token 字符串；不传用 SDK 内置演示 key
          const token = tdtToken()
          map.addLayer(new GeoGlobe.TDTLayer('vec_w', token))
          map.addLayer(new GeoGlobe.TDTLayer('cva_w', token))
          try {
            // 移动端友好的缩放按钮（SDK 兼容性差异时静默忽略）
            map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
          } catch {
            // 无 NavigationControl 时手势缩放仍可用
          }
          // 初始布局后校正一次画布尺寸（容器在初始化瞬间可能还没定高）
          map.resize()
          setReady(true)
        })
        mapRef.current = map
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    return () => {
      cancelled = true
      markerHandlesRef.current.forEach((handle) => handle.remove())
      markerHandlesRef.current = []
      markerSigsRef.current = new Map()
      map?.remove()
      mapRef.current = null
      setReady(false)
    }
    // 只在挂载时初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 点标记增量更新：未变化的 marker 保留原 DOM（全量重建会吞掉按压中的点击、闪烁）。
  // 变化判定用签名字符串（cn/样式/坐标），逐项原地改 className/textContent/setLngLat。
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    const { mapboxgl } = window
    const next = new Map<string, { handle: any; el: HTMLButtonElement; sig: string }>()

    for (const marker of markers) {
      const sig = [
        marker.cn,
        marker.variant === 'self' ? 'self' : 'other',
        marker.stale ? 1 : 0,
        marker.selected ? 1 : 0,
        marker.lng,
        marker.lat,
      ].join('|')
      const prev = markerSigsRef.current.get(marker.id)

      if (prev && prev.sig === sig) {
        next.set(marker.id, prev)
        continue
      }
      if (prev) {
        // 原地更新：不替换 DOM，保住进行中的点击
        prev.el.className = labelClass(marker)
        prev.el.textContent = marker.cn
        prev.handle.setLngLat([marker.lng, marker.lat])
        next.set(marker.id, { handle: prev.handle, el: prev.el, sig })
        continue
      }

      const el = document.createElement('button')
      el.type = 'button'
      el.className = labelClass(marker)
      // CN 文字一律 textContent 写入（防 XSS）
      el.textContent = marker.cn
      el.addEventListener('click', (event) => {
        event.stopPropagation()
        onMarkerClickRef.current?.(marker.id)
      })
      const handle = new mapboxgl.Marker(el).setLngLat([marker.lng, marker.lat]).addTo(map)
      next.set(marker.id, { handle, el, sig })
    }

    // 离场玩家的 marker 移除
    markerSigsRef.current.forEach((entry, id) => {
      if (!next.has(id)) entry.handle.remove()
    })
    markerSigsRef.current = next
    markerHandlesRef.current = []
    next.forEach((entry) => {
      markerHandlesRef.current.push(entry.handle)
    })
  }, [markers, ready])

  // 容器尺寸变化后必须 map.resize()：横幅出现/消失、移动端地址栏收放、
  // 横竖屏切换都会改变容器大小，不校正会出现瓦片拉伸、标记与底图错位（移动端高发）
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        mapRef.current?.resize()
      })
    }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    observer?.observe(container)
    window.addEventListener('orientationchange', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('orientationchange', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }, [])

  // 外部视野控制：仅 focus.nonce 变化触发
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !focus) return
    map.easeTo({
      center: [focus.lng, focus.lat],
      zoom: Math.min(focus.zoom ?? map.getZoom(), 18),
      duration: 800,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, ready])

  if (loadError) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400 ${className}`}>
        地图加载失败（玩家列表仍可用）
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}

function labelClass(marker: CatMouseMapMarker): string {
  return [
    'catmouse-map-label',
    marker.variant === 'self' ? 'catmouse-map-label--self' : '',
    marker.stale ? 'catmouse-map-label--stale' : '',
    marker.selected ? 'catmouse-map-label--selected' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
