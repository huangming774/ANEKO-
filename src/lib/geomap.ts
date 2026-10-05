// 天地图 GeoMap（GeoGlobe MapboxGL SDK）加载与常量。
// SDK 三个静态文件自托管在 public/vendor/geomap/（官网文档亦建议下载使用），
// 运行时按序注入：mapbox-gl.css → mapbox-gl.js → GeoGlobeJS.min.js（后者依赖前者）。

declare global {
  interface Window {
    mapboxgl?: any
    GeoGlobe?: any
  }
}

/** 地图默认中心：广州 [经度, 纬度] */
export const DEFAULT_CENTER: [number, number] = [113.26, 23.13]
export const DEFAULT_ZOOM = 11

/**
 * 天地图瓦片 token。TDTLayer 第二参数就是 token 字符串（非对象），
 * 不传则用 SDK 内置演示 key。生产建议配 NEXT_PUBLIC_TIANDITU_TOKEN
 * （console.tianditu.gov.cn 申请「浏览器端」key）。
 */
export function tdtToken(): string | undefined {
  const token = process.env.NEXT_PUBLIC_TIANDITU_TOKEN?.trim()
  return token || undefined
}

let sdkPromise: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-geomap="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.geomap = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`脚本加载失败: ${src}`))
    document.head.appendChild(script)
  })
}

function loadStyle(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[data-geomap="${href}"]`)) {
      resolve()
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.geomap = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`样式加载失败: ${href}`))
    document.head.appendChild(link)
  })
}

/**
 * 加载 SDK（模块级 promise 单例：StrictMode 双执行共享同一次加载）。
 * 失败重置为 null，允许「重试」后重新加载。
 */
export function loadGeoMapSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('geomap 仅客户端可用'))
  }
  if (window.GeoGlobe && window.mapboxgl) {
    return Promise.resolve()
  }
  if (!sdkPromise) {
    sdkPromise = (async () => {
      await loadStyle('/vendor/geomap/mapbox-gl.css')
      await loadScript('/vendor/geomap/mapbox-gl.js')
      await loadScript('/vendor/geomap/GeoGlobeJS.min.js')
      if (!window.GeoGlobe) {
        throw new Error('GeoGlobe SDK 初始化失败')
      }
    })().catch((error) => {
      sdkPromise = null
      throw error
    })
  }
  return sdkPromise
}
