import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Decorations from '@/components/Decorations';

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Decorations />
      <main>{children}</main>
      <Footer />
    </>
  );
}
