'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Heart, Upload, X } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import type { Work, WorkCategory } from '@/lib/app-types';

const categories: Array<{ id: 'all' | WorkCategory; name: string; icon: string }> = [
  { id: 'all', name: '全部', icon: '🎨' },
  { id: 'illustration', name: '插画', icon: '🖌️' },
  { id: 'photography', name: '摄影', icon: '📷' },
  { id: 'cosplay', name: 'Cosplay', icon: '👗' },
  { id: 'video', name: '视频', icon: '🎬' },
  { id: 'craft', name: '手工', icon: '🎭' },
];

export default function GalleryPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | WorkCategory>('all');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    apiRequest<Work[]>('/api/works?status=approved')
      .then(setWorks)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  };

  useEffect(load, []);

  const filteredWorks = useMemo(() => {
    return activeCategory === 'all' ? works : works.filter((work) => work.category === activeCategory);
  }, [activeCategory, works]);

  const like = async (id: string) => {
    try {
      await apiRequest(`/api/works/${id}/like`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '请先登录后再点赞');
    }
  };

  return (
    <div className="min-h-screen dot-bg">
      <div className="relative overflow-hidden bg-gradient-to-r from-anime-purple to-anime-blue py-20">
        <div className="relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold font-round mb-4">作品展示</h1>
          <p className="text-xl md:text-2xl opacity-90">展示社团成员的精彩创作</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-600">{error}</div>}

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === category.id ? 'bg-gradient-to-r from-anime-pink to-anime-purple text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'}`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>

          <Link href="/upload" className="px-4 py-2 bg-gradient-to-r from-anime-pink to-anime-purple text-white rounded-lg flex items-center gap-2 shadow-lg">
            <Upload size={18} />
            上传作品
          </Link>
        </div>

        {filteredWorks.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center text-gray-500 shadow-lg">
            暂无已通过作品
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredWorks.map((work) => (
              <article key={work.id} className="bg-white rounded-2xl shadow-lg overflow-hidden transition hover:-translate-y-1 hover:shadow-xl">
                <button type="button" onClick={() => setSelectedWork(work)} className="block w-full text-left">
                <div className="h-56 bg-gray-100">
                  {work.image ? <img src={work.image} alt={work.title} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-5xl">🎨</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800 line-clamp-1">{work.title}</h3>
                    <span className="text-xs bg-anime-pink/10 text-anime-pink px-2 py-1 rounded-full">
                      {categories.find((item) => item.id === work.category)?.name}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">{work.description || '暂无描述'}</p>
                </div>
                </button>
                <div className="px-4 pb-4">
                  <button onClick={() => like(work.id)} className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
                    <Heart size={16} />
                    <span className="text-sm">{work.likes}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedWork && (
        <WorkDetailModal
          work={selectedWork}
          onClose={() => setSelectedWork(null)}
          onLike={() => like(selectedWork.id)}
        />
      )}
    </div>
  );
}

function WorkDetailModal({ work, onClose, onLike }: { work: Work; onClose: () => void; onLike: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-h-[320px] bg-gray-100">
            {work.image ? (
              <img src={work.image} alt={work.title} className="h-full max-h-[78vh] w-full object-contain bg-gray-100" />
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center text-7xl">🎨</div>
            )}
          </div>

          <div className="p-6 lg:p-8">
            <span className="rounded-full bg-anime-pink/10 px-3 py-1 text-xs font-semibold text-anime-pink">
              {categories.find((item) => item.id === work.category)?.name}
            </span>

            <h2 className="mt-4 text-3xl font-bold text-gray-900">{work.title}</h2>

            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={14} />
              <span>{new Date(work.created_at).toLocaleDateString()}</span>
            </div>

            <section className="mt-6">
              <h3 className="mb-2 font-bold text-gray-800">作品描述</h3>
              <p className="whitespace-pre-wrap text-gray-600">{work.description || '暂无描述'}</p>
            </section>

            {work.story && (
              <section className="mt-6 rounded-2xl bg-gray-50 p-4">
                <h3 className="mb-2 font-bold text-gray-800">创作故事</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{work.story}</p>
              </section>
            )}

            <div className="mt-8 flex items-center gap-4 border-t border-gray-100 pt-5">
              <button onClick={onLike} className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 font-medium text-red-500 hover:bg-red-100">
                <Heart size={18} />
                {work.likes}
              </button>
              <Link href="/upload" className="rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple px-4 py-2 font-medium text-white">
                上传我的作品
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
