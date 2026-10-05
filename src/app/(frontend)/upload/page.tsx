'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import { uploadImageFile } from '@/lib/client-upload';
import type { WorkCategory } from '@/lib/app-types';

const categories: Array<{ value: WorkCategory; label: string }> = [
  { value: 'illustration', label: '插画' },
  { value: 'photography', label: '摄影' },
  { value: 'cosplay', label: 'Cosplay' },
  { value: 'video', label: '视频' },
  { value: 'craft', label: '手工' },
];

export default function UploadWorkPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const uploadImage = async (file: File) => {
    setError('');
    setUploadingImage(true);

    try {
      setImageUrl(await uploadImageFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
          await apiRequest('/api/works', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.get('title'),
          image: imageUrl,
          category: formData.get('category'),
          description: formData.get('description'),
          story: formData.get('story'),
        }),
      });
      event.currentTarget.reset();
      setImageUrl('');
      setMessage('作品已提交，等待后台审核通过后会显示在首页和作品展示页。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-anime-pink/10 via-white to-anime-purple/10 px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/gallery" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-anime-pink">
          <ArrowLeft size={16} />
          返回作品展示
        </Link>

        <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-anime-pink to-anime-purple text-white">
              <Upload size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">上传作品</h1>
              <p className="text-sm text-gray-500">提交后进入后台审核，通过后公开展示</p>
            </div>
          </div>

          {message && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error === '请先登录' ? (
                <>
                  请先 <Link href="/login?next=/upload" className="font-semibold underline">登录</Link> 后再上传作品。
                </>
              ) : error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <Field name="title" label="作品标题" required placeholder="请输入作品标题" />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">作品图片</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadImage(file);
                }}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-anime-pink"
              />
              <span className="mt-2 block text-xs text-gray-500">支持 JPG、PNG、WebP、GIF，最大 8MB。</span>
            </label>

            {uploadingImage && <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">图片上传中...</div>}
            {imageUrl && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                <img src={imageUrl} alt="作品预览" className="max-h-72 w-full object-contain" />
                <div className="break-all px-4 py-3 text-xs text-gray-500">{imageUrl}</div>
              </div>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">作品分类</span>
              <select name="category" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-anime-pink">
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <Textarea name="description" label="作品描述" placeholder="简单介绍作品内容" />
            <Textarea name="story" label="创作故事" placeholder="可填写灵感来源、制作过程等" />

            <button
              disabled={loading || uploadingImage}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple py-3 font-medium text-white disabled:opacity-60"
            >
              <Send size={18} />
              {loading ? '提交中...' : '提交审核'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ name, label, placeholder, required = false }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}{required ? ' *' : ''}</span>
      <input name={name} required={required} placeholder={placeholder} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-anime-pink" />
    </label>
  );
}

function Textarea({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      <textarea name={name} placeholder={placeholder} rows={4} className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-anime-pink" />
    </label>
  );
}
