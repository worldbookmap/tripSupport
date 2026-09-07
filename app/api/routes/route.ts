import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { guessRegion, REGIONS } from '@/lib/regions';

export async function GET() {
  const { data, error } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { name, info, region, start_lat, start_lng, start_name, end_lat, end_lng, end_name } = body ?? {};

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof start_lat !== 'number' ||
    typeof start_lng !== 'number' ||
    typeof end_lat !== 'number' ||
    typeof end_lng !== 'number'
  ) {
    return NextResponse.json({ error: 'name, start/end 좌표는 필수입니다.' }, { status: 400 });
  }

  const resolvedRegion = REGIONS.includes(region) ? region : guessRegion((start_lat + end_lat) / 2, (start_lng + end_lng) / 2);

  const { data, error } = await supabase
    .from('routes')
    .insert({
      name,
      info: info ?? '',
      region: resolvedRegion,
      start_lat,
      start_lng,
      start_name: typeof start_name === 'string' ? start_name : '',
      end_lat,
      end_lng,
      end_name: typeof end_name === 'string' ? end_name : '',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
