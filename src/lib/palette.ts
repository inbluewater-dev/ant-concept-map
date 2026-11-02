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

export const RELATION_STYLE: Record<RelationKind, { color: string; dash?: string }> = {
  '협력·지원': { color: '#2563eb' },
  '정보·자료 흐름': { color: '#16a34a' },
  '요청·활용': { color: '#64748b' },
  '제약·조정': { color: '#d97706', dash: '2 4' },
  '갈등·모순': { color: '#dc2626', dash: '7 5' },
};
