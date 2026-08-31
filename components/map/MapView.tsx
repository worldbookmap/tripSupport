'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search } from 'lucide-react';
import type { Location } from '@/lib/types';
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

type ModalState = { lat?: number; lng?: number; locationId?: string };

export function MapView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [popupLocationId, setPopupLocationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  function handleSelectSearchResult(loc: Location) {
    mapRef.current?.flyTo([loc.lat, loc.lng], 13);
    setPopupLocationId(loc.id);
    setSearch('');
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
      <div className="absolute left-14 right-4 top-3 z-[1000] sm:left-16 sm:right-auto sm:top-4 sm:w-64">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-accent-strong" strokeWidth={2.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="저장한 지역 검색"
            className="w-full rounded-xl border border-accent/30 bg-surface py-2 pl-9 pr-3 text-[13px] text-zinc-100 shadow-lg shadow-black/40 outline-none transition-colors placeholder:text-zinc-500 focus:border-accent/70 focus:ring-2 focus:ring-accent/25"
          />
        </div>
        {search.trim() !== '' && (
          <ul className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-white/[0.1] bg-surface py-1 shadow-xl shadow-black/50">
            {searchMatches.length > 0 ? (
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
              ))
            ) : (
              <li className="px-3 py-2.5 text-[12px] text-zinc-500">
                저장된 지역 중 일치하는 결과가 없어요. 지도를 더블클릭하면 새 지역을 추가할 수 있어요.
              </li>
            )}
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
