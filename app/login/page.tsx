'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Lock, TriangleAlert } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    if (!res.ok) {
      setError('비밀번호가 올바르지 않습니다.');
      return;
    }

    router.replace('/map');
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-strong shadow-[0_0_32px_-6px_rgba(139,139,249,0.55)]">
            <Compass className="h-6 w-6 text-white" strokeWidth={2} />
          </span>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50">여행 기록</h1>
            <p className="mt-1 text-[13px] text-zinc-500">계속하려면 비밀번호를 입력하세요</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/[0.07] bg-surface/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm"
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoFocus
              className="w-full rounded-xl border border-white/[0.08] bg-black/30 py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-b from-accent to-accent-strong py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '확인 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
