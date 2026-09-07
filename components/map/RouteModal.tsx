'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Globe2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Route as RouteIcon,
  Save,
  ScrollText,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { Book, HistoricalEvent, LatLng } from '@/lib/types';
import type { BookSearchResult } from '@/lib/kakaoBooks';
import { guessRegion, REGION_COLORS, REGIONS, type Region } from '@/lib/regions';
import { EventModal } from '@/components/timeline/EventModal';

function formatYear(year: number) {
  return year < 0 ? `기원전 ${-year}` : `${year}`;
}

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20';
const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-zinc-300';

interface RouteModalProps {
  path?: LatLng[];
  routeId?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function RouteModal({ path, routeId, onClose, onSaved, onDeleted }: RouteModalProps) {
  const start = path?.[0];
  const end = path && path.length > 0 ? path[path.length - 1] : undefined;

  const [id, setId] = useState<string | undefined>(routeId);
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');
  const [region, setRegion] = useState<Region>(() =>
    start != null && end != null ? guessRegion((start.lat + end.lat) / 2, (start.lng + end.lng) / 2) : '기타'
  );
  const [sLat, setSLat] = useState<number | undefined>(start?.lat);
  const [sLng, setSLng] = useState<number | undefined>(start?.lng);
  const [eLat, setELat] = useState<number | undefined>(end?.lat);
  const [eLng, setELng] = useState<number | undefined>(end?.lng);
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(!!routeId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<BookSearchResult[]>([]);
  const [searchingBooks, setSearchingBooks] = useState(false);

  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [eventModalState, setEventModalState] = useState<{ event?: HistoricalEvent } | null>(null);

  const backdropMouseDownRef = useRef(false);

  useEffect(() => {
    if (!routeId) return;
    (async () => {
      const res = await fetch(`/api/routes/${routeId}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setInfo(data.info ?? '');
        setRegion(data.region ?? '기타');
        setSLat(data.start_lat);
        setSLng(data.start_lng);
        setELat(data.end_lat);
        setELng(data.end_lng);
        setStartName(data.start_name ?? '');
        setEndName(data.end_name ?? '');
        setBooks(data.books ?? []);
      }
      setLoading(false);
    })();
    refreshEvents(routeId);
  }, [routeId]);

  useEffect(() => {
    // 새 경로를 그린 경우, 두 지점의 이름을 역지오코딩으로 미리 채워봅니다.
    if (routeId || sLat == null || sLng == null || eLat == null || eLng == null) return;
    (async () => {
      const [startRes, endRes] = await Promise.allSettled([
        fetch(`/api/geocode/reverse?lat=${sLat}&lng=${sLng}`),
        fetch(`/api/geocode/reverse?lat=${eLat}&lng=${eLng}`),
      ]);
      if (startRes.status === 'fulfilled' && startRes.value.ok) {
        const data = await startRes.value.json();
        setStartName(data.city || data.address || '');
      }
      if (endRes.status === 'fulfilled' && endRes.value.ok) {
        const data = await endRes.value.json();
        setEndName(data.city || data.address || '');
      }
    })();
  }, [routeId, sLat, sLng, eLat, eLng]);

  async function refreshBooks(currentId: string) {
    const res = await fetch(`/api/routes/${currentId}`);
    if (res.ok) {
      const data = await res.json();
      setBooks(data.books ?? []);
    }
  }

  async function refreshEvents(currentId: string) {
    const res = await fetch(`/api/events?routeId=${currentId}`);
    if (res.ok) setEvents(await res.json());
  }

  async function handleDeleteEvent(eventId: string) {
    if (!id) return;
    if (!confirm('이 사건을 삭제할까요?')) return;
    const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
    if (res.ok) await refreshEvents(id);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('경로 이름을 입력해주세요.');
      return;
    }
    const wasExisting = Boolean(id);
    setSaving(true);
    setError(null);
    try {
      if (id) {
        const res = await fetch(`/api/routes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, info, region, start_name: startName, end_name: endName }),
        });
        if (!res.ok) throw new Error('저장에 실패했습니다.');
      } else {
        const res = await fetch('/api/routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            info,
            region,
            start_lat: sLat,
            start_lng: sLng,
            start_name: startName,
            end_lat: eLat,
            end_lng: eLng,
            end_name: endName,
            path,
          }),
        });
        if (!res.ok) throw new Error('저장에 실패했습니다.');
        const created = await res.json();
        setId(created.id);
      }
      onSaved();
      // 기존 경로 수정일 때만 저장 후 바로 닫음. 새 경로는 이어서 책/사건을 추가할 수 있도록 모달을 유지.
      if (wasExisting) {
        setSavedToast(true);
        setTimeout(onClose, 1100);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm('이 경로를 삭제할까요? 연결된 책도 함께 삭제됩니다.')) return;
    const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  }

  async function handleSearchBooks() {
    if (!bookQuery.trim()) return;
    setSearchingBooks(true);
    const res = await fetch(`/api/books/search-kakao?q=${encodeURIComponent(bookQuery)}`);
    if (res.ok) setBookResults(await res.json());
    setSearchingBooks(false);
  }

  async function handleAddBook(result: BookSearchResult) {
    if (!id) return;
    setError(null);
    const res = await fetch(`/api/routes/${id}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: result.sourceId,
        title: result.title,
        authors: result.authors,
        thumbnailUrl: result.thumbnailUrl,
        description: result.description,
      }),
    });
    if (res.ok) {
      await refreshBooks(id);
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? '책 추가에 실패했습니다.');
    }
  }

  async function handleRemoveBook(bookId: string) {
    if (!id) return;
    setError(null);
    const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshBooks(id);
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? '책 삭제에 실패했습니다.');
    }
  }

  return (
    <>
      {savedToast && (
        <div className="fixed left-1/2 top-6 z-[2100] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-500/30 bg-surface px-4 py-2.5 text-sm font-medium text-emerald-300 shadow-2xl shadow-black/50">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
          저장되었습니다
        </div>
      )}
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onMouseDown={(e) => {
          backdropMouseDownRef.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (backdropMouseDownRef.current && e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-surface shadow-2xl shadow-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 sm:px-6 py-4">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-50">
              <RouteIcon className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />
              {id ? '경로 정보 수정' : '새 경로 추가'}
            </h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>

          <div className="px-4 sm:px-6 py-5">
            {loading ? (
              <p className="text-sm text-zinc-500">불러오는 중...</p>
            ) : (
              <div className="space-y-5">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={labelClass}>경로 이름</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="예: 파리 → 로마"
                    />
                  </div>
                  <div className="w-32">
                    <label className={labelClass}>
                      <Globe2 className="h-3.5 w-3.5" style={{ color: REGION_COLORS[region].dot }} strokeWidth={2.25} />
                      권역
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value as Region)}
                      className={`${inputClass} appearance-none`}
                      style={{ color: REGION_COLORS[region].text }}
                    >
                      {REGIONS.map((r) => (
                        <option key={r} value={r} style={{ color: '#000' }}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className={labelClass}>
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.25} />A 지점
                    </label>
                    <input
                      value={startName}
                      onChange={(e) => setStartName(e.target.value)}
                      className={inputClass}
                      placeholder="출발 지점 이름"
                    />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>
                      <MapPin className="h-3.5 w-3.5 text-rose-400" strokeWidth={2.25} />B 지점
                    </label>
                    <input
                      value={endName}
                      onChange={(e) => setEndName(e.target.value)}
                      className={inputClass}
                      placeholder="도착 지점 이름"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    <Sparkles className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.25} />
                    경로 정보
                  </label>
                  <textarea
                    value={info}
                    onChange={(e) => setInfo(e.target.value)}
                    rows={4}
                    className={`${inputClass} resize-none`}
                    placeholder="교통편, 소요 시간, 메모 등을 자유롭게 적어주세요."
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} /> : <Save className="h-3.5 w-3.5" strokeWidth={2.25} />}
                    {saving ? '저장 중...' : id ? '저장' : '저장하고 책 추가하기'}
                  </button>
                  {id && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                      경로 삭제
                    </button>
                  )}
                </div>

                <div className="border-t border-white/[0.06] pt-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-200">
                      <ScrollText className="h-4 w-4 text-gold" strokeWidth={2.25} />
                      연표 사건 <span className="font-normal text-zinc-500">(연도별 역사)</span>
                    </h3>
                    <button
                      onClick={() => setEventModalState({})}
                      disabled={!id}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-accent/20 hover:text-accent-strong disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" strokeWidth={2.5} />
                      사건 추가
                    </button>
                  </div>
                  {!id && (
                    <p className="mb-3 text-xs text-zinc-500">
                      경로를 먼저 저장하면 연도별 사건을 추가할 수 있어요. 여기서 추가한 사건은 연표 화면에도 그대로 반영됩니다.
                    </p>
                  )}
                  {id && events.length === 0 ? (
                    <p className="text-xs text-zinc-600">등록된 사건이 없습니다.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {events.map((event) => (
                        <li
                          key={event.id}
                          className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm"
                        >
                          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gold">
                            <CalendarClock className="h-3 w-3" strokeWidth={2.25} />
                            {formatYear(event.year)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-zinc-200">{event.title}</span>
                          <button
                            onClick={() => setEventModalState({ event })}
                            className="flex shrink-0 h-6 w-6 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="flex shrink-0 h-6 w-6 items-center justify-center rounded-lg text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-white/[0.06] pt-5">
                  <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-200">
                    <BookOpen className="h-4 w-4 text-emerald-400" strokeWidth={2.25} />
                    관련 책 <span className="font-normal text-zinc-500">(카카오 도서)</span>
                  </h3>
                  {!id && <p className="mb-3 text-xs text-zinc-500">경로를 먼저 저장하면 책을 추가할 수 있어요.</p>}
                  <div className="mb-3 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={2.25} />
                      <input
                        value={bookQuery}
                        onChange={(e) => setBookQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchBooks()}
                        placeholder="책 제목 검색"
                        disabled={!id}
                        className={`${inputClass} py-2 pl-9 disabled:opacity-40`}
                      />
                    </div>
                    <button
                      onClick={handleSearchBooks}
                      disabled={!id || searchingBooks}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-zinc-50 disabled:opacity-40"
                    >
                      검색
                    </button>
                  </div>

                  {bookResults.length > 0 && (
                    <ul className="mb-4 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 p-2">
                      {bookResults.map((result) => (
                        <li key={result.sourceId} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm transition-colors hover:bg-white/[0.04]">
                          {result.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={result.thumbnailUrl} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover shadow-sm ring-1 ring-white/[0.08]" />
                          ) : (
                            <div className="flex h-10 w-7 shrink-0 items-center justify-center rounded-sm bg-white/[0.06]">
                              <BookOpen className="h-3 w-3 text-zinc-600" strokeWidth={2} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-zinc-100">{result.title}</p>
                            <p className="truncate text-xs text-zinc-500">{result.authors.join(', ') || '작가 정보 없음'}</p>
                          </div>
                          <button
                            onClick={() => handleAddBook(result)}
                            className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-accent/20 hover:text-accent-strong"
                          >
                            <Plus className="h-3 w-3" strokeWidth={2.5} />
                            추가
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">이 경로에 등록된 책</h4>
                  {books.length === 0 ? (
                    <p className="text-xs text-zinc-600">등록된 책이 없습니다.</p>
                  ) : (
                    <ul className="space-y-2">
                      {books.map((book) => (
                        <li key={book.id} className="flex items-center gap-2.5 text-sm">
                          {book.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={book.thumbnail_url} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover shadow-sm ring-1 ring-white/[0.08]" />
                          ) : (
                            <div className="flex h-10 w-7 shrink-0 items-center justify-center rounded-sm bg-white/[0.06]">
                              <BookOpen className="h-3 w-3 text-zinc-600" strokeWidth={2} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-zinc-100">{book.title}</p>
                            <p className="truncate text-xs text-zinc-500">
                              {(book.authors ?? []).map((a) => a.name).join(', ') || '작가 정보 없음'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveBook(book.id)}
                            className="flex shrink-0 h-7 w-7 items-center justify-center rounded-lg text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {eventModalState && id && (
        <EventModal
          event={eventModalState.event}
          defaultRouteId={id}
          onClose={() => setEventModalState(null)}
          onSaved={() => {
            setEventModalState(null);
            refreshEvents(id);
          }}
        />
      )}
    </>
  );
}
