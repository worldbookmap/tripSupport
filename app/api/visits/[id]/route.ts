import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { removeVisitPhotos } from '@/lib/visits';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('visitedOn' in body) updates.visited_on = typeof body.visitedOn === 'string' && body.visitedOn ? body.visitedOn : null;
  if ('memo' in body) updates.memo = typeof body.memo === 'string' ? body.memo : '';

  const { data, error } = await supabase.from('visits').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { data: visit } = await supabase.from('visits').select('photos').eq('id', id).maybeSingle();

  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await removeVisitPhotos((visit?.photos as string[] | undefined) ?? []);
  return NextResponse.json({ ok: true });
}
