'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, Users, X } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import type { EventItem, EventStatus, EventType } from '@/lib/app-types';

const typeLabels: Record<EventType, string> = {
  screening: '观影会',
  cosplay: 'Cosplay',
  exhibition: '画展',
  lecture: '讲座',
  workshop: '工坊',
  competition: '竞赛',
};

const statusLabels: Record<EventStatus, string> = {
  upcoming: '即将开始',
  ongoing: '进行中',
  ended: '已结束',
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeStatus, setActiveStatus] = useState<'all' | EventStatus>('all');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [message, setMessage] = useState('');

  const load = () => {
    apiRequest<EventItem[]>('/api/events')
      .then(setEvents)
      .catch((err) => setMessage(err instanceof Error ? err.message : '加载失败'));
  };

  useEffect(load, []);

  const filteredEvents = useMemo(() => {
    return activeStatus === 'all' ? events : events.filter((event) => event.status === activeStatus);
  }, [activeStatus, events]);

  const register = async (id: string, payload: { name: string; phone: string; qq: string; note: string }) => {
    setMessage('');
    try {
      await apiRequest(`/api/events/${id}/register`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMessage('报名成功');
      setSelectedEvent(null);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '请先登录后再报名');
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      <div className="relative overflow-hidden bg-gradient-to-r from-anime-blue to-anime-purple py-20">
        <div className="relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold font-round mb-4">活动日历</h1>
          <p className="text-xl md:text-2xl opacity-90">精彩活动，不容错过</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {message && <div className="mb-6 rounded-xl bg-white border border-gray-100 px-4 py-3 text-gray-700 shadow">{message}</div>}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 flex flex-wrap gap-2">
          {(['all', 'upcoming', 'ongoing', 'ended'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeStatus === status ? 'bg-gradient-to-r from-anime-pink to-anime-purple text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {status === 'all' ? '全部状态' : statusLabels[status]}
            </button>
          ))}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-lg">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">没有找到活动</h3>
            <p className="text-gray-500">后台创建活动后会显示在这里</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-anime-blue to-anime-purple flex items-center justify-center">
                  {event.image ? <img src={event.image} alt={event.title} className="w-full h-full object-cover" /> : <CalendarDays size={64} className="text-white/70" />}
                  <span className="absolute top-3 left-3 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {typeLabels[event.type]}
                  </span>
                  <span className="absolute top-3 right-3 bg-white/90 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    {statusLabels[event.status]}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{event.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">{event.description || '暂无活动描述'}</p>

                  <div className="space-y-2 mb-4 text-gray-600 text-sm">
                    <div className="flex items-center gap-2"><Clock size={14} />{event.start_date} {event.start_time}-{event.end_time}</div>
                    <div className="flex items-center gap-2"><MapPin size={14} />{event.location || '待定'}</div>
                    <div className="flex items-center gap-2"><Users size={14} />{event.current_participants}/{event.max_participants}人</div>
                  </div>

                  <button
                    disabled={event.status !== 'upcoming'}
                    onClick={() => setSelectedEvent(event)}
                    className="w-full py-3 bg-gradient-to-r from-anime-pink to-anime-purple text-white rounded-xl font-medium disabled:from-gray-400 disabled:to-gray-500"
                  >
                    {event.status === 'upcoming' ? '立即报名' : statusLabels[event.status]}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <RegisterModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSubmit={(payload) => register(selectedEvent.id, payload)}
        />
      )}
    </div>
  );
}

function RegisterModal({
  event,
  onClose,
  onSubmit,
}: {
  event: EventItem;
  onClose: () => void;
  onSubmit: (payload: { name: string; phone: string; qq: string; note: string }) => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', qq: '', note: '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          onSubmit(form);
        }}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">活动报名</h2>
            <p className="mt-1 text-sm text-gray-500">{event.title}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <Input label="姓名" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Input label="手机号码" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <Input label="QQ" value={form.qq} onChange={(value) => setForm({ ...form, qq: value })} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">备注</span>
            <textarea
              value={form.note}
              onChange={(changeEvent) => setForm({ ...form, note: changeEvent.target.value })}
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-anime-pink"
              placeholder="可填写班级、同行人数或其他说明"
            />
          </label>
        </div>

        <button className="mt-6 w-full rounded-xl bg-gradient-to-r from-anime-pink to-anime-purple py-3 font-medium text-white">
          提交报名
        </button>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}{required ? ' *' : ''}</span>
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-anime-pink"
      />
    </label>
  );
}
