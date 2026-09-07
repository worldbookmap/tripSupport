'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Globe2, Loader2, MapPin, Route as RouteIcon, Save, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react';
import { guessRegion, REGION_COLORS, REGIONS, type Region } from '@/lib/regions';

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20';
const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-zinc-300';

interface RouteModalProps {
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  routeId?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function RouteModal({ startLat, startLng, endLat, endLng, routeId, onClose, onSaved, onDeleted }: RouteModalProps) {
  const [id, setId] = useState<string | undefined>(routeId);
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');
  const [region, setRegion] = useState<Region>(() =>
    startLat != null && startLng != null && endLat != null && endLng != null
      ? guessRegion((startLat + endLat) / 2, (startLng + endLng) / 2)
      : '기타'
  );
  const [sLat, setSLat] = useState<number | undefined>(startLat);
  const [sLng, setSLng] = useState<number | undefined>(startLng);
  const [eLat, setELat] = useState<number | undefined>(endLat);
  const [eLng, setELng] = useState<number | undefined>(endLng);
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  const [loading, setLoading] = useState(!!routeId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

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
      }
      setLoading(false);
    })();
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

  async function handleSave() {
    if (!name.trim()) {
      setError('경로 이름을 입력해주세요.');
      return;
    }
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
          }),
        });
        if (!res.ok) throw new Error('저장에 실패했습니다.');
        const created = await res.json();
        setId(created.id);
      }
      onSaved();
      setSavedToast(true);
      setTimeout(onClose, 1100);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm('이 경로를 삭제할까요?')) return;
    const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
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
          className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.08] bg-surface shadow-2xl shadow-black/60"
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
                    {saving ? '저장 중...' : '저장'}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
