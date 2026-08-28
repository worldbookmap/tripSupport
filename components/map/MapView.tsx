'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
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
      <div className="absolute left-16 top-4 z-[1000] w-64">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="지역 검색"
          className="w-full rounded border border-black/20 bg-white px-3 py-2 text-sm shadow dark:border-white/20 dark:bg-zinc-900"
        />
        {searchMatches.length > 0 && (
          <ul className="mt-1 max-h-56 overflow-y-auto rounded border border-black/10 bg-white shadow dark:border-white/10 dark:bg-zinc-900">
            {searchMatches.map((loc) => (
              <li key={loc.id}>
                <button
                  onClick={() => handleSelectSearchResult(loc)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {loc.name}
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, style by Wikimedia'
          url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png"
        />
        <MapController onReady={(map) => (mapRef.current = map)} />
        <CreateOnDoubleClick onCreate={(lat, lng) => setModalState({ lat, lng })} />
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
