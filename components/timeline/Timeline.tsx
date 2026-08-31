'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarClock,
  GanttChart,
  List,
  MapPin,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { HistoricalEvent, Location } from '@/lib/types';
import { REGION_COLORS, REGIONS, type Region } from '@/lib/regions';
import { EventModal } from './EventModal';

const UNCLASSIFIED_CONTINENT = '미분류';
const UNCLASSIFIED_COUNTRY = '국가 미입력';
const NO_LOCATION_COUNTRY = '위치 없음';

const LABEL_W = 168;
const ROW_H = 30;
const LANE_PAD = 10;
const MIN_GAP_PX = 132;

type ViewMode = 'vertical' | 'horizontal';

interface Lane {
  country: string;
  events: HistoricalEvent[];
}
interface ContinentGroup {
  continent: string;
  colors: (typeof REGION_COLORS)[Region] | typeof NEUTRAL_COLORS;
  lanes: Lane[];
}

const NEUTRAL_COLORS = { text: '#a1a1aa', bg: 'rgba(161,161,170,0.08)', border: 'rgba(161,161,170,0.22)', dot: '#71717a' };

function niceStep(range: number, targetTicks = 9) {
  const raw = Math.max(range, 1) / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  let step = 1;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
}

function formatYear(year: number) {
  return year < 0 ? `기원전 ${-year}` : `${year}`;
}

export function Timeline() {
  const searchParams = useSearchParams();
  const highlightLocationId = searchParams.get('locationId');

  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<{ event?: HistoricalEvent } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<ViewMode>('vertical');
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

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

  const locationById = useMemo(() => new Map(locations.map((loc) => [loc.id, loc])), [locations]);

  const laneKeyOf = useMemo(
    () => (event: HistoricalEvent) => {
      const loc = event.location_id ? locationById.get(event.location_id) : undefined;
      if (!loc) return { continent: UNCLASSIFIED_CONTINENT, country: NO_LOCATION_COUNTRY };
      return { continent: loc.region || '기타', country: loc.country?.trim() || UNCLASSIFIED_COUNTRY };
    },
    [locationById]
  );

  const groups: ContinentGroup[] = useMemo(() => {
    const byContinent = new Map<string, Map<string, HistoricalEvent[]>>();
    for (const event of events) {
      const { continent, country } = laneKeyOf(event);
      const byCountry = byContinent.get(continent) ?? new Map<string, HistoricalEvent[]>();
      const list = byCountry.get(country) ?? [];
      list.push(event);
      byCountry.set(country, list);
      byContinent.set(continent, byCountry);
    }

    const continentOrder = [...REGIONS, UNCLASSIFIED_CONTINENT];
    const result: ContinentGroup[] = [];
    for (const continent of continentOrder) {
      const byCountry = byContinent.get(continent);
      if (!byCountry) continue;
      const countries = Array.from(byCountry.keys()).sort((a, b) => {
        if (a === UNCLASSIFIED_COUNTRY || a === NO_LOCATION_COUNTRY) return 1;
        if (b === UNCLASSIFIED_COUNTRY || b === NO_LOCATION_COUNTRY) return -1;
        return a.localeCompare(b, 'ko');
      });
      result.push({
        continent,
        colors: continent === UNCLASSIFIED_CONTINENT ? NEUTRAL_COLORS : REGION_COLORS[continent as Region],
        lanes: countries.map((country) => ({
          country,
          events: (byCountry.get(country) ?? []).slice().sort((a, b) => a.year - b.year),
        })),
      });
    }
    return result;
  }, [events, laneKeyOf]);

  // 세로 보기: 같은 대륙 그룹을 연도순 단일 목록으로 펼칩니다.
  const verticalGroups = useMemo(
    () =>
      groups.map((g) => ({
        continent: g.continent,
        colors: g.colors,
        events: g.lanes.flatMap((lane) => lane.events).sort((a, b) => a.year - b.year),
      })),
    [groups]
  );

  const { domainMin, domainMax, pxPerYear, ticks } = useMemo(() => {
    if (events.length === 0) {
      return { domainMin: 0, domainMax: 1, pxPerYear: 1, ticks: [] as number[] };
    }
    const years = events.map((e) => e.year);
    const rawMin = Math.min(...years);
    const rawMax = Math.max(...years);
    const range = Math.max(rawMax - rawMin, 10);
    const pad = Math.max(5, Math.round(range * 0.06));
    const dMin = rawMin - pad;
    const dMax = rawMax + pad;
    const domainRange = dMax - dMin;
    const basePx = Math.min(60, Math.max(1.5, 1400 / domainRange));
    const px = basePx * zoom;
    const step = niceStep(domainRange);
    const tickList: number[] = [];
    for (let t = Math.ceil(dMin / step) * step; t <= dMax; t += step) tickList.push(Math.round(t));
    return { domainMin: dMin, domainMax: dMax, pxPerYear: px, ticks: tickList };
  }, [events, zoom]);

  const timelineWidth = Math.max(1, (domainMax - domainMin) * pxPerYear);
  const xOf = (year: number) => (year - domainMin) * pxPerYear;

  useEffect(() => {
    if (!highlightLocationId) return;
    const target = events.find((e) => e.location_id === highlightLocationId);
    if (target) {
      itemRefs.current.get(target.id)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [highlightLocationId, events, pxPerYear, view]);

  async function handleDelete(id: string) {
    if (!confirm('이 사건을 삭제할까요?')) return;
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  return (
    <div className="flex-1 px-3 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto mb-6 flex max-w-3xl items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={2.25} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="연도, 제목, 설명 검색"
            className="w-full rounded-xl border border-white/[0.08] bg-surface py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-white/[0.08] bg-surface p-1">
          <button
            onClick={() => setView('vertical')}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              view === 'vertical' ? 'bg-accent/20 text-accent-strong' : 'text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100'
            }`}
            title="세로 보기 (연도순 목록)"
          >
            <List className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button
            onClick={() => setView('horizontal')}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              view === 'horizontal' ? 'bg-accent/20 text-accent-strong' : 'text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100'
            }`}
            title="가로 보기 (지역별 스윔레인)"
          >
            <GanttChart className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
        {view === 'horizontal' && (
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-white/[0.08] bg-surface p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, +(z / 1.5).toFixed(3)))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
              title="축소"
            >
              <ZoomOut className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(8, +(z * 1.5).toFixed(3)))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
              title="확대"
            >
              <ZoomIn className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        )}
        <button
          onClick={() => setModalState({})}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          사건 추가
        </button>
      </div>

      {highlightLocationId && (
        <div className="mx-auto mb-5 flex max-w-3xl items-center gap-2 rounded-xl border border-gold/20 bg-gold/[0.06] px-3.5 py-2.5 text-[13px] text-gold">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          지도에서 선택한 지역과 관련된 사건이 강조 표시됩니다.
        </div>
      )}

      {events.length === 0 ? (
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-dashed border-white/[0.08] py-16 text-center">
          <ScrollText className="h-8 w-8 text-zinc-700" strokeWidth={1.5} />
          <p className="text-sm text-zinc-500">등록된 사건이 없습니다.</p>
        </div>
      ) : view === 'vertical' ? (
        <div className="mx-auto max-w-3xl space-y-8">
          {verticalGroups.map(({ continent, colors, events: continentEvents }) => (
            <section key={continent}>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold"
                  style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.dot }} />
                  {continent}
                </span>
                <span className="text-[11px] text-zinc-600">{continentEvents.length}건</span>
              </div>

              <ol className="relative space-y-4 border-l pl-7" style={{ borderColor: colors.border }}>
                {continentEvents.map((event) => {
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
                              {formatYear(event.year)}년
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
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/10">
          <div style={{ minWidth: LABEL_W + timelineWidth }}>
            {/* 연도 축 */}
            <div className="sticky top-0 z-20 flex bg-surface">
              <div className="sticky left-0 z-30 shrink-0 border-b border-r border-white/[0.06] bg-surface" style={{ width: LABEL_W }} />
              <div className="relative h-9 shrink-0 border-b border-white/[0.06]" style={{ width: timelineWidth }}>
                {ticks.map((tick) => (
                  <div key={tick} className="absolute top-0 h-full border-l border-white/[0.06]" style={{ left: xOf(tick) }}>
                    <span className="absolute top-1.5 left-1.5 whitespace-nowrap text-[11px] text-zinc-500">
                      {formatYear(tick)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {groups.map((group) => (
              <div key={group.continent}>
                {/* 대륙 헤더 */}
                <div className="flex">
                  <div
                    className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-b border-r border-white/[0.06] px-3 py-1.5"
                    style={{ width: LABEL_W, background: 'rgba(255,255,255,0.03)' }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: group.colors.dot }} />
                    <span className="truncate text-[12px] font-semibold" style={{ color: group.colors.text }}>
                      {group.continent}
                    </span>
                  </div>
                  <div className="relative shrink-0 border-b border-white/[0.06]" style={{ width: timelineWidth, background: 'rgba(255,255,255,0.03)' }}>
                    {ticks.map((tick) => (
                      <div key={tick} className="absolute top-0 h-full border-l border-white/[0.04]" style={{ left: xOf(tick) }} />
                    ))}
                  </div>
                </div>

                {group.lanes.map((lane) => {
                  const positioned = lane.events.map((e) => ({ event: e, x: xOf(e.year) }));
                  const lastXPerLevel: number[] = [];
                  const levelOf = new Map<string, number>();
                  for (const { event, x } of positioned) {
                    let level = lastXPerLevel.findIndex((lx) => x - lx >= MIN_GAP_PX);
                    if (level === -1) level = lastXPerLevel.length;
                    lastXPerLevel[level] = x;
                    levelOf.set(event.id, level);
                  }
                  const levels = Math.max(1, lastXPerLevel.length);
                  const laneHeight = levels * ROW_H + LANE_PAD * 2;

                  return (
                    <div key={lane.country} className="flex">
                      <div
                        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-0.5 border-b border-r border-white/[0.06] bg-surface px-3 py-1.5"
                        style={{ width: LABEL_W, height: laneHeight }}
                      >
                        <span className="truncate text-[12.5px] font-medium text-zinc-300">{lane.country}</span>
                        <span className="text-[10.5px] text-zinc-600">{lane.events.length}건</span>
                      </div>
                      <div className="relative shrink-0 border-b border-white/[0.06]" style={{ width: timelineWidth, height: laneHeight }}>
                        {ticks.map((tick) => (
                          <div key={tick} className="absolute top-0 h-full border-l border-white/[0.04]" style={{ left: xOf(tick) }} />
                        ))}
                        {positioned.map(({ event, x }) => {
                          const highlighted = highlightLocationId != null && event.location_id === highlightLocationId;
                          const level = levelOf.get(event.id) ?? 0;
                          return (
                            <button
                              key={event.id}
                              ref={(el) => {
                                if (el) itemRefs.current.set(event.id, el);
                                else itemRefs.current.delete(event.id);
                              }}
                              onClick={() => setModalState({ event })}
                              title={`${formatYear(event.year)}년 · ${event.title}`}
                              className="absolute flex max-w-[220px] items-center gap-1.5 truncate rounded-full border px-2 py-1 text-left text-[11px] font-medium shadow-sm transition-transform hover:z-10 hover:scale-105"
                              style={{
                                left: x,
                                top: LANE_PAD + level * ROW_H,
                                borderColor: highlighted ? 'rgba(212,176,106,0.5)' : group.colors.border,
                                background: highlighted ? 'rgba(212,176,106,0.12)' : group.colors.bg,
                                color: highlighted ? '#e6c98a' : group.colors.text,
                                boxShadow: highlighted ? '0 0 12px 1px rgba(212,176,106,0.4)' : undefined,
                              }}
                            >
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: highlighted ? '#d4b06a' : group.colors.dot }} />
                              <span className="shrink-0 text-[10px] opacity-80">{formatYear(event.year)}</span>
                              <span className="truncate">{event.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'horizontal' && (
        <p className="mx-auto mt-3 max-w-3xl text-[11.5px] text-zinc-600">
          사건을 클릭하면 수정하거나 삭제할 수 있어요. 옆으로 스크롤해서 다른 연도를 볼 수 있습니다.
        </p>
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
