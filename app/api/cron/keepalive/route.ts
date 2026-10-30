import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

// Vercel Cron이 하루 한 번 호출 (vercel.json). Supabase 무료 플랜이 7일간
// 활동이 없으면 일시 중지되므로 가벼운 DB 조회로 활동 상태를 유지한다.
// Vercel은 CRON_SECRET 환경변수가 있으면 Authorization: Bearer <값> 헤더를 붙여 보낸다.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { error } = await supabase.from('locations').select('id').limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
}
