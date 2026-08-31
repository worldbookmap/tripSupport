export interface ReverseGeocodeResult {
  country: string;
  city: string;
}

export interface PlaceSearchResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

interface NominatimSearchItem {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
}

interface NominatimAddress {
  country?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
}

// OpenStreetMap Nominatim: 무료, 키 불필요. 사용 정책상 식별 가능한 User-Agent가 필요합니다.
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    'accept-language': 'ko',
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: { 'User-Agent': 'tripSupport-personal-travel-log/1.0' },
  });

  if (!res.ok) {
    throw new Error(`역지오코딩 요청에 실패했습니다 (${res.status}).`);
  }

  const data: { address?: NominatimAddress } = await res.json();
  const address = data.address ?? {};

  return {
    country: address.country ?? '',
    city: address.city ?? address.town ?? address.village ?? address.county ?? address.state ?? '',
  };
}

// 지명(영문 도시명 포함)으로 좌표를 찾는 순방향 지오코딩.
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '6',
    'accept-language': 'ko',
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { 'User-Agent': 'tripSupport-personal-travel-log/1.0' },
  });

  if (!res.ok) {
    throw new Error(`장소 검색에 실패했습니다 (${res.status}).`);
  }

  const data: NominatimSearchItem[] = await res.json();
  return data
    .filter((item) => item.lat && item.lon)
    .map((item) => ({
      name: (item.name || item.display_name?.split(',')[0] || query).trim(),
      displayName: item.display_name ?? '',
      lat: Number(item.lat),
      lng: Number(item.lon),
    }));
}
