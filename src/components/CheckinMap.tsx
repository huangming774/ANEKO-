'use client'

// 天地图封装组件：负责 SDK 加载、底图渲染、点标记（CN 标签）与后台网格聚合。
// CN 文字一律 textContent 写入（防 XSS）；地图渲染失败不影响页面其他功能。

import { useEffect, useRef, useState } from 'react'
import { DEFAULT_CENTER, DEFAULT_ZOOM, loadGeoMapSdk, tdtToken } from '@/lib/geomap'

export type CheckinMapMarker = {
  id: string
  longitude: number
  latitude: number
  label: string
  variant?: 'checkin' | 'self'
}

type Props = {
  center?: [number, number]
  zoom?: number
  markers: CheckinMapMarker[]
  fitOnMarkers?: boolean
  className?: string
}

// 超过该数量改用网格聚合，避免满屏 DOM 标签
const CLUSTER_THRESHOLD = 50

type ClusterItem = {
  key: string
  longitude: number
  latitude: number
  count: number
  label: string
}

export default function CheckinMap({ center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM, markers, fitOnMarkers = false, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerHandlesRef = useRef<any[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [mapZoom, setMapZoom] = useState(zoom)

  // 初始化/销毁（StrictMode 双执行下成对重建，不残留 canvas）
  useEffect(() => {
    let cancelled = false
    let map: any = null

    loadGeoMapSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const { GeoGlobe } = window
        map = new GeoGlobe.Map({
          style: { version: 8, sources: {}, layers: [] },
          container: containerRef.current,
          zoom,
          center,
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
          setReady(true)
        })
        map.on('zoomend', () => {
          if (!cancelled && map) setMapZoom(map.getZoom())
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
      map?.remove()
      mapRef.current = null
      setReady(false)
    }
    // 只在挂载时初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 点标记全量重建（数据量小，简单可靠）
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    markerHandlesRef.current.forEach((handle) => handle.remove())
    markerHandlesRef.current = []

    const { mapboxgl } = window
    const items: ClusterItem[] = buildItems(markers, mapZoom)

    for (const item of items) {
      const el = document.createElement('div')
      if (item.count > 1) {
        el.className = 'checkin-map-cluster'
        el.textContent = String(item.count)
        el.addEventListener('click', () => {
          map.easeTo({ center: [item.longitude, item.latitude], zoom: Math.min(map.getZoom() + 2, 18) })
        })
      } else {
        el.className = `checkin-map-label${item.key.startsWith('self:') ? ' checkin-map-label--self' : ''}`
        el.textContent = item.label
      }
      const handle = new mapboxgl.Marker(el).setLngLat([item.longitude, item.latitude]).addTo(map)
      markerHandlesRef.current.push(handle)
    }

    if (fitOnMarkers && items.length > 0) {
      const lngs = items.map((item) => item.longitude)
      const lats = items.map((item) => item.latitude)
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 40, maxZoom: 16 },
      )
    }
  }, [markers, ready, mapZoom, fitOnMarkers])

  if (loadError) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400 ${className}`}>
        地图加载失败（签到不受影响）
      </div>
    )
  }

  return <div ref={containerRef} className={`rounded-2xl ${className}`} style={{ minHeight: 280 }} />
}

/** 点位列表 → 直接打点或网格聚合 */
function buildItems(markers: CheckinMapMarker[], mapZoom: number): ClusterItem[] {
  if (markers.length <= CLUSTER_THRESHOLD) {
    return markers.map((marker) => ({
      key: `${marker.variant === 'self' ? 'self' : 'checkin'}:${marker.id}`,
      longitude: marker.longitude,
      latitude: marker.latitude,
      count: 1,
      label: marker.label,
    }))
  }

  // 网格聚合：格宽随 zoom 收窄，约百米级起步
  const gridDeg = 0.5 / Math.pow(2, Math.max(mapZoom - 5, 0))
  const grid = new Map<string, { sumLng: number; sumLat: number; count: number; label: string; self: boolean }>()

  for (const marker of markers) {
    const key = `${Math.round(marker.longitude / gridDeg)}:${Math.round(marker.latitude / gridDeg)}`
    const bucket = grid.get(key)
    if (bucket) {
      bucket.sumLng += marker.longitude
      bucket.sumLat += marker.latitude
      bucket.count += 1
    } else {
      grid.set(key, {
        sumLng: marker.longitude,
        sumLat: marker.latitude,
        count: 1,
        label: marker.label,
        self: marker.variant === 'self',
      })
    }
  }

  // tsconfig target 为 es5，Map 迭代用 forEach 而非 for...of/展开
  const items: ClusterItem[] = []
  grid.forEach((bucket, key) => {
    items.push({
      key: bucket.self ? `self:${key}` : `checkin:${key}`,
      longitude: bucket.sumLng / bucket.count,
      latitude: bucket.sumLat / bucket.count,
      count: bucket.count,
      label: bucket.label,
    })
  })
  return items
}
