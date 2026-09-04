export interface ReverseGeocodeResult {
  country: string;
  city: string;
  district: string;
  address: string;
}

export interface PlaceSearchResult {
  name: string;
  displayName: string;
  description: string;
  lat: number;
  lng: number;
}

export interface PlaceInfo {
  name: string;
  description: string;
  address: string;
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
    return { country: '', city: '', district: '', address: '' };
  }
  if (data.status !== 'OK') {
    throw new Error(`역지오코딩 실패: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`);
  }

  const components = data.results[0].address_components;
  const adminLevel2 = findComponent(components, 'administrative_area_level_2');

  // 이스탄불(구: Fatih)처럼 도시 자체가 광역 행정구역(도)이라 locality가 비어 있는 경우가 있어,
  // 그런 경우 구/군 단위인 administrative_area_level_2보다 상위인 도/특별시(level_1)를 도시로 우선합니다.
  const city =
    findComponent(components, 'locality') ??
    findComponent(components, 'administrative_area_level_1') ??
    adminLevel2 ??
    '';

  const sublocality =
    findComponent(components, 'sublocality_level_1') ?? findComponent(components, 'sublocality');
  const district = sublocality ?? (adminLevel2 && adminLevel2 !== city ? adminLevel2 : '') ?? '';

  return {
    country: findComponent(components, 'country') ?? '',
    city,
    district,
    address: data.results[0].formatted_address ?? '',
  };
}

interface GooglePlace {
  displayName?: { text: string; languageCode: string };
  formattedAddress?: string;
  editorialSummary?: { text: string; languageCode: string };
  location: { latitude: number; longitude: number };
}

interface GooglePlacesTextSearchResponse {
  places?: GooglePlace[];
  error?: { message: string };
}

interface GooglePlaceDetailsResponse extends GooglePlace {
  error?: { message: string };
}

// Google Places API(Text Search): 지명뿐 아니라 상호명/랜드마크 등 구글 지도 검색창과 비슷한 범위로 찾습니다.
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.editorialSummary,places.location',
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
    description: place.editorialSummary?.text ?? '',
    lat: place.location.latitude,
    lng: place.location.longitude,
  }));
}

// Google Places API(Place Details): 지도의 랜드마크/건물 아이콘을 클릭했을 때 얻는 placeId로 이름/소개글을 가져옵니다.
export async function getPlaceDetails(placeId: string): Promise<PlaceInfo> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`,
    {
      headers: {
        'X-Goog-Api-Key': getApiKey(),
        'X-Goog-FieldMask': 'displayName,formattedAddress,editorialSummary,location',
      },
    }
  );

  const data: GooglePlaceDetailsResponse = await res.json();
  if (!res.ok) {
    throw new Error(`장소 정보 조회에 실패했습니다: ${data.error?.message ?? res.status}`);
  }

  return {
    name: data.displayName?.text ?? '',
    description: data.editorialSummary?.text ?? '',
    address: data.formattedAddress ?? '',
    lat: data.location.latitude,
    lng: data.location.longitude,
  };
}
