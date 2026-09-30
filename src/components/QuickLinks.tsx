'use client';

import { Users, Calendar, Image, Heart, Upload } from 'lucide-react';

export interface QuickLinkItem {
  id: number;
  title: string;
  icon: string;
  href: string;
  color: string;
}

interface QuickLinksProps {
  links: QuickLinkItem[];
}

const iconMap: { [key: string]: React.ReactNode } = {
  Users: <Users size={32} />,
  Calendar: <Calendar size={32} />,
  Image: <Image size={32} />,
  Heart: <Heart size={32} />,
  Upload: <Upload size={32} />,
};

export default function QuickLinks({ links }: QuickLinksProps) {
  const allLinks = [
    ...links,
    {
      id: 999,
      title: '上传作品',
      icon: 'Upload',
      href: '/upload',
      color: 'from-anime-pink to-anime-purple',
    },
  ];

  return (
    <section className="py-20 px-4 bg-white/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center gradient-text mb-16">
          快速入口
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {allLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="group flex flex-col items-center"
            >
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${link.color} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-2`}>
                {iconMap[link.icon]}
              </div>
              <span className="mt-4 text-lg font-semibold text-gray-800 group-hover:text-anime-pink transition-colors duration-300">
                {link.title}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
