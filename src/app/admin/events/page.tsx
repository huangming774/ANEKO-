'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import type { EventApplication, EventItem } from '@/lib/app-types';

const eventTypes = [
  ['screening', '观影会'],
  ['cosplay', 'Cosplay'],
  ['exhibition', '画展'],
  ['lecture', '讲座'],
  ['workshop', '工坊'],
  ['competition', '竞赛'],
] as const;

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [applications, setApplications] = useState<Record<string, EventApplication[]>>({});
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    start_time: '14:00',
    end_time: '18:00',
    location: '',
    type: 'screening',
    max_participants: 50,
    description: '',
  });

  const load = () => {
    apiRequest<EventItem[]>('/api/events')
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  };

  useEffect(load, []);

  const filtered = useMemo(() => status === 'all' ? events : events.filter((event) => event.status === status), [events, status]);

  const createEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      await apiRequest('/api/events', { method: 'POST', body: JSON.stringify(form) });
      setForm({ ...form, title: '', location: '', description: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const patchEvent = async (id: string, patch: Partial<EventItem>) => {
    await apiRequest(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    load();
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm('确定删除这个活动吗？')) return;
    await apiRequest(`/api/events/${id}`, { method: 'DELETE' });
    load();
  };

  const loadApplications = async (eventId: string) => {
    if (openEventId === eventId) {
      setOpenEventId(null);
      return;
    }

    setOpenEventId(eventId);
    try {
      const data = await apiRequest<EventApplication[]>(`/api/events/${eventId}/applications`);
      setApplications((current) => ({ ...current, [eventId]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载报名失败');
    }
  };

  const updateApplication = async (eventId: string, applicationId: string, status: EventApplication['status']) => {
    try {
      await apiRequest(`/api/event-applications/${applicationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const data = await apiRequest<EventApplication[]>(`/api/events/${eventId}/applications`);
      setApplications((current) => ({ ...current, [eventId]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新报名失败');
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-200">{error}</div>}

      <form onSubmit={createEvent} className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="活动标题" className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white text-sm" />
        <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: e.target.value })} className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white text-sm" />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="活动地点" className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white text-sm" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white text-sm">
          {eventTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="活动描述" className="md:col-span-2 xl:col-span-3 bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white text-sm resize-none" rows={3} />
        <button className="px-5 py-3 bg-gradient-to-r from-anime-pink to-anime-purple rounded-xl text-white text-sm font-medium">创建活动</button>
      </form>

      <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-4 flex flex-wrap gap-2">
        {['all', 'upcoming', 'ongoing', 'ended'].map((item) => (
          <button key={item} onClick={() => setStatus(item)} className={`px-4 py-2 rounded-xl text-sm ${status === item ? 'bg-anime-pink text-white' : 'bg-[#2a2a4a] text-gray-400'}`}>
            {item === 'all' ? '全部' : item === 'upcoming' ? '即将开始' : item === 'ongoing' ? '进行中' : '已结束'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl py-16 text-center text-gray-500">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
          <p>暂无活动</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((event) => (
            <div key={event.id} className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-5 space-y-3 min-w-0">
              <h3 className="text-white font-semibold truncate">{event.title}</h3>
              <p className="text-gray-400 text-sm break-words">{event.start_date} {event.start_time} · {event.location}</p>
              <p className="text-gray-500 text-sm line-clamp-2">{event.description || '暂无描述'}</p>
              <div className="flex items-center justify-between">
                <select value={event.status} onChange={(e) => patchEvent(event.id, { status: e.target.value as EventItem['status'] })} className="bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-3 py-2.5 text-sm text-white">
                  <option value="upcoming">即将开始</option>
                  <option value="ongoing">进行中</option>
                  <option value="ended">已结束</option>
                </select>
                <button onClick={() => deleteEvent(event.id)} className="p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-[#2a2a4a] text-gray-400 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => loadApplications(event.id)}
                className="w-full rounded-xl border border-[#2a2a4a] px-4 py-2 text-sm text-gray-300 hover:border-anime-pink/50 hover:text-white"
              >
                {openEventId === event.id ? '收起报名名单' : `查看报名名单${applications[event.id]?.length ? `（${applications[event.id].length}）` : ''}`}
              </button>
              {openEventId === event.id && (
                <div className="space-y-2 rounded-xl bg-[#0f0f1a] p-3">
                  {(applications[event.id] || []).length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">暂无报名</p>
                  ) : (
                    applications[event.id].map((application) => (
                      <div key={application.id} className="rounded-lg border border-[#2a2a4a] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-white">{application.name}</div>
                            <div className="mt-1 text-xs text-gray-400 break-all">
                              手机：{application.phone || '-'} · QQ：{application.qq || '-'}
                            </div>
                            {application.note && <div className="mt-1 text-xs text-gray-500">{application.note}</div>}
                          </div>
                          <span className="rounded-full bg-[#2a2a4a] px-2 py-1 text-xs text-gray-300">
                            {application.status === 'pending' ? '待处理' : application.status === 'approved' ? '已通过' : '已拒绝'}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => updateApplication(event.id, application.id, 'approved')} className="flex-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-400">
                            通过
                          </button>
                          <button onClick={() => updateApplication(event.id, application.id, 'rejected')} className="flex-1 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-400">
                            拒绝
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
