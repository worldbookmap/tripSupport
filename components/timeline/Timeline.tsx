'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { HistoricalEvent } from '@/lib/types';
import { EventModal } from './EventModal';

export function Timeline() {
  const searchParams = useSearchParams();
  const highlightLocationId = searchParams.get('locationId');

  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<{ event?: HistoricalEvent } | null>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  async function load() {
    const res = await fetch('/api/events' + (search ? `?q=${encodeURIComponent(search)}` : ''));
    if (res.ok) setEvents(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!highlightLocationId) return;
    const target = events.find((e) => e.location_id === highlightLocationId);
    if (target) {
      itemRefs.current.get(target.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightLocationId, events]);

  async function handleDelete(id: string) {
    if (!confirm('이 사건을 삭제할까요?')) return;
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-6">
      <div className="mb-4 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="연도, 제목, 설명 검색"
          className="flex-1 rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-black"
        />
        <button
          onClick={() => setModalState({})}
          className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background"
        >
          사건 추가
        </button>
      </div>

      {highlightLocationId && (
        <p className="mb-4 text-xs text-zinc-500">지도에서 선택한 지역과 관련된 사건이 강조 표시됩니다.</p>
      )}

      <ol className="space-y-3 border-l border-black/10 pl-4 dark:border-white/10">
        {events.map((event) => {
          const highlighted = highlightLocationId != null && event.location_id === highlightLocationId;
          return (
            <li
              key={event.id}
              ref={(el) => {
                if (el) itemRefs.current.set(event.id, el);
                else itemRefs.current.delete(event.id);
              }}
              className={`rounded-lg border p-3 ${
                highlighted ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-black/10 dark:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-zinc-500">{event.year}년</p>
                  <p className="font-medium">{event.title}</p>
                  {event.description && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                      {event.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setModalState({ event })}
                    className="rounded border border-black/20 px-2 py-1 text-xs dark:border-white/20"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-500"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          );
        })}
        {events.length === 0 && <p className="text-sm text-zinc-500">등록된 사건이 없습니다.</p>}
      </ol>

      {modalState && (
        <EventModal
          event={modalState.event}
          onClose={() => setModalState(null)}
          onSaved={() => {
            setModalState(null);
            load();
          }}
        />
      )}
    </div>
  );
}
