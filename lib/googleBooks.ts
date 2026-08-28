export interface GoogleBookResult {
  googleBooksId: string;
  title: string;
  authors: string[];
  thumbnailUrl: string | null;
  description: string;
}

interface GoogleVolumeItem {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string };
  };
}

export async function searchGoogleBooks(query: string): Promise<GoogleBookResult[]> {
  const params = new URLSearchParams({ q: query, maxResults: '10' });
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.set('key', process.env.GOOGLE_BOOKS_API_KEY);
  }

  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Google Books API 요청에 실패했습니다 (${res.status}).`);
  }

  const data: { items?: GoogleVolumeItem[] } = await res.json();
  return (data.items ?? []).map((item) => ({
    googleBooksId: item.id,
    title: item.volumeInfo?.title ?? '제목 없음',
    authors: item.volumeInfo?.authors ?? [],
    thumbnailUrl: item.volumeInfo?.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null,
    description: item.volumeInfo?.description ?? '',
  }));
}
