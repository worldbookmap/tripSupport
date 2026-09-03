import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizeBookAuthors } from '@/lib/books';

export async function GET() {
  const { data, error } = await supabase
    .from('books')
    .select('*, book_authors(author:authors(*)), locations(id, name, country, city)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normalized = (data ?? []).map((book) => {
    const { locations: location, ...rest } = book as typeof book & {
      locations: { id: string; name: string; country: string; city: string } | null;
    };
    return { ...normalizeBookAuthors(rest), location };
  });

  return NextResponse.json(normalized);
}
