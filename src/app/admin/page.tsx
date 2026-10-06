'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, FileCheck, Megaphone, UserPlus, Users } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';

type DashboardStats = {
  members: number;
  activeMembers: number;
  pendingWorks: number;
  ongoingEvents: number;
  posts: number;
  pendingApplications: number;
};

const emptyStats: DashboardStats = {
  members: 0,
  activeMembers: 0,
  pendingWorks: 0,
  ongoingEvents: 0,
  posts: 0,
  pendingApplications: 0,
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<DashboardStats>('/api/admin/dashboard')
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="总成员数" value={stats.members} icon={<Users size={22} />} />
        <StatCard title="活跃成员" value={stats.activeMembers} icon={<UserPlus size={22} />} />
        <StatCard title="待审核作品" value={stats.pendingWorks} icon={<FileCheck size={22} />} />
        <StatCard title="进行中活动" value={stats.ongoingEvents} icon={<Activity size={22} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="内容概览">
          <Metric label="公告总数" value={stats.posts} />
          <Metric label="待处理报名" value={stats.pendingApplications} />
        </Panel>

        <Panel title="快捷操作">
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
            <QuickLink href="/admin/posts" label="发布公告" icon={<Megaphone size={18} />} />
            <QuickLink href="/admin/events" label="创建活动" icon={<Activity size={18} />} />
            <QuickLink href="/admin/works" label="审核作品" icon={<FileCheck size={18} />} />
            <QuickLink href="/admin/applications" label="处理报名" icon={<UserPlus size={18} />} />
            <QuickLink href="/admin/members" label="管理成员" icon={<Users size={18} />} />
          </div>
        </Panel>

        <Panel title="运行状态">
          <div className="space-y-3 text-sm text-gray-300">
            <p>后台已接入 Supabase API。</p>
            <p>如果看到“数据库表还没有创建”，请先执行项目里的 Supabase 初始化 SQL。</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a2e] rounded-2xl p-4 sm:p-5 border border-[#2a2a4a]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-anime-pink">{icon}</div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a2e] rounded-2xl p-4 sm:p-6 border border-[#2a2a4a]">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#2a2a4a] last:border-b-0">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-[#0f0f1a] border border-[#2a2a4a] px-4 py-3 text-gray-300 hover:text-white hover:border-anime-pink/50 transition-colors">
      {icon}
      <span className="truncate text-sm">{label}</span>
    </Link>
  );
}
