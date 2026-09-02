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

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeocodeResult {
  formatted_address: string;
  address_components: GoogleAddressComponent[];
  geometry: { location: { lat: number; lng: number } };
}

interface GoogleGeocodeResponse {
  status: string;
  results: GoogleGeocodeResult[];
  error_message?: string;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_MAPS_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
}

function findComponent(components: GoogleAddressComponent[], type: string): string | undefined {
  return components.find((c) => c.types.includes(type))?.long_name;
}

// Google Geocoding API: 결과 언어를 영어로 고정해 나라/도시명 표기를 일관되게 유지합니다.
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    language: 'en',
    key: getApiKey(),
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`역지오코딩 요청에 실패했습니다 (${res.status}).`);
  }

  const data: GoogleGeocodeResponse = await res.json();
  if (data.status === 'ZERO_RESULTS') {
    return { country: '', city: '' };
  }
  if (data.status !== 'OK') {
    throw new Error(`역지오코딩 실패: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`);
  }

  const components = data.results[0].address_components;
  return {
    country: findComponent(components, 'country') ?? '',
    city:
      findComponent(components, 'locality') ??
      findComponent(components, 'administrative_area_level_2') ??
      findComponent(components, 'administrative_area_level_1') ??
      '',
  };
}

// 한글/영문 등 어떤 언어로 검색해도 좌표를 찾아주는 순방향 지오코딩. 결과 표기는 영어로 고정.
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    address: query,
    language: 'en',
    key: getApiKey(),
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`장소 검색에 실패했습니다 (${res.status}).`);
  }

  const data: GoogleGeocodeResponse = await res.json();
  if (data.status === 'ZERO_RESULTS') {
    return [];
  }
  if (data.status !== 'OK') {
    throw new Error(`장소 검색 실패: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`);
  }

  return data.results.slice(0, 6).map((item) => ({
    name: item.address_components[0]?.long_name ?? item.formatted_address.split(',')[0] ?? query,
    displayName: item.formatted_address,
    lat: item.geometry.location.lat,
    lng: item.geometry.location.lng,
  }));
}
