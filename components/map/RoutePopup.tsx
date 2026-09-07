'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, MapPin, Pencil, Route as RouteIcon, Sparkles, Trash2, X } from 'lucide-react';
import type { RouteRecord } from '@/lib/types';
import { REGION_COLORS } from '@/lib/regions';

interface RoutePopupProps {
  routeId: string;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDeleted: () => void;
}

export function RoutePopup({ routeId, onClose, onEdit, onDeleted }: RoutePopupProps) {
  const [route, setRoute] = useState<RouteRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setRoute(null);
    fetch(`/api/routes/${routeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setRoute)
      .finally(() => setLoading(false));
  }, [routeId]);

  async function handleDelete() {
    if (!confirm('이 경로를 삭제할까요?')) return;
    const res = await fetch(`/api/routes/${routeId}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  }

  return (
    <div className="absolute inset-x-3 top-16 z-[1000] max-h-[65vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-surface/95 shadow-2xl shadow-black/50 backdrop-blur-md sm:inset-x-auto sm:right-4 sm:top-4 sm:max-h-[80vh] sm:w-80">
      <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <RouteIcon className="h-4 w-4 shrink-0 text-accent-strong" strokeWidth={2.25} />
            <h3 className="truncate text-[15px] font-semibold text-zinc-50">{route?.name ?? '불러오는 중...'}</h3>
            {route &&
              (() => {
                const colors = REGION_COLORS[route.region ?? '기타'];
                return (
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                    style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
                  >
                    {route.region}
                  </span>
                );
              })()}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>

      {loading && <p className="px-4 py-4 text-[13px] text-zinc-500">불러오는 중...</p>}

      {!loading && route && (
        <div className="space-y-4 px-4 py-4 text-[13px]">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-zinc-300">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2.25} />
              <span className="min-w-0 truncate">{route.start_name || `${route.start_lat.toFixed(4)}, ${route.start_lng.toFixed(4)}`}</span>
            </p>
            <p className="flex items-center gap-1.5 text-zinc-300">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" strokeWidth={2.25} />
              <span className="min-w-0 truncate">{route.end_name || `${route.end_lat.toFixed(4)}, ${route.end_lng.toFixed(4)}`}</span>
            </p>
          </div>

          {route.info && (
            <div>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <Sparkles className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.25} />
                경로 정보
              </h4>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-300">{route.info}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3.5">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${route.start_lat},${route.start_lng}&destination=${route.end_lat},${route.end_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-zinc-50"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} />
              구글 지도에서 길찾기
            </a>
            <button
              onClick={() => onEdit(routeId)}
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
