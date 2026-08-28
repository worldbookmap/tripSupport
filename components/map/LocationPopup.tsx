'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LocationDetail } from '@/lib/types';

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
    <div className="absolute right-4 top-4 z-[1000] max-h-[80vh] w-80 overflow-y-auto rounded-lg bg-white p-4 shadow-xl dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{detail?.name ?? '불러오는 중...'}</h3>
        <button onClick={onClose} className="shrink-0 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
          닫기
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-500">불러오는 중...</p>}

      {!loading && detail && (
        <div className="space-y-3 text-sm">
          {detail.history && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-zinc-500">역사</h4>
              <p className="whitespace-pre-wrap">{detail.history}</p>
            </div>
          )}
          {detail.tourist_info && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-zinc-500">관광 정보</h4>
              <p className="whitespace-pre-wrap">{detail.tourist_info}</p>
            </div>
          )}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-zinc-500">관련 책</h4>
            {detail.books.length === 0 ? (
              <p className="text-xs text-zinc-500">등록된 책이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {detail.books.map((book) => (
                  <li key={book.id} className="flex items-center gap-2">
                    {book.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.thumbnail_url} alt="" className="h-10 w-7 object-cover" />
                    )}
                    <div>
                      <p className="font-medium">{book.title}</p>
                      <p className="text-xs text-zinc-500">
                        {(book.authors ?? []).map((a) => a.name).join(', ') || '작가 정보 없음'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-black/10 pt-3 dark:border-white/10">
            <button
              onClick={() => router.push(`/timeline?locationId=${locationId}`)}
              className="rounded border border-black/20 px-3 py-1.5 text-xs dark:border-white/20"
            >
              연표에서 보기
            </button>
            <button
              onClick={() => onEdit(locationId)}
              className="rounded border border-black/20 px-3 py-1.5 text-xs dark:border-white/20"
            >
              수정
            </button>
            <button onClick={handleDelete} className="rounded border border-red-300 px-3 py-1.5 text-xs text-red-500">
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
