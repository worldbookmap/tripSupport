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

// 카테고리별로 서로 다른 글리프를 담은 핀 모양 SVG 아이콘을 데이터 URL로 생성합니다.
// (lucide의 UtensilsCrossed/Coffee/Star 아이콘과 동일한 path를 사용해 앱 전체 아이콘과 일관성을 유지합니다.)
const UTENSILS_CROSSED_PATHS = [
  'm16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8',
  'M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7',
  'm2.1 21.8 6.4-6.3',
  'm19 5-7 7',
];
const COFFEE_PATHS = [
  'M10 2v2',
  'M14 2v2',
  'M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1',
  'M6 2v2',
];
const STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z';

function strokeGlyph(color: string, paths: string[]): string {
  return paths
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
    )
    .join('');
}

function fillGlyph(color: string, d: string): string {
  return `<path d="${d}" fill="${color}"/>`;
}

// 핀 본체(말풍선 모양, viewBox 32x40)는 카테고리 색으로 채우고, 꼭짓점이 정확히 좌표를 가리키도록
// svg width/height를 명시해 기본 마커 앵커(이미지 하단 중앙)와 맞춥니다. 글리프는 머리 부분 원 안에 배치합니다.
function buildPinIcon(color: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
<path d="M16 40C16 40 2 22.2 2 14C2 6.268 8.268 0 16 0C23.732 0 30 6.268 30 14C30 22.2 16 40 16 40Z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
<circle cx="16" cy="14" r="9" fill="#ffffff"/>
<g transform="translate(9.5 7.5) scale(0.5417)">${glyph}</g>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const CATEGORY_MARKER_ICON: Record<Category, string> = {
  general: buildPinIcon(CATEGORY_COLORS.general.dot, fillGlyph(CATEGORY_COLORS.general.dot, STAR_PATH)),
  food: buildPinIcon(CATEGORY_COLORS.food.dot, strokeGlyph(CATEGORY_COLORS.food.dot, UTENSILS_CROSSED_PATHS)),
  cafe: buildPinIcon(CATEGORY_COLORS.cafe.dot, strokeGlyph(CATEGORY_COLORS.cafe.dot, COFFEE_PATHS)),
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
