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

interface GooglePlace {
  displayName?: { text: string; languageCode: string };
  formattedAddress?: string;
  location: { latitude: number; longitude: number };
}

interface GooglePlacesTextSearchResponse {
  places?: GooglePlace[];
  error?: { message: string };
}

// Google Places API(Text Search): 지명뿐 아니라 상호명/랜드마크 등 구글 지도 검색창과 비슷한 범위로 찾습니다.
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'en' }),
  });

  const data: GooglePlacesTextSearchResponse = await res.json();
  if (!res.ok) {
    throw new Error(`장소 검색에 실패했습니다: ${data.error?.message ?? res.status}`);
  }
  if (!data.places) {
    return [];
  }

  return data.places.slice(0, 6).map((place) => ({
    name: place.displayName?.text ?? query,
    displayName: place.formattedAddress ?? '',
    lat: place.location.latitude,
    lng: place.location.longitude,
  }));
}
