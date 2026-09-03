import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPlaceDetails } from '@/lib/geocode';

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('placeId')?.trim();
  if (!placeId) return NextResponse.json({ error: 'placeId는 필수입니다.' }, { status: 400 });

  try {
    const result = await getPlaceDetails(placeId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
