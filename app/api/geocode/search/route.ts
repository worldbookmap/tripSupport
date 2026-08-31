import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchPlaces } from '@/lib/geocode';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json([]);

  try {
    const results = await searchPlaces(q);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
