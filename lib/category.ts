export const CATEGORIES = ['general', 'food', 'cafe'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  general: '일반',
  food: '음식',
  cafe: '카페',
};

export const CATEGORY_COLORS: Record<Category, { text: string; bg: string; border: string; dot: string }> = {
  general: { text: '#fca5a5', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.28)', dot: '#ef4444' },
  food: { text: '#fdba74', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.28)', dot: '#f97316' },
  cafe: { text: '#d8b4fe', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.28)', dot: '#a855f7' },
};

// 지도 마커 아이콘: 일반은 기본(빨간) 핀을 그대로 쓰고, 음식/카페는 눈에 띄게 다른 색으로 구분합니다.
export const CATEGORY_MARKER_ICON: Record<Category, string | undefined> = {
  general: undefined,
  food: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
  cafe: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png',
};

// 음식/카페는 맛집·카페 목록 성격이라 "역사" 항목이 필요 없어 폼/상세에서 숨깁니다.
export const CATEGORY_HAS_HISTORY: Record<Category, boolean> = {
  general: true,
  food: false,
  cafe: false,
};

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
