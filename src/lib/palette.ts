// 개념도 색 — 수업 자료 그림의 범례를 따른다(파랑=협력·지원, 초록=정보·자료 흐름, 빨강 점선=갈등·모순)
import type { ActorType, RelationKind } from './schema';

export const TYPE_COLOR: Record<ActorType, string> = {
  인간: '#2563eb',
  '조직·기관': '#7c3aed',
  '자료·도구': '#059669',
  '기술·시스템': '#0891b2',
  '제도·규범': '#d97706',
  '물리 환경': '#78716c',
  기타: '#64748b',
};

export interface LineStyle {
  color: string;
  dash?: string;
}
export const RELATION_STYLE: Record<string, LineStyle> = {
  '협력·지원': { color: '#2563eb' },
  '정보·자료 흐름': { color: '#16a34a' },
  '요청·활용': { color: '#64748b' },
  '제약·조정': { color: '#d97706', dash: '2 4' },
  '갈등·모순': { color: '#dc2626', dash: '7 5' },
};

/** 연구자가 새로 만든 관계 종류의 색 — 기본 다섯 색과 겹치지 않게 고르고, 색만으로 구분하지 않도록 선 모양도 바꾼다 */
const EXTRA: LineStyle[] = [
  { color: '#7c3aed' },
  { color: '#0891b2', dash: '6 3' },
  { color: '#db2777' },
  { color: '#65a30d', dash: '6 3' },
  { color: '#92400e' },
  { color: '#4f46e5', dash: '2 3' },
  { color: '#0f766e' },
  { color: '#a21caf', dash: '6 3' },
  { color: '#475569', dash: '2 3' },
  { color: '#b45309' },
];
const CONFLICT = /갈등|모순|대립|충돌|저항|긴장/;

/** 관계 종류의 선 모양. order = 이 분석에서 쓰는 종류 목록(색이 그림마다 바뀌지 않게) */
export function relationStyle(kind: RelationKind, order: readonly string[]): LineStyle {
  if (RELATION_STYLE[kind]) return RELATION_STYLE[kind];
  if (CONFLICT.test(kind)) return { color: '#dc2626', dash: '7 5' };
  const custom = order.filter((k) => !RELATION_STYLE[k] && !CONFLICT.test(k));
  const i = Math.max(0, custom.indexOf(kind));
  return EXTRA[i % EXTRA.length];
}

/** 이 분석에서 쓰는 관계 종류: 연구자가 정한 목록 순서, 그다음 목록에 없지만 결과에 나온 것 */
export function kindOrder(relations: { kind: string }[], defined?: readonly string[]): string[] {
  const out = [...(defined ?? [])];
  for (const r of relations) if (!out.includes(r.kind)) out.push(r.kind);
  return out;
}
