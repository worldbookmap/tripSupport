import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitizeSearchTerm } from '@/lib/search';
import { guessRegion, REGIONS } from '@/lib/regions';
import { isCategory } from '@/lib/category';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();

  let query = supabase.from('locations').select('*').order('created_at', { ascending: false });
  if (q) {
    const term = sanitizeSearchTerm(q);
    query = query.or(`name.ilike.%${term}%,history.ilike.%${term}%,tourist_info.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { name, lat, lng, history, tourist_info, region, category, country, city, district } = body ?? {};

  if (typeof name !== 'string' || !name.trim() || typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'name, lat, lng는 필수입니다.' }, { status: 400 });
  }

  const resolvedRegion = REGIONS.includes(region) ? region : guessRegion(lat, lng);
  const resolvedCategory = isCategory(category) ? category : 'general';

  const { data, error } = await supabase
    .from('locations')
    .insert({
      name,
      lat,
      lng,
      history: history ?? '',
      tourist_info: tourist_info ?? '',
      region: resolvedRegion,
      category: resolvedCategory,
      country: typeof country === 'string' ? country : '',
      city: typeof city === 'string' ? city : '',
      district: typeof district === 'string' ? district : '',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
