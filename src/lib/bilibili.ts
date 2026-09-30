// 哔哩哔哩视频信息获取 —— 仅供服务端调用（浏览器直连 api.bilibili.com 有跨域限制）
export type BilibiliVideoInfo = {
  bvid: string
  title: string
  description: string
  cover: string
}

export async function fetchBilibiliVideoInfo(bvid: string): Promise<BilibiliVideoInfo | null> {
  try {
    const response = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://www.bilibili.com/',
        },
        signal: AbortSignal.timeout(5000),
      },
    )

    if (!response.ok) return null

    const json = await response.json()
    if (json?.code !== 0 || !json?.data) return null

    // B 站返回的封面是 http，统一升级为 https，避免 https 站点混合内容
    const cover = String(json.data.pic || '').replace(/^http:\/\//, 'https://')

    return {
      bvid: String(json.data.bvid || bvid),
      title: String(json.data.title || ''),
      description: String(json.data.desc || ''),
      cover,
    }
  } catch {
    return null
  }
}
