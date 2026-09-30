'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, ImagePlus, Pencil, Plus, Save, StickyNote, Trash2, X } from 'lucide-react';
import type { Visit, VisitPhoto } from '@/lib/types';

const inputClass =
  'w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20 [color-scheme:dark]';
const labelClass = 'mb-1 flex items-center gap-1.5 text-[12px] font-medium text-zinc-400';

// 업로드 전 긴 변 기준으로 줄여서 JPEG로 변환 (서버 요청 본문 제한 + 저장 용량 절약).
const MAX_PHOTO_EDGE = 2000;
const PHOTO_QUALITY = 0.85;

async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('사진 변환 실패'))), 'image/jpeg', PHOTO_QUALITY)
  );
}

function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatVisitDate(date: string | null) {
  if (!date) return '날짜 미기록';
  const [y, m, d] = date.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

interface NewPhoto {
  key: string;
  file: File;
  previewUrl: string;
}

interface VisitFormProps {
  locationId: string;
  visit: Visit | null;
  onCancel: () => void;
  onSaved: () => void;
}

function VisitForm({ locationId, visit, onCancel, onSaved }: VisitFormProps) {
  const [visitedOn, setVisitedOn] = useState(visit ? (visit.visited_on ?? '') : todayString());
  const [memo, setMemo] = useState(visit?.memo ?? '');
  const [keptPhotos, setKeptPhotos] = useState<VisitPhoto[]>(visit?.photos ?? []);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newPhotosRef = useRef(newPhotos);

  useEffect(() => {
    newPhotosRef.current = newPhotos;
  }, [newPhotos]);

  useEffect(() => () => newPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({ key: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
    setNewPhotos((prev) => [...prev, ...added]);
  }

  function removeNewPhoto(key: string) {
    setNewPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      let visitId = visit?.id;
      const payload = JSON.stringify({ visitedOn, memo });
      if (visitId) {
        const res = await fetch(`/api/visits/${visitId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (!res.ok) throw new Error('방문 기록 저장에 실패했습니다.');
      } else {
        const res = await fetch(`/api/locations/${locationId}/visits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (!res.ok) throw new Error('방문 기록 저장에 실패했습니다.');
        visitId = (await res.json()).id as string;
      }

      const removed = (visit?.photos ?? []).filter((p) => !keptPhotos.some((k) => k.path === p.path));
      for (const photo of removed) {
        await fetch(`/api/visits/${visitId}/photos?path=${encodeURIComponent(photo.path)}`, { method: 'DELETE' });
      }

      // 서버에서 photos 배열을 읽고-덧붙이는 방식이라 순서대로 한 장씩 올린다.
      const failed: string[] = [];
      for (const [index, photo] of newPhotos.entries()) {
        setProgress(`사진 업로드 중 ${index + 1}/${newPhotos.length}`);
        try {
          const form = new FormData();
          form.append('file', await resizePhoto(photo.file), 'photo.jpg');
          const res = await fetch(`/api/visits/${visitId}/photos`, { method: 'POST', body: form });
          if (!res.ok) throw new Error();
        } catch {
          failed.push(photo.file.name);
        }
      }
      if (failed.length > 0) alert(`사진 ${failed.length}장을 올리지 못했습니다.\n${failed.join('\n')}`);
      onSaved();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setSaving(false);
      setProgress('');
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
      <div>
        <label className={labelClass}>
          <CalendarDays className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.25} />
          방문 날짜
        </label>
        <input type="date" value={visitedOn} onChange={(e) => setVisitedOn(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>
          <StickyNote className="h-3.5 w-3.5 text-gold" strokeWidth={2.25} />
          메모
        </label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="어땠는지 간단히 적어두세요"
          className={`${inputClass} resize-none`}
        />
      </div>
      <div>
        <label className={labelClass}>
          <ImagePlus className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.25} />
          사진
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {keptPhotos.map((photo) => (
            <div key={photo.path} className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-white/[0.08]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setKeptPhotos((prev) => prev.filter((p) => p.path !== photo.path))}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-zinc-200 hover:bg-red-500/80"
                aria-label="사진 빼기"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {newPhotos.map((photo) => (
            <div key={photo.key} className="relative aspect-square overflow-hidden rounded-lg ring-1 ring-emerald-400/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeNewPhoto(photo.key)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-zinc-200 hover:bg-red-500/80"
                aria-label="사진 빼기"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/[0.15] text-[11px] text-zinc-500 transition-colors hover:border-accent/50 hover:text-accent-strong"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            추가
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-accent to-accent-strong px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-accent/20 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" strokeWidth={2.25} />
          {saving ? progress || '저장 중...' : '저장'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-zinc-50 disabled:opacity-40"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function PhotoLightbox({ photos, index, onClose }: { photos: VisitPhoto[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  const count = photos.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrent((i) => (i - 1 + count) % count);
      if (e.key === 'ArrowRight') setCurrent((i) => (i + 1) % count);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, onClose]);

  // 지도 위 패널은 backdrop-blur 때문에 fixed 요소가 패널 안에 갇히므로 body로 포털.
  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photos[current].url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-zinc-100 hover:bg-white/20"
        aria-label="닫기"
      >
        <X className="h-5 w-5" strokeWidth={2.25} />
      </button>
      {count > 1 && (
        <>
          <button
            onClick={() => setCurrent((i) => (i - 1 + count) % count)}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-zinc-100 hover:bg-white/20"
            aria-label="이전 사진"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <button
            onClick={() => setCurrent((i) => (i + 1) % count)}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-zinc-100 hover:bg-white/20"
            aria-label="다음 사진"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-zinc-300">
            {current + 1} / {count}
          </span>
        </>
      )}
    </div>,
    document.body
  );
}

interface VisitsTabProps {
  locationId: string;
  visits: Visit[];
  onChanged: () => void;
}

export function VisitsTab({ locationId, visits, onChanged }: VisitsTabProps) {
  // null: 폼 닫힘, 'new': 새 기록, 그 외: 수정 중인 방문 기록 id
  const [editing, setEditing] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: VisitPhoto[]; index: number } | null>(null);

  useEffect(() => {
    setEditing(null);
  }, [locationId]);

  async function handleDelete(visitId: string) {
    if (!confirm('이 방문 기록을 삭제할까요? 첨부한 사진도 함께 삭제됩니다.')) return;
    const res = await fetch(`/api/visits/${visitId}`, { method: 'DELETE' });
    if (res.ok) onChanged();
  }

  function handleSaved() {
    setEditing(null);
    onChanged();
  }

  return (
    <div className="space-y-3 px-4 py-4 text-[13px]">
      {editing === 'new' ? (
        <VisitForm locationId={locationId} visit={null} onCancel={() => setEditing(null)} onSaved={handleSaved} />
      ) : (
        <button
          onClick={() => setEditing('new')}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.15] py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-accent/50 hover:text-accent-strong"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          방문 기록 추가
        </button>
      )}

      {visits.length === 0 && editing !== 'new' && (
        <p className="py-2 text-center text-zinc-600">아직 방문 기록이 없습니다.</p>
      )}

      {visits.map((visit) =>
        editing === visit.id ? (
          <VisitForm
            key={visit.id}
            locationId={locationId}
            visit={visit}
            onCancel={() => setEditing(null)}
            onSaved={handleSaved}
          />
        ) : (
          <div key={visit.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-strong">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.25} />
                {formatVisitDate(visit.visited_on)}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing(visit.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
                  aria-label="방문 기록 수정"
                >
                  <Pencil className="h-3 w-3" strokeWidth={2.25} />
                </button>
                <button
                  onClick={() => handleDelete(visit.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                  aria-label="방문 기록 삭제"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={2.25} />
                </button>
              </div>
            </div>
            {visit.memo && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-zinc-300">{visit.memo}</p>}
            {visit.photos.length > 0 && (
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {visit.photos.map((photo, index) => (
                  <button
                    key={photo.path}
                    onClick={() => setLightbox({ photos: visit.photos, index })}
                    className="aspect-square overflow-hidden rounded-lg ring-1 ring-white/[0.08] transition-opacity hover:opacity-80"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {lightbox && <PhotoLightbox photos={lightbox.photos} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}
