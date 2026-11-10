// 이 브라우저에만 남는 최근 분석 기록 (최대 10개)
import type { InterviewDoc } from './prompt';
import { AntAnalysis, type Change, type RelationKindDef } from './schema';

export interface SavedRun {
  id: string;
  createdAt: string;
  sourceName: string;
  source: string;
  focus: string;
  model: string;
  analysis: AntAnalysis;
  /** 이 분석에 쓴 관계 종류(없으면 기본 다섯) */
  relationKinds?: RelationKindDef[];
  /** 2차 이상 분석일 때: 몇 차인지, 바탕이 된 앞 분석, 더한 인터뷰, AI가 정리한 변화 */
  stage?: number;
  parentId?: string;
  prevAnalysis?: AntAnalysis;
  interviews?: InterviewDoc[];
  changes?: Change[];
}

const KEY = 'ant-concept-map:history:v1';

export function loadHistory(): SavedRun[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedRun[];
    return arr.filter((r) => AntAnalysis.safeParse(r.analysis).success);
  } catch {
    return [];
  }
}

export function saveRun(run: SavedRun): SavedRun[] {
  const next = [run, ...loadHistory().filter((r) => r.id !== run.id)].slice(0, 10);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장 공간이 부족하면 원문을 빼고 다시 시도
    try {
      localStorage.setItem(KEY, JSON.stringify(next.map((r, i) => (i === 0 ? r : { ...r, source: '', interviews: r.interviews?.map((d) => ({ ...d, text: '' })) }))));
    } catch {
      /* 저장하지 못해도 화면은 그대로 쓴다 */
    }
  }
  return loadHistory();
}

export function removeRun(id: string): SavedRun[] {
  const next = loadHistory().filter((r) => r.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 무시 */
  }
  return next;
}

const KINDS_KEY = 'ant-concept-map:relationKinds';

/** 연구자가 마지막으로 정한 관계 종류(이 브라우저에만) */
export function loadKinds(): RelationKindDef[] | null {
  try {
    const raw = localStorage.getItem(KINDS_KEY);
    if (!raw) return null;
    const xs = JSON.parse(raw) as RelationKindDef[];
    return Array.isArray(xs) && xs.every((k) => typeof k?.name === 'string') ? xs.map((k) => ({ name: k.name, description: String(k.description ?? '') })) : null;
  } catch {
    return null;
  }
}
export function saveKinds(kinds: RelationKindDef[] | null): void {
  try {
    if (kinds) localStorage.setItem(KINDS_KEY, JSON.stringify(kinds));
    else localStorage.removeItem(KINDS_KEY);
  } catch {
    /* 저장이 막혀도 이번 화면에서는 그대로 쓴다 */
  }
}
