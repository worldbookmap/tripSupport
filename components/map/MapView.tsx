'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map as GoogleMap, Marker, RenderingType, useMap } from '@vis.gl/react-google-maps';
import { CheckCircle2, LayoutGrid, Loader2, MapPin, MapPinPlus, Search, UtensilsCrossed, XCircle } from 'lucide-react';
import type { Location } from '@/lib/types';
import type { PlaceSearchResult } from '@/lib/geocode';
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_MARKER_ICON, type Category } from '@/lib/category';
import { LocationModal } from './LocationModal';
import { LocationPopup } from './LocationPopup';

type PinFilter = 'all' | Category;

const PIN_FILTERS: { id: PinFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'general', label: CATEGORY_LABELS.general },
  { id: 'food', label: CATEGORY_LABELS.food },
];

const GOOGLE_MAPS_BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '';
const DOUBLE_CLICK_THRESHOLD_MS = 300;

function MapController({
  onReady,
  onRawClick,
}: {
  onReady: (map: google.maps.Map) => void;
  onRawClick: (e: MouseEvent) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    onReady(map);
    // 구글 지도는 랜드마크 아이콘을 빠르게 두 번 클릭하면 두 번째 클릭의 click/dblclick 이벤트를
    // 아예 발생시키지 않는 경우가 있어(기본 정보창을 막았는지 여부와 무관), React onClick/onDblclick만으로는
    // 더블클릭을 감지할 수 없습니다. 대신 컨테이너에 원시 DOM click 리스너를 캡처 단계로 붙여서 직접 감지합니다.
    const container = map.getDiv();
    container.addEventListener('click', onRawClick, true);
    return () => container.removeEventListener('click', onRawClick, true);
  }, [map, onReady, onRawClick]);
  return null;
}

type ModalState = {
  lat?: number;
  lng?: number;
  locationId?: string;
  defaultName?: string;
  defaultTouristInfo?: string;
  defaultAddress?: string;
};

export function MapView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [popupLocationId, setPopupLocationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [geoResults, setGeoResults] = useState<PlaceSearchResult[]>([]);
  const [geoSearching, setGeoSearching] = useState(false);
  const [previewMarker, setPreviewMarker] = useState<{
    lat: number;
    lng: number;
    name: string;
    description: string;
    address: string;
  } | null>(null);
  const [moveToast, setMoveToast] = useState<'success' | 'error' | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [pinFilter, setPinFilter] = useState<PinFilter>('all');

  const clickTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const mapRef = useRef<google.maps.Map | null>(null);
  const geoRequestIdRef = useRef(0);
  const mapClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMapClickRef = useRef<{ lat: number; lng: number; placeId?: string } | null>(null);
  const handleMapDblclickRef = useRef<(info: { lat: number; lng: number; placeId?: string }) => void>(() => {});
  const locationsRef = useRef<Location[]>([]);
  const hasCenteredRef = useRef(false);

  // 처음 지도를 열었을 때 딱 한 번, 가장 최근에 수정한 지역을 중심으로 보여줍니다.
  // 지도/데이터 중 무엇이 먼저 준비되든 대응할 수 있게 두 지점(handleMapReady, loadLocations)에서 모두 시도합니다.
  const centerOnMostRecent = useCallback(() => {
    if (hasCenteredRef.current) return;
    const map = mapRef.current;
    const locs = locationsRef.current;
    if (!map || locs.length === 0) return;
    const mostRecent = locs.reduce((a, b) => (new Date(a.updated_at) > new Date(b.updated_at) ? a : b));
    map.panTo({ lat: mostRecent.lat, lng: mostRecent.lng });
    map.setZoom(13);
    hasCenteredRef.current = true;
  }, []);

  const loadLocations = useCallback(async () => {
    const res = await fetch('/api/locations');
    if (res.ok) {
      const data: Location[] = await res.json();
      setLocations(data);
      locationsRef.current = data;
      centerOnMostRecent();
    }
  }, [centerOnMostRecent]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const visibleLocations = useMemo(
    () => (pinFilter === 'all' ? locations : locations.filter((loc) => (loc.category ?? 'general') === pinFilter)),
    [locations, pinFilter]
  );

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
      const requestId = ++geoRequestIdRef.current;
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(term)}`);
        const data = res.ok ? await res.json() : [];
        if (requestId === geoRequestIdRef.current) setGeoResults(data);
      } finally {
        if (requestId === geoRequestIdRef.current) setGeoSearching(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [search]);

  function handleSelectSearchResult(loc: Location) {
    mapRef.current?.panTo({ lat: loc.lat, lng: loc.lng });
    mapRef.current?.setZoom(13);
    setPopupLocationId(loc.id);
    setSearch('');
  }

  function handleSelectGeoResult(result: PlaceSearchResult) {
    mapRef.current?.panTo({ lat: result.lat, lng: result.lng });
    mapRef.current?.setZoom(13);
    setSearch('');
    setGeoResults([]);
    setPreviewMarker({
      lat: result.lat,
      lng: result.lng,
      name: result.name,
      description: result.description,
      address: result.displayName,
    });
  }

  function handlePreviewMarkerClick() {
    if (!previewMarker) return;
    setModalState({
      lat: previewMarker.lat,
      lng: previewMarker.lng,
      defaultName: previewMarker.name,
      defaultTouristInfo: previewMarker.description,
      defaultAddress: previewMarker.address || undefined,
    });
  }

  function handleAddAtCenter() {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    setModalState({ lat: center.lat(), lng: center.lng() });
  }

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      centerOnMostRecent();
    },
    [centerOnMostRecent]
  );

  // 300ms 안에 원시 click이 다시 들어오면 더블클릭으로 간주해, 가장 최근 시맨틱 click이 알려준
  // 좌표/placeId(lastMapClickRef)로 새 지역 추가 흐름을 시작합니다.
  const handleRawMapClick = useCallback((e: MouseEvent) => {
    // 저장된 마커·미리보기 마커·줌 버튼 등은 각자 자체적으로 클릭/더블클릭을 처리하므로 여기서는 무시합니다.
    // 구글 지도 마커는 항상 role="button"으로 렌더링되어 이 방식으로 구분할 수 있습니다.
    const target = e.target as HTMLElement | null;
    if (target?.closest('[role="button"]')) return;

    if (mapClickTimerRef.current) {
      clearTimeout(mapClickTimerRef.current);
      mapClickTimerRef.current = null;
      const info = lastMapClickRef.current;
      if (info) handleMapDblclickRef.current(info);
      return;
    }
    mapClickTimerRef.current = setTimeout(() => {
      mapClickTimerRef.current = null;
    }, DOUBLE_CLICK_THRESHOLD_MS);
  }, []);

  // 지도 위 랜드마크/건물 아이콘을 더블클릭하면 placeId가 함께 오는데, 이걸로 이름/소개글을 미리 채웁니다.
  const handleMapDblclick = useCallback(async (info: { lat: number; lng: number; placeId?: string }) => {
    const { lat, lng, placeId } = info;
    if (!placeId) {
      setModalState({ lat, lng });
      return;
    }

    setPlaceLoading(true);
    try {
      const res = await fetch(`/api/geocode/place?placeId=${encodeURIComponent(placeId)}`);
      if (res.ok) {
        const data = await res.json();
        setModalState({
          lat,
          lng,
          defaultName: data.name || undefined,
          defaultTouristInfo: data.description || undefined,
          defaultAddress: data.address || undefined,
        });
        return;
      }
    } catch {
      // 장소 정보 조회에 실패해도 좌표만으로 새 지역 추가는 계속 진행합니다.
    } finally {
      setPlaceLoading(false);
    }
    setModalState({ lat, lng });
  }, []);

  useEffect(() => {
    handleMapDblclickRef.current = handleMapDblclick;
  }, [handleMapDblclick]);

  // Marker에는 dblclick 이벤트가 따로 없어, 대기 중인 타이머가 있는 채로 다시 클릭되면 더블클릭으로 간주합니다.
  function handleMarkerClick(loc: Location) {
    const timers = clickTimersRef.current;
    const pending = timers.get(loc.id);
    if (pending) {
      clearTimeout(pending);
      timers.delete(loc.id);
      setModalState({ locationId: loc.id });
      return;
    }
    timers.set(
      loc.id,
      setTimeout(() => {
        setPopupLocationId(loc.id);
        timers.delete(loc.id);
      }, DOUBLE_CLICK_THRESHOLD_MS)
    );
  }

  function handleMarkerDragStart(loc: Location) {
    if (popupLocationId === loc.id) setPopupLocationId(null);
  }

  async function handleMarkerDragEnd(loc: Location, e: google.maps.MapMouseEvent) {
    const latLng = e.latLng;
    if (!latLng) return;
    const lat = latLng.lat();
    const lng = latLng.lng();
    const prevLat = loc.lat;
    const prevLng = loc.lng;

    setLocations((current) => current.map((l) => (l.id === loc.id ? { ...l, lat, lng } : l)));

    try {
      const res = await fetch(`/api/locations/${loc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      if (!res.ok) throw new Error('save failed');
      setMoveToast('success');
    } catch {
      setLocations((current) => current.map((l) => (l.id === loc.id ? { ...l, lat: prevLat, lng: prevLng } : l)));
      setMoveToast('error');
    } finally {
      setTimeout(() => setMoveToast(null), 1800);
    }
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
              placeholder="저장한 지역 검색 또는 장소/지명 검색"
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

        <div className="mt-1.5 flex gap-1.5">
          {PIN_FILTERS.map((f) => {
            const active = pinFilter === f.id;
            const colors = f.id === 'all' ? null : CATEGORY_COLORS[f.id];
            const Icon = f.id === 'all' ? LayoutGrid : f.id === 'food' ? UtensilsCrossed : MapPin;
            return (
              <button
                key={f.id}
                onClick={() => setPinFilter(f.id)}
                title={`${f.label} 핀만 보기`}
                className={`flex items-center gap-1.5 rounded-xl border bg-surface px-2.5 py-1.5 text-[12px] font-medium shadow-lg shadow-black/40 transition-colors ${
                  active && !colors ? 'border-accent/50 text-accent-strong' : !active ? 'border-white/[0.08] text-zinc-400 hover:text-zinc-200' : ''
                }`}
                style={active && colors ? { borderColor: colors.border, background: colors.bg, color: colors.text } : undefined}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.25} style={active && colors ? { color: colors.dot } : undefined} />
                {f.label}
              </button>
            );
          })}
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

      <APIProvider apiKey={GOOGLE_MAPS_BROWSER_KEY} language="en">
        <GoogleMap
          defaultCenter={{ lat: 37.5665, lng: 126.978 }}
          defaultZoom={4}
          renderingType={RenderingType.RASTER}
          disableDoubleClickZoom
          disableDefaultUI
          zoomControl
          className="absolute inset-0"
          onClick={(e) => {
            const latLng = e.detail.latLng;
            if (latLng) {
              lastMapClickRef.current = { lat: latLng.lat, lng: latLng.lng, placeId: e.detail.placeId ?? undefined };
            }
            setPopupLocationId(null);
            setPreviewMarker(null);
          }}
        >
          <MapController onReady={handleMapReady} onRawClick={handleRawMapClick} />
          {visibleLocations.map((loc) => (
            <Marker
              key={loc.id}
              position={{ lat: loc.lat, lng: loc.lng }}
              icon={CATEGORY_MARKER_ICON[loc.category ?? 'general']}
              draggable
              title={loc.name}
              onClick={() => handleMarkerClick(loc)}
              onDragStart={() => handleMarkerDragStart(loc)}
              onDragEnd={(e) => handleMarkerDragEnd(loc, e)}
            />
          ))}
          {previewMarker && (
            <Marker
              position={{ lat: previewMarker.lat, lng: previewMarker.lng }}
              icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
              onClick={handlePreviewMarkerClick}
            />
          )}
        </GoogleMap>
      </APIProvider>

      {placeLoading && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[2100] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-accent/30 bg-surface px-4 py-2.5 text-sm font-medium text-accent-strong shadow-2xl shadow-black/50 sm:top-4">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
          장소 정보를 불러오는 중...
        </div>
      )}

      {moveToast && (
        <div
          className={`pointer-events-none absolute left-1/2 top-3 z-[2100] flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-2xl shadow-black/50 sm:top-4 ${
            moveToast === 'success'
              ? 'border-emerald-500/30 bg-surface text-emerald-300'
              : 'border-red-500/30 bg-surface text-red-300'
          }`}
        >
          {moveToast === 'success' ? (
            <>
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
              위치가 이동되었습니다
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" strokeWidth={2.25} />
              위치 이동을 저장하지 못했습니다
            </>
          )}
        </div>
      )}

      {modalState && (
        <LocationModal
          lat={modalState.lat}
          lng={modalState.lng}
          locationId={modalState.locationId}
          defaultName={modalState.defaultName}
          defaultTouristInfo={modalState.defaultTouristInfo}
          defaultAddress={modalState.defaultAddress}
          onClose={() => {
            setModalState(null);
            setPreviewMarker(null);
          }}
          onSaved={() => {
            loadLocations();
            setPreviewMarker(null);
          }}
          onDeleted={() => {
            loadLocations();
            setModalState(null);
            setPopupLocationId(null);
            setPreviewMarker(null);
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
