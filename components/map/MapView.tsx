'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, MapPin, MapPinPlus, Search } from 'lucide-react';
import type { Location } from '@/lib/types';
import type { PlaceSearchResult } from '@/lib/geocode';
import { LocationModal } from './LocationModal';
import { LocationPopup } from './LocationPopup';

// Default Leaflet marker icons reference asset paths that break under bundlers;
// point them at the CDN copies instead of shipping/aliasing the PNGs ourselves.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function CreateOnDoubleClick({ onCreate }: { onCreate: (lat: number, lng: number) => void }) {
  useMapEvent('dblclick', (e) => {
    onCreate(e.latlng.lat, e.latlng.lng);
  });
  return null;
}

function CloseOnMapClick({ onClose }: { onClose: () => void }) {
  useMapEvent('click', () => {
    onClose();
  });
  return null;
}

function MapController({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

type ModalState = { lat?: number; lng?: number; locationId?: string; defaultName?: string };

export function MapView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [popupLocationId, setPopupLocationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [geoResults, setGeoResults] = useState<PlaceSearchResult[]>([]);
  const [geoSearching, setGeoSearching] = useState(false);

  const clickTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const mapRef = useRef<L.Map | null>(null);

  const loadLocations = useCallback(async () => {
    const res = await fetch('/api/locations');
    if (res.ok) setLocations(await res.json());
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const searchMatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return locations.filter((loc) => loc.name.toLowerCase().includes(term)).slice(0, 8);
  }, [search, locations]);

  // 저장된 지역 검색과 별개로, 영문 도시명 등으로 새 지역을 찾을 수 있도록 순방향 지오코딩을 붙입니다.
  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setGeoResults([]);
      setGeoSearching(false);
      return;
    }
    setGeoSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(term)}`);
        if (res.ok) setGeoResults(await res.json());
      } finally {
        setGeoSearching(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [search]);

  function handleSelectSearchResult(loc: Location) {
    mapRef.current?.flyTo([loc.lat, loc.lng], 13);
    setPopupLocationId(loc.id);
    setSearch('');
  }

  function handleSelectGeoResult(result: PlaceSearchResult) {
    mapRef.current?.flyTo([result.lat, result.lng], 13);
    setSearch('');
    setGeoResults([]);
    setModalState({ lat: result.lat, lng: result.lng, defaultName: result.name });
  }

  function handleAddAtCenter() {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    setModalState({ lat: center.lat, lng: center.lng });
  }

  function handleMarkerClick(loc: Location) {
    const timers = clickTimersRef.current;
    const existing = timers.get(loc.id);
    if (existing) clearTimeout(existing);
    timers.set(
      loc.id,
      setTimeout(() => {
        setPopupLocationId(loc.id);
        timers.delete(loc.id);
      }, 220)
    );
  }

  function handleMarkerDoubleClick(loc: Location) {
    const timers = clickTimersRef.current;
    const existing = timers.get(loc.id);
    if (existing) {
      clearTimeout(existing);
      timers.delete(loc.id);
    }
    setModalState({ locationId: loc.id });
  }

  return (
    <div className="relative flex-1">
      <div className="absolute left-14 right-4 top-3 z-[1000] sm:left-16 sm:right-auto sm:top-4 sm:w-80">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-accent-strong" strokeWidth={2.5} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="저장한 지역 검색 또는 영문 도시명 검색"
              className="w-full rounded-xl border border-accent/30 bg-surface py-2 pl-9 pr-3 text-[13px] text-zinc-100 shadow-lg shadow-black/40 outline-none transition-colors placeholder:text-zinc-500 focus:border-accent/70 focus:ring-2 focus:ring-accent/25"
            />
          </div>
          <button
            onClick={handleAddAtCenter}
            title="현재 지도 중심에 새 지역 추가"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-surface text-accent-strong shadow-lg shadow-black/40 transition-colors hover:bg-accent/15"
          >
            <MapPinPlus className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
        {search.trim() !== '' && (
          <ul className="mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-white/[0.1] bg-surface py-1 shadow-xl shadow-black/50">
            {searchMatches.length > 0 &&
              searchMatches.map((loc) => (
                <li key={loc.id}>
                  <button
                    onClick={() => handleSelectSearchResult(loc)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-zinc-200 transition-colors hover:bg-accent/15 hover:text-white"
                  >
                    <MapPin className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.25} />
                    {loc.name}
                  </button>
                </li>
              ))}
            {searchMatches.length === 0 && (
              <li className="px-3 py-2.5 text-[12px] text-zinc-500">저장된 지역 중 일치하는 결과가 없어요.</li>
            )}

            <li className="mt-1 border-t border-white/[0.06] px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">
              이 이름으로 새 지역 추가
            </li>
            {geoSearching && (
              <li className="flex items-center gap-2 px-3 py-2 text-[12px] text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
                검색 중...
              </li>
            )}
            {!geoSearching && geoResults.length === 0 && (
              <li className="px-3 py-2.5 text-[12px] text-zinc-500">일치하는 장소를 찾지 못했어요.</li>
            )}
            {!geoSearching &&
              geoResults.map((result, i) => (
                <li key={`${result.lat}-${result.lng}-${i}`}>
                  <button
                    onClick={() => handleSelectGeoResult(result)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-[13px] text-zinc-200 transition-colors hover:bg-accent/15 hover:text-white"
                  >
                    <MapPinPlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2.25} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{result.name}</span>
                      <span className="block truncate text-[11px] text-zinc-500">{result.displayName}</span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      <MapContainer
        center={[37.5665, 126.978]}
        zoom={4}
        doubleClickZoom={false}
        className="absolute inset-0"
      >
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
        <MapController onReady={(map) => (mapRef.current = map)} />
        <CreateOnDoubleClick onCreate={(lat, lng) => setModalState({ lat, lng })} />
        <CloseOnMapClick onClose={() => setPopupLocationId(null)} />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            eventHandlers={{
              click: () => handleMarkerClick(loc),
              dblclick: () => handleMarkerDoubleClick(loc),
            }}
          />
        ))}
      </MapContainer>

      {modalState && (
        <LocationModal
          lat={modalState.lat}
          lng={modalState.lng}
          locationId={modalState.locationId}
          defaultName={modalState.defaultName}
          onClose={() => setModalState(null)}
          onSaved={() => loadLocations()}
          onDeleted={() => {
            loadLocations();
            setModalState(null);
            setPopupLocationId(null);
          }}
        />
      )}

      {popupLocationId && !modalState && (
        <LocationPopup
          locationId={popupLocationId}
          onClose={() => setPopupLocationId(null)}
          onEdit={(id) => {
            setPopupLocationId(null);
            setModalState({ locationId: id });
          }}
          onDeleted={() => {
            loadLocations();
            setPopupLocationId(null);
          }}
        />
      )}
    </div>
  );
}
