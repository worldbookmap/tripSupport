import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('books')
    .select('*, book_authors(author:authors(*)), locations(id, name, country, city)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normalized = (data ?? []).map((book) => {
    const { book_authors, locations: location, ...rest } = book as typeof book & {
      book_authors: { author: unknown }[];
      locations: { id: string; name: string; country: string; city: string } | null;
    };
    return { ...rest, authors: book_authors.map((ba: { author: unknown }) => ba.author), location };
  });

  return NextResponse.json(normalized);
}
