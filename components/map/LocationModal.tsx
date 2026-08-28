'use client';

import { useEffect, useState } from 'react';
import type { Book } from '@/lib/types';
import type { BookSearchResult } from '@/lib/kakaoBooks';

interface LocationModalProps {
  lat?: number;
  lng?: number;
  locationId?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function LocationModal({ lat, lng, locationId, onClose, onSaved, onDeleted }: LocationModalProps) {
  const [id, setId] = useState<string | undefined>(locationId);
  const [name, setName] = useState('');
  const [history, setHistory] = useState('');
  const [touristInfo, setTouristInfo] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(!!locationId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<BookSearchResult[]>([]);
  const [searchingBooks, setSearchingBooks] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    (async () => {
      const res = await fetch(`/api/locations/${locationId}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setHistory(data.history ?? '');
        setTouristInfo(data.tourist_info ?? '');
        setBooks(data.books ?? []);
      }
      setLoading(false);
    })();
  }, [locationId]);

  async function refreshBooks(currentId: string) {
    const res = await fetch(`/api/locations/${currentId}`);
    if (res.ok) {
      const data = await res.json();
      setBooks(data.books ?? []);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('지역 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (id) {
        const res = await fetch(`/api/locations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, history, tourist_info: touristInfo }),
        });
        if (!res.ok) throw new Error('저장에 실패했습니다.');
      } else {
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, lat, lng, history, tourist_info: touristInfo }),
        });
        if (!res.ok) throw new Error('저장에 실패했습니다.');
        const created = await res.json();
        setId(created.id);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm('이 지역 정보를 삭제할까요? 연결된 책도 함께 삭제됩니다.')) return;
    const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
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
    const res = await fetch(`/api/locations/${id}/books`, {
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{id ? '지역 정보 수정' : '새 지역 추가'}</h2>
          <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            닫기
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">불러오는 중...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">지역 이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
                placeholder="예: 파리"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">역사</label>
              <textarea
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                rows={4}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">관광 정보</label>
              <textarea
                value={touristInfo}
                onChange={(e) => setTouristInfo(e.target.value)}
                rows={3}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {saving ? '저장 중...' : id ? '저장' : '저장하고 책 추가하기'}
              </button>
              {id && (
                <button
                  onClick={handleDelete}
                  className="rounded border border-red-400 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  지역 삭제
                </button>
              )}
            </div>

            <div className="border-t border-black/10 pt-4 dark:border-white/10">
              <h3 className="mb-2 text-sm font-semibold">관련 책 (카카오 도서)</h3>
              {!id && <p className="mb-2 text-xs text-zinc-500">지역을 먼저 저장하면 책을 추가할 수 있어요.</p>}
              <div className="mb-3 flex gap-2">
                <input
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchBooks()}
                  placeholder="책 제목 검색"
                  disabled={!id}
                  className="flex-1 rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-black disabled:opacity-50"
                />
                <button
                  onClick={handleSearchBooks}
                  disabled={!id || searchingBooks}
                  className="rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20 disabled:opacity-50"
                >
                  검색
                </button>
              </div>

              {bookResults.length > 0 && (
                <ul className="mb-4 max-h-48 space-y-2 overflow-y-auto rounded border border-black/10 p-2 dark:border-white/10">
                  {bookResults.map((result) => (
                    <li key={result.sourceId} className="flex items-center gap-2 text-sm">
                      {result.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={result.thumbnailUrl} alt="" className="h-10 w-7 object-cover" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{result.title}</p>
                        <p className="text-xs text-zinc-500">{result.authors.join(', ') || '작가 정보 없음'}</p>
                      </div>
                      <button
                        onClick={() => handleAddBook(result)}
                        className="rounded border border-black/20 px-2 py-1 text-xs dark:border-white/20"
                      >
                        추가
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <h4 className="mb-1 text-xs font-semibold text-zinc-500">이 지역에 등록된 책</h4>
              {books.length === 0 ? (
                <p className="text-xs text-zinc-500">등록된 책이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {books.map((book) => (
                    <li key={book.id} className="flex items-center gap-2 text-sm">
                      {book.thumbnail_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={book.thumbnail_url} alt="" className="h-10 w-7 object-cover" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{book.title}</p>
                        <p className="text-xs text-zinc-500">
                          {(book.authors ?? []).map((a) => a.name).join(', ') || '작가 정보 없음'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveBook(book.id)}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-500"
                      >
                        삭제
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
  );
}
