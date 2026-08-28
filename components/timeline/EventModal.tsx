'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, MapPin, Save, ScrollText, Trash2, TriangleAlert, Type, X } from 'lucide-react';
import type { HistoricalEvent, Location } from '@/lib/types';

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20';
const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-zinc-300';

interface EventModalProps {
  event?: HistoricalEvent;
  onClose: () => void;
  onSaved: () => void;
}

export function EventModal({ event, onClose, onSaved }: EventModalProps) {
  const [year, setYear] = useState(event ? String(event.year) : '');
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [locationId, setLocationId] = useState(event?.location_id ?? '');
  const [locations, setLocations] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/locations')
      .then((res) => (res.ok ? res.json() : []))
      .then(setLocations);
  }, []);

  async function handleSave() {
    const yearNum = Number(year);
    if (!title.trim() || !year.trim() || Number.isNaN(yearNum)) {
      setError('연도와 제목을 확인해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = { year: yearNum, title, description, location_id: locationId || null };
    const res = await fetch(event ? `/api/events/${event.id}` : '/api/events', {
      method: event ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      setError('저장에 실패했습니다.');
      return;
    }
    onSaved();
  }

  async function handleDelete() {
    if (!event) return;
    if (!confirm('이 사건을 삭제할까요?')) return;
    const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
    if (res.ok) onSaved();
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-surface shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-50">
            <ScrollText className="h-4 w-4 text-gold" strokeWidth={2.25} />
            {event ? '사건 수정' : '사건 추가'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className={labelClass}>
              <CalendarClock className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2.25} />
              연도 <span className="font-normal text-zinc-500">(기원전은 음수)</span>
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              <Type className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2.25} />
              제목
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>
              <MapPin className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2.25} />
              관련 지역
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={`${inputClass} appearance-none`}
            >
              <option value="">관련 없음</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" strokeWidth={2.25} />
              {saving ? '저장 중...' : '저장'}
            </button>
            {event && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                사건 삭제
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
