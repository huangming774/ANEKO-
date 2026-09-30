import './globals.css'

export const metadata = {
  title: 'ANEKO动漫社',
  description: 'ANEKO动漫社官方网站 - 二次元爱好者的聚集地',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
