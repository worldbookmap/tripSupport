'use client';

import { Suspense } from 'react';
import { Timeline } from '@/components/timeline/Timeline';

export default function TimelinePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-500">불러오는 중...</p>}>
      <Timeline />
    </Suspense>
  );
}
