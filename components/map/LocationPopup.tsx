'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, History, Landmark, Pencil, Trash2, X } from 'lucide-react';
import type { LocationDetail } from '@/lib/types';
import { REGION_COLORS } from '@/lib/regions';

interface LocationPopupProps {
  locationId: string;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDeleted: () => void;
}

export function LocationPopup({ locationId, onClose, onEdit, onDeleted }: LocationPopupProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    fetch(`/api/locations/${locationId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [locationId]);

  async function handleDelete() {
    if (!confirm('이 지역 정보를 삭제할까요?')) return;
    const res = await fetch(`/api/locations/${locationId}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  }

  return (
    <div className="absolute inset-x-3 top-16 z-[1000] max-h-[65vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-surface/95 shadow-2xl shadow-black/50 backdrop-blur-md sm:inset-x-auto sm:right-4 sm:top-4 sm:max-h-[80vh] sm:w-80">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold text-zinc-50">{detail?.name ?? '불러오는 중...'}</h3>
          {detail &&
            (() => {
              const region = detail.region ?? '기타';
              const colors = REGION_COLORS[region];
              return (
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
                >
                  {region}
                </span>
              );
            })()}
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>

      {loading && <p className="px-4 py-4 text-[13px] text-zinc-500">불러오는 중...</p>}

      {!loading && detail && (
        <div className="space-y-4 px-4 py-4 text-[13px]">
          {detail.history && (
            <div>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <Landmark className="h-3.5 w-3.5 text-gold" strokeWidth={2.25} />
                역사
              </h4>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-300">{detail.history}</p>
            </div>
          )}
          {detail.tourist_info && (
            <div>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <History className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.25} />
                관광 정보
              </h4>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-300">{detail.tourist_info}</p>
            </div>
          )}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.25} />
              관련 책
            </h4>
            {detail.books.length === 0 ? (
              <p className="text-zinc-600">등록된 책이 없습니다.</p>
            ) : (
              <ul className="space-y-2.5">
                {detail.books.map((book) => (
                  <li key={book.id} className="flex items-center gap-2.5">
                    {book.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.thumbnail_url}
                        alt=""
                        className="h-11 w-8 shrink-0 rounded-sm object-cover shadow-md shadow-black/40 ring-1 ring-white/[0.08]"
                      />
                    ) : (
                      <div className="flex h-11 w-8 shrink-0 items-center justify-center rounded-sm bg-white/[0.06] ring-1 ring-white/[0.08]">
                        <BookOpen className="h-3.5 w-3.5 text-zinc-600" strokeWidth={2} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-100">{book.title}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {(book.authors ?? []).map((a) => a.name).join(', ') || '작가 정보 없음'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3.5">
            <button
              onClick={() => router.push(`/timeline?locationId=${locationId}`)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-zinc-50"
            >
              <History className="h-3.5 w-3.5" strokeWidth={2.25} />
              연표에서 보기
            </button>
            <button
              onClick={() => onEdit(locationId)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-zinc-50"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
              수정
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
