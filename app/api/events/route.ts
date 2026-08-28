import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitizeSearchTerm } from '@/lib/search';

export async function GET(request: NextRequest) {
  const locationId = request.nextUrl.searchParams.get('locationId');
  const q = request.nextUrl.searchParams.get('q')?.trim();

  let query = supabase.from('historical_events').select('*').order('year', { ascending: true });
  if (locationId) query = query.eq('location_id', locationId);
  if (q) {
    const term = sanitizeSearchTerm(q);
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { year, title, description, location_id } = body ?? {};

  if (typeof year !== 'number' || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'year, title은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('historical_events')
    .insert({ year, title, description: description ?? '', location_id: location_id ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
