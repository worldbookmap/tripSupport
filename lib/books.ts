import type { Author } from './types';

type BookWithAuthorsRow = { book_authors: { author: Author }[] };

export function normalizeBookAuthors<T extends BookWithAuthorsRow>(book: T) {
  const { book_authors, ...rest } = book;
  return { ...rest, authors: book_authors.map((ba) => ba.author) };
}
