'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarClock, MapPin, Pencil, Plus, ScrollText, Search, Trash2 } from 'lucide-react';
import type { HistoricalEvent, Location } from '@/lib/types';
import { REGION_COLORS, REGIONS, type Region } from '@/lib/regions';
import { EventModal } from './EventModal';

export function Timeline() {
  const searchParams = useSearchParams();
  const highlightLocationId = searchParams.get('locationId');

  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
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
    fetch('/api/locations')
      .then((res) => (res.ok ? res.json() : []))
      .then(setLocations);
  }, []);

  useEffect(() => {
    if (!highlightLocationId) return;
    const target = events.find((e) => e.location_id === highlightLocationId);
    if (target) {
      itemRefs.current.get(target.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightLocationId, events]);

  const regionOf = useMemo(() => {
    const map = new Map<string, Region>(locations.map((loc) => [loc.id, loc.region ?? '기타']));
    return (event: HistoricalEvent): Region => (event.location_id && map.get(event.location_id)) || '기타';
  }, [locations]);

  const groups = useMemo(() => {
    const byRegion = new Map<Region, HistoricalEvent[]>();
    for (const event of events) {
      const region = regionOf(event);
      const list = byRegion.get(region) ?? [];
      list.push(event);
      byRegion.set(region, list);
    }
    return REGIONS.map((region) => ({ region, events: byRegion.get(region) ?? [] })).filter(
      (g) => g.events.length > 0
    );
  }, [events, regionOf]);

  async function handleDelete(id: string) {
    if (!confirm('이 사건을 삭제할까요?')) return;
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={2.25} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="연도, 제목, 설명 검색"
            className="w-full rounded-xl border border-white/[0.08] bg-surface py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <button
          onClick={() => setModalState({})}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          사건 추가
        </button>
      </div>

      {highlightLocationId && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-gold/20 bg-gold/[0.06] px-3.5 py-2.5 text-[13px] text-gold">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          지도에서 선택한 지역과 관련된 사건이 강조 표시됩니다.
        </div>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/[0.08] py-16 text-center">
          <ScrollText className="h-8 w-8 text-zinc-700" strokeWidth={1.5} />
          <p className="text-sm text-zinc-500">등록된 사건이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ region, events: regionEvents }) => {
            const colors = REGION_COLORS[region];
            return (
              <section key={region}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold"
                    style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.dot }} />
                    {region}
                  </span>
                  <span className="text-[11px] text-zinc-600">{regionEvents.length}건</span>
                </div>

                <ol className="relative space-y-4 border-l pl-7" style={{ borderColor: colors.border }}>
                  {regionEvents.map((event) => {
                    const highlighted = highlightLocationId != null && event.location_id === highlightLocationId;
                    return (
                      <li
                        key={event.id}
                        ref={(el) => {
                          if (el) itemRefs.current.set(event.id, el);
                          else itemRefs.current.delete(event.id);
                        }}
                        className="relative"
                      >
                        <span
                          className="absolute -left-[34px] top-4 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-background"
                          style={{
                            background: highlighted ? '#d4b06a' : colors.dot,
                            boxShadow: highlighted ? '0 0 12px 1px rgba(212,176,106,0.6)' : undefined,
                          }}
                        />
                        <div
                          className="rounded-2xl border p-4 transition-colors"
                          style={
                            highlighted
                              ? { borderColor: 'rgba(212,176,106,0.3)', background: 'rgba(212,176,106,0.05)' }
                              : { borderColor: colors.border, background: colors.bg }
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                <CalendarClock className="h-3 w-3" strokeWidth={2.25} />
                                {event.year}년
                              </p>
                              <p className="mt-1 text-[15px] font-semibold text-zinc-50">{event.title}</p>
                              {event.description && (
                                <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-400">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                onClick={() => setModalState({ event })}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
                              >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </button>
                              <button
                                onClick={() => handleDelete(event.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}

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
