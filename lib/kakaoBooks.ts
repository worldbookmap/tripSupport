export interface BookSearchResult {
  sourceId: string;
  title: string;
  authors: string[];
  thumbnailUrl: string | null;
  description: string;
}

interface KakaoBookDocument {
  title?: string;
  contents?: string;
  authors?: string[];
  thumbnail?: string;
  isbn?: string;
}

export async function searchKakaoBooks(query: string): Promise<BookSearchResult[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    throw new Error('KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const params = new URLSearchParams({ query, size: '10' });
  const res = await fetch(`https://dapi.kakao.com/v3/search/book?${params.toString()}`, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`카카오 도서 API 요청에 실패했습니다 (${res.status}).`);
  }

  const data: { documents?: KakaoBookDocument[] } = await res.json();
  return (data.documents ?? []).map((doc) => ({
    sourceId: doc.isbn?.trim() || `${doc.title ?? ''}-${doc.authors?.join(',') ?? ''}`,
    title: doc.title ?? '제목 없음',
    authors: doc.authors ?? [],
    thumbnailUrl: doc.thumbnail || null,
    description: doc.contents ?? '',
  }));
}
