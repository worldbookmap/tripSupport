import { supabase } from './supabase';
import type { Visit } from './types';

export const VISIT_PHOTO_BUCKET = 'visit-photos';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type VisitRow = Omit<Visit, 'photos'> & { photos: string[] };

// DB에는 Storage 경로만 저장되어 있으므로, 응답 직전에 비공개 버킷의 서명된 URL을 붙인다.
export async function withSignedUrls(rows: VisitRow[]): Promise<Visit[]> {
  const paths = rows.flatMap((row) => row.photos ?? []);
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data, error } = await supabase.storage.from(VISIT_PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (error) throw new Error(error.message);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
    }
  }
  return rows.map((row) => ({
    ...row,
    photos: (row.photos ?? []).filter((path) => urlByPath.has(path)).map((path) => ({ path, url: urlByPath.get(path)! })),
  }));
}

export async function removeVisitPhotos(paths: string[]) {
  if (paths.length === 0) return;
  await supabase.storage.from(VISIT_PHOTO_BUCKET).remove(paths);
}
