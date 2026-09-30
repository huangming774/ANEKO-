'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Image, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import type { Work } from '@/lib/app-types';

const categoryLabels: Record<Work['category'], string> = {
  illustration: '插画',
  photography: '摄影',
  cosplay: 'Cosplay',
  video: '视频',
  craft: '手工',
};

export default function ApprovedWorksSection() {
  const [works, setWorks] = useState<Work[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<Work[]>('/api/works?status=approved')
      .then((data) => setWorks(data.slice(0, 6)))
      .catch((err) => setError(err instanceof Error ? err.message : '加载作品失败'));
  }, []);

  return (
    <section className="py-20 px-4 aurora-bg">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 flex flex-col gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div>
            <h2 className="text-4xl font-bold gradient-text mb-3">热门作品</h2>
            <p className="text-gray-500">后台审核通过的作品会自动显示在这里</p>
          </div>
          <Link href="/upload" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-anime-pink to-anime-purple px-5 py-3 text-sm font-medium text-white shadow-lg">
            <Upload size={16} />
            上传作品
          </Link>
        </div>

        {error && <div className="rounded-2xl bg-white p-6 text-center text-red-500 shadow">{error}</div>}

        {!error && works.length === 0 && (
          <div className="rounded-3xl bg-white p-12 text-center shadow-lg">
            <Image size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-800">暂无已通过作品</h3>
            <p className="mt-2 text-sm text-gray-500">上传作品并在后台审核通过后，会显示在首页。</p>
          </div>
        )}

        {works.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
              <article key={work.id} className="overflow-hidden rounded-2xl bg-white shadow-lg">
                <div className="relative h-56 bg-gradient-to-br from-anime-sakura to-anime-purple">
                  {work.image ? (
                    <img src={work.image} alt={work.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl text-white">🎨</div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-anime-pink">
                    {categoryLabels[work.category]}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="mb-2 text-lg font-bold text-gray-800">{work.title}</h3>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-500">{work.description || '暂无作品描述'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{new Date(work.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-anime-pink">
                      <Heart size={16} />
                      <span className="text-sm">{work.likes}</span>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
