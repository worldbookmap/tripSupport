'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/map/MapView').then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-zinc-500">지도를 불러오는 중...</p>,
});

export default function MapPage() {
  return <MapView />;
}
