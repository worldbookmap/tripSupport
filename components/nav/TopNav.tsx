'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/map', label: '지도' },
  { href: '/timeline', label: '연표' },
  { href: '/mindmap', label: '마인드맵' },
];

export function TopNav() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  return (
    <nav className="flex gap-1 border-b border-black/10 px-4 py-2 dark:border-white/10">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-foreground text-background'
                : 'hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
