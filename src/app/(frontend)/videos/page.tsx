'use client';

import { useEffect, useState } from 'react';
import { Calendar, ExternalLink, Play, X } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import type { Video } from '@/lib/app-types';
import { bilibiliPlayerUrl, bilibiliWatchUrl } from '@/lib/video';

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    apiRequest<Video[]>('/api/videos')
      .then(setVideos)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  };

  useEffect(load, []);

  return (
    <div className="min-h-screen dot-bg">
      <div className="relative overflow-hidden bg-gradient-to-r from-anime-purple to-anime-blue py-20">
        <div className="relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold font-round mb-4">视频</h1>
          <p className="text-xl md:text-2xl opacity-90">社团视频与精彩回顾</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-600">{error}</div>}

        {videos.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center text-gray-500 shadow-lg">
            暂无视频
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <article
                key={video.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden transition hover:-translate-y-1 hover:shadow-xl"
              >
                <button type="button" onClick={() => setSelected(video)} className="block w-full text-left">
                  <div className="relative aspect-video bg-gray-100">
                    {video.cover ? (
                      <img src={video.cover} alt={video.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-6xl">🎬</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity hover:opacity-100">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-anime-purple">
                        <Play size={24} className="ml-1" fill="currentColor" />
                      </span>
                    </div>
                    <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                      {video.source_type === 'bilibili' ? 'B站' : '视频'}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 line-clamp-1">{video.title}</h3>
                    <p className="mt-2 text-gray-600 text-sm line-clamp-2">{video.description || '暂无描述'}</p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {selected && <VideoDetailModal video={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function VideoDetailModal({ video, onClose }: { video: Video; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white"
        >
          <X size={20} />
        </button>

        {video.source_type === 'upload' ? (
          <video
            controls
            preload="metadata"
            poster={video.cover || undefined}
            src={video.source_url}
            className="aspect-video w-full rounded-t-3xl bg-black"
          />
        ) : (
          <iframe
            src={bilibiliPlayerUrl(video.bilibili_bvid)}
            className="aspect-video w-full rounded-t-3xl bg-black"
            allowFullScreen
            allow="fullscreen"
            scrolling="no"
            title={video.title}
          />
        )}

        <div className="p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{video.title}</h2>
            <span className="rounded-full bg-anime-pink/10 px-3 py-1 text-xs font-semibold text-anime-pink">
              {video.source_type === 'bilibili' ? '哔哩哔哩' : '视频'}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={14} />
            <span>{new Date(video.created_at).toLocaleDateString()}</span>
          </div>

          {video.description && (
            <p className="mt-4 whitespace-pre-wrap text-gray-600">{video.description}</p>
          )}

          {video.source_type === 'bilibili' && (
            <a
              href={bilibiliWatchUrl(video.bilibili_bvid)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FB7299]/10 px-4 py-2 font-medium text-[#FB7299] hover:bg-[#FB7299]/20"
            >
              <ExternalLink size={18} />
              在哔哩哔哩打开
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
