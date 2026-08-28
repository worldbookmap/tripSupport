'use client';

import { useEffect, useState } from 'react';
import { Save, Trash2, User, X } from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20';
const labelClass = 'mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-zinc-300';

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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-surface shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-50">
            <User className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />
            작가 정보
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
        {loading ? (
          <p className="px-6 py-5 text-sm text-zinc-500">불러오는 중...</p>
        ) : (
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className={labelClass}>이름</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>소개</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" strokeWidth={2.25} />
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                삭제
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
