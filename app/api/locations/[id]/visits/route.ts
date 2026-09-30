import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withSignedUrls, type VisitRow } from '@/lib/visits';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id: locationId } = await params;
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('location_id', locationId)
    .order('visited_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    return NextResponse.json(await withSignedUrls((data ?? []) as VisitRow[]));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: locationId } = await params;
  const body = await request.json().catch(() => null);
  const { visitedOn, memo } = body ?? {};

  const { data, error } = await supabase
    .from('visits')
    .insert({
      location_id: locationId,
      visited_on: typeof visitedOn === 'string' && visitedOn ? visitedOn : null,
      memo: typeof memo === 'string' ? memo : '',
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ...data, photos: [] }, { status: 201 });
}
