import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

async function findOrCreateAuthorId(name: string): Promise<string> {
  const trimmed = name.trim();
  const { data: existing } = await supabase.from('authors').select('id').eq('name', trimmed).maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase.from('authors').insert({ name: trimmed }).select('id').single();
  if (error) throw new Error(error.message);
  return created.id;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: locationId } = await params;
  const body = await request.json().catch(() => null);
  const { googleBooksId, title, authors, thumbnailUrl, description } = body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title은 필수입니다.' }, { status: 400 });
  }

  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({
      google_books_id: googleBooksId ?? null,
      title,
      thumbnail_url: thumbnailUrl ?? null,
      description: description ?? '',
      location_id: locationId,
    })
    .select()
    .single();

  if (bookError) return NextResponse.json({ error: bookError.message }, { status: 500 });

  const authorNames: string[] = Array.isArray(authors) ? authors.filter((a) => typeof a === 'string') : [];
  try {
    const authorIds = await Promise.all(authorNames.map(findOrCreateAuthorId));
    if (authorIds.length > 0) {
      const { error: linkError } = await supabase
        .from('book_authors')
        .insert(authorIds.map((authorId) => ({ book_id: book.id, author_id: authorId })));
      if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json(book, { status: 201 });
}
