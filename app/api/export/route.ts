import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizeBookAuthors } from '@/lib/books';
import type { Author, Book } from '@/lib/types';

type BookRow = Book & { book_authors: { author: Author }[] };

export async function GET() {
  const [locationsRes, routesRes, booksRes, authorsRes, eventsRes] = await Promise.all([
    supabase.from('locations').select('*').order('created_at', { ascending: false }),
    supabase.from('routes').select('*').order('created_at', { ascending: false }),
    supabase.from('books').select('*, book_authors(author:authors(*))').order('created_at', { ascending: false }),
    supabase.from('authors').select('*').order('name', { ascending: true }),
    supabase.from('historical_events').select('*').order('year', { ascending: true }),
  ]);

  const error =
    locationsRes.error?.message ??
    routesRes.error?.message ??
    booksRes.error?.message ??
    authorsRes.error?.message ??
    eventsRes.error?.message;
  if (error) return NextResponse.json({ error }, { status: 500 });

  const books = ((booksRes.data ?? []) as BookRow[]).map((book) => normalizeBookAuthors(book));

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    locations: locationsRes.data,
    routes: routesRes.data,
    books,
    authors: authorsRes.data,
    historical_events: eventsRes.data,
  });
}
