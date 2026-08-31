import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const [{ data: location, error: locationError }, { data: books, error: booksError }] = await Promise.all([
    supabase.from('locations').select('*').eq('id', id).single(),
    supabase.from('books').select('*, book_authors(author:authors(*))').eq('location_id', id),
  ]);

  if (locationError) return NextResponse.json({ error: locationError.message }, { status: 404 });
  if (booksError) return NextResponse.json({ error: booksError.message }, { status: 500 });

  const normalizedBooks = (books ?? []).map((book) => {
    const { book_authors, ...rest } = book as typeof book & {
      book_authors: { author: unknown }[];
    };
    return { ...rest, authors: book_authors.map((ba: { author: unknown }) => ba.author) };
  });

  return NextResponse.json({ ...location, books: normalizedBooks });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  for (const key of ['name', 'lat', 'lng', 'history', 'tourist_info', 'region', 'country', 'city'] as const) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('locations').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
