import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { MindmapEdge, MindmapNode } from '@/lib/types';

export async function GET() {
  const [
    { data: locations, error: locErr },
    { data: books, error: bookErr },
    { data: events, error: evErr },
    { data: bookAuthors, error: baErr },
    { data: authors, error: authErr },
  ] = await Promise.all([
    supabase.from('locations').select('id, name, country, city'),
    supabase.from('books').select('id, title, location_id'),
    supabase.from('historical_events').select('id, year, title, description, location_id'),
    supabase.from('book_authors').select('book_id, author_id'),
    supabase.from('authors').select('id, name'),
  ]);

  const error = locErr || bookErr || evErr || baErr || authErr;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const countryId = (country: string) => `country:${country}`;
  const cityId = (country: string, city: string) => `city:${country}::${city}`;

  const countries = new Map<string, string>();
  const cities = new Map<string, { country: string; city: string }>();
  for (const l of locations ?? []) {
    if (l.country) countries.set(countryId(l.country), l.country);
    if (l.country && l.city) cities.set(cityId(l.country, l.city), { country: l.country, city: l.city });
  }

  const nodes: MindmapNode[] = [
    ...Array.from(countries, ([id, label]) => ({ id, type: 'country' as const, label })),
    ...Array.from(cities, ([id, { city }]) => ({ id, type: 'city' as const, label: city })),
    ...(locations ?? []).map((l) => ({ id: `location:${l.id}`, type: 'location' as const, label: l.name })),
    ...(books ?? []).map((b) => ({ id: `book:${b.id}`, type: 'book' as const, label: b.title })),
    ...(events ?? []).map((e) => ({
      id: `event:${e.id}`,
      type: 'event' as const,
      label: `${e.year} · ${e.title}`,
    })),
    ...(authors ?? []).map((a) => ({ id: `author:${a.id}`, type: 'author' as const, label: a.name })),
  ];

  const edges: MindmapEdge[] = [
    ...Array.from(cities.values()).map(({ country, city }) => ({
      id: `country-city:${country}::${city}`,
      source: countryId(country),
      target: cityId(country, city),
    })),
    ...(locations ?? [])
      .filter((l) => l.country && l.city)
      .map((l) => ({
        id: `city-loc:${l.id}`,
        source: cityId(l.country, l.city),
        target: `location:${l.id}`,
      })),
    ...(books ?? [])
      .filter((b) => b.location_id)
      .map((b) => ({ id: `loc-book:${b.id}`, source: `location:${b.location_id}`, target: `book:${b.id}` })),
    ...(events ?? [])
      .filter((e) => e.location_id)
      .map((e) => ({ id: `loc-event:${e.id}`, source: `location:${e.location_id}`, target: `event:${e.id}` })),
    ...(bookAuthors ?? []).map((ba) => ({
      id: `author-book:${ba.book_id}:${ba.author_id}`,
      source: `author:${ba.author_id}`,
      target: `book:${ba.book_id}`,
    })),
  ];

  return NextResponse.json({ nodes, edges });
}
