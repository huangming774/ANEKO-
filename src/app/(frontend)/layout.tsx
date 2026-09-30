import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Decorations from '@/components/Decorations';

const socialLinks = [
  { name: '微博', icon: 'Globe', href: '#' },
  { name: 'B站', icon: 'Play', href: '#' },
  { name: 'QQ群', icon: 'MessageCircle', href: '#' },
  { name: '微信公众号', icon: 'Smartphone', href: '#' },
]

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Decorations />
      <main>{children}</main>
      <Footer socialLinks={socialLinks} />
    </>
  );
}
