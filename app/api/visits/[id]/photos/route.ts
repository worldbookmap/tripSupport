import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { VISIT_PHOTO_BUCKET, removeVisitPhotos } from '@/lib/visits';

type Params = { params: Promise<{ id: string }> };

// 클라이언트에서 리사이즈한 사진을 한 장씩 받는다 (Vercel 요청 본문 4.5MB 제한).
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function getPhotoPaths(visitId: string) {
  const { data, error } = await supabase.from('visits').select('photos').eq('id', visitId).single();
  if (error) return null;
  return (data.photos as string[]) ?? [];
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: '사진 파일이 필요합니다.' }, { status: 400 });

  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) return NextResponse.json({ error: '지원하지 않는 이미지 형식입니다.' }, { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: '사진 용량이 너무 큽니다.' }, { status: 413 });

  const photos = await getPhotoPaths(id);
  if (!photos) return NextResponse.json({ error: '방문 기록을 찾을 수 없습니다.' }, { status: 404 });

  const path = `${id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(VISIT_PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error } = await supabase
    .from('visits')
    .update({ photos: [...photos, path], updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    await removeVisitPhotos([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const path = request.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path가 필요합니다.' }, { status: 400 });

  const photos = await getPhotoPaths(id);
  if (!photos) return NextResponse.json({ error: '방문 기록을 찾을 수 없습니다.' }, { status: 404 });
  if (!photos.includes(path)) return NextResponse.json({ error: '사진을 찾을 수 없습니다.' }, { status: 404 });

  const { error } = await supabase
    .from('visits')
    .update({ photos: photos.filter((p) => p !== path), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await removeVisitPhotos([path]);
  return NextResponse.json({ ok: true });
}
