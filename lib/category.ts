export const CATEGORIES = ['general', 'food'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  general: '일반',
  food: '음식',
};

export const CATEGORY_COLORS: Record<Category, { text: string; bg: string; border: string; dot: string }> = {
  general: { text: '#fca5a5', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.28)', dot: '#ef4444' },
  food: { text: '#fdba74', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.28)', dot: '#f97316' },
};

// 지도 마커 아이콘: 일반은 기본(빨간) 핀을 그대로 쓰고, 음식만 눈에 띄게 다른 색으로 구분합니다.
export const CATEGORY_MARKER_ICON: Record<Category, string | undefined> = {
  general: undefined,
  food: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
};

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
