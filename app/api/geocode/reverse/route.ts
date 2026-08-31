import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { reverseGeocode } from '@/lib/geocode';

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat, lng는 필수입니다.' }, { status: 400 });
  }

  try {
    const result = await reverseGeocode(lat, lng);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
