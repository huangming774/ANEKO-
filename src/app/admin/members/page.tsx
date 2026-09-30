'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Shield, Users } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import type { Profile } from '@/lib/app-types';

export default function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiRequest<Profile[]>('/api/members')
      .then(setMembers)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    return members.filter((member) => {
      const text = `${member.display_name} ${member.email}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [members, search]);

  const updateMember = async (id: string, patch: Partial<Profile>) => {
    setError('');
    try {
      await apiRequest(`/api/members/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-200">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="总成员数" value={members.length} />
        <Stat label="管理员" value={members.filter((m) => m.role === 'admin').length} />
        <Stat label="活跃成员" value={members.filter((m) => m.status === 'active').length} />
      </div>

      <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索成员名称或邮箱..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-anime-pink"
          />
        </div>
      </div>

      <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[56px_1fr_1.4fr_160px_160px] gap-4 px-6 py-3 border-b border-[#2a2a4a] text-gray-400 text-xs">
          <span></span>
          <span>成员</span>
          <span>邮箱</span>
          <span>角色</span>
          <span>状态</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-500">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p>没有成员数据</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a4a]">
            {filtered.map((member) => (
              <div key={member.id} className="grid grid-cols-1 md:grid-cols-[56px_1fr_1.4fr_160px_160px] gap-3 md:gap-4 px-6 py-4 items-center">
                <span className="text-2xl hidden md:block">{member.avatar || '🐱'}</span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl md:hidden">{member.avatar || '🐱'}</span>
                  <span className="text-white font-medium text-sm">{member.display_name || '未命名成员'}</span>
                </div>
                <span className="text-gray-400 text-sm truncate">{member.email}</span>
                <select
                  value={member.role}
                  onChange={(event) => updateMember(member.id, { role: event.target.value as Profile['role'] })}
                  className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="member">成员</option>
                  <option value="admin">管理员</option>
                </select>
                <select
                  value={member.status}
                  onChange={(event) => updateMember(member.id, { status: event.target.value as Profile['status'] })}
                  className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="active">活跃</option>
                  <option value="inactive">禁用</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-anime-pink to-anime-purple flex items-center justify-center text-white">
        <Shield size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-400 text-sm">{label}</p>
      </div>
    </div>
  );
}
