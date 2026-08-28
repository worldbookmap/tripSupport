export const REGIONS = ['유럽', '중동', '아시아', '북미', '남미', '기타'] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_COLORS: Record<Region, { text: string; bg: string; border: string; dot: string }> = {
  유럽: { text: '#93c5fd', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.28)', dot: '#60a5fa' },
  중동: { text: '#fdba74', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.28)', dot: '#fb923c' },
  아시아: { text: '#fca5a5', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.28)', dot: '#fb7185' },
  북미: { text: '#c4b5fd', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.28)', dot: '#a78bfa' },
  남미: { text: '#6ee7b7', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.28)', dot: '#34d399' },
  기타: { text: '#d4d4d8', bg: 'rgba(161,161,170,0.08)', border: 'rgba(161,161,170,0.28)', dot: '#a1a1aa' },
};

// Rough bounding-box heuristic used only to pre-fill a sensible default;
// the region is always a plain editable field so precision doesn't matter.
export function guessRegion(lat: number, lng: number): Region {
  if (lat >= 12 && lat <= 42 && lng >= 25 && lng <= 63) return '중동';
  if (lat >= 34 && lat <= 72 && lng >= -25 && lng <= 40) return '유럽';
  if (lat >= 15 && lat <= 72 && lng >= -170 && lng <= -50) return '북미';
  if (lat >= -56 && lat <= 13 && lng >= -82 && lng <= -34) return '남미';
  if (lat >= -10 && lat <= 55 && lng >= 40 && lng <= 150) return '아시아';
  return '기타';
}
