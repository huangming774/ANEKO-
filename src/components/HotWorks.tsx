'use client';

import { Heart, Eye } from 'lucide-react';

interface Work {
  id: number;
  title: string;
  author: string;
  likes: number;
  category: 'illustration' | 'photography' | 'cosplay' | 'video' | 'craft';
}

interface HotWorksProps {
  works: Work[];
}

const categoryLabels: Record<Work['category'], string> = {
  illustration: '插画',
  photography: '摄影',
  cosplay: 'Cosplay',
  video: '视频',
  craft: '手作',
};

export default function HotWorks({ works }: HotWorksProps) {
  return (
    <section className="py-20 px-4 aurora-bg">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center gradient-text mb-16">
          热门作品
        </h2>
        
        {/* 瀑布流布局 */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {works.map((work) => (
            <div
              key={work.id}
              className="break-inside-avoid bg-white rounded-2xl shadow-lg overflow-hidden card-hover cursor-pointer"
            >
              {/* 图片占位符 */}
              <div className="relative bg-gradient-to-br from-anime-sakura to-anime-purple">
                <div className="aspect-[4/3] flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-5xl mb-3">🎨</div>
                    <span className="text-sm">作品图片</span>
                  </div>
                </div>
                
                {/* 分类标签 */}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-anime-pink">
                    {categoryLabels[work.category]}
                  </span>
                </div>
              </div>
              
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {work.title}
                </h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <span>作者：{work.author}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center text-anime-pink">
                      <Heart size={16} className="mr-1" />
                      <span className="text-sm">{work.likes}</span>
                    </div>
                    
                    <div className="flex items-center text-anime-blue">
                      <Eye size={16} className="mr-1" />
                      <span className="text-sm">查看</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
