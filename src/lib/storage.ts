// 이 브라우저에만 남는 최근 분석 기록 (최대 10개)
import { AntAnalysis } from './schema';

export interface SavedRun {
  id: string;
  createdAt: string;
  sourceName: string;
  source: string;
  focus: string;
  model: string;
  analysis: AntAnalysis;
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
      localStorage.setItem(KEY, JSON.stringify(next.map((r, i) => (i === 0 ? r : { ...r, source: '' }))));
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
