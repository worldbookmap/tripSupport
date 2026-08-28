'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, History, Map, Waypoints } from 'lucide-react';

const TABS = [
  { href: '/map', label: '지도', icon: Map },
  { href: '/timeline', label: '연표', icon: History },
  { href: '/mindmap', label: '마인드맵', icon: Waypoints },
];

export function TopNav() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-[3000] flex items-center justify-between border-b border-white/[0.06] bg-background/80 px-5 py-3 backdrop-blur-xl">
      <Link href="/map" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-strong shadow-[0_0_20px_-4px_rgba(139,139,249,0.6)]">
          <Compass className="h-4.5 w-4.5 text-white" strokeWidth={2.25} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
          여행 기록
        </span>
      </Link>

      <nav className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] p-1">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                active
                  ? 'bg-white/[0.08] text-zinc-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
