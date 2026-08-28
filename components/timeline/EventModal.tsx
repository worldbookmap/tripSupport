'use client';

import { useEffect, useState } from 'react';
import type { HistoricalEvent, Location } from '@/lib/types';

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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{event ? '사건 수정' : '사건 추가'}</h2>
          <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            닫기
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">연도 (기원전은 음수)</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">관련 지역</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
            >
              <option value="">관련 없음</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            {event && (
              <button
                onClick={handleDelete}
                className="rounded border border-red-400 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              >
                사건 삭제
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
