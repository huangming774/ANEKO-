import HeroBanner from '@/components/HeroBanner';
import HomeClubInfo from '@/components/HomeClubInfo';
import QuickLinks from '@/components/QuickLinks';
import LatestNews from '@/components/LatestNews';
import ApprovedWorksSection from '@/components/ApprovedWorksSection';
import type { QuickLinkItem } from '@/components/QuickLinks';

const quickLinks: QuickLinkItem[] = [
  {
    id: 1,
    title: '社团介绍',
    icon: 'Users',
    href: '/about',
    color: 'from-anime-pink to-anime-purple',
  },
  {
    id: 2,
    title: '活动日历',
    icon: 'Calendar',
    href: '/events',
    color: 'from-anime-blue to-anime-purple',
  },
  {
    id: 3,
    title: '作品展示',
    icon: 'Image',
    href: '/gallery',
    color: 'from-anime-sakura to-anime-pink',
  },
  {
    id: 4,
    title: '加入我们',
    icon: 'Heart',
    href: '/join',
    color: 'from-anime-purple to-anime-blue',
  },
];

export default function Home() {
  return (
    <>
      <HeroBanner />
      <HomeClubInfo />
      <QuickLinks links={quickLinks} />
      <LatestNews />
      <ApprovedWorksSection />
    </>
  );
}
