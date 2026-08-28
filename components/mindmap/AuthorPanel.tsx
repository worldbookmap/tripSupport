'use client';

import { useEffect, useState } from 'react';

interface AuthorPanelProps {
  authorId: string;
  onClose: () => void;
  onChanged: () => void;
}

export function AuthorPanel({ authorId, onClose, onChanged }: AuthorPanelProps) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/authors/${authorId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setName(data.name ?? '');
          setBio(data.bio ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [authorId]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/authors/${authorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, bio }),
    });
    setSaving(false);
    if (res.ok) {
      onChanged();
      onClose();
    }
  }

  async function handleDelete() {
    if (!confirm('이 작가를 삭제할까요? 연결된 책과의 관계도 함께 삭제됩니다.')) return;
    const res = await fetch(`/api/authors/${authorId}`, { method: 'DELETE' });
    if (res.ok) {
      onChanged();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">작가 정보</h2>
          <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            닫기
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-zinc-500">불러오는 중...</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">소개</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-black"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button onClick={handleDelete} className="rounded border border-red-400 px-4 py-2 text-sm text-red-500">
                삭제
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
